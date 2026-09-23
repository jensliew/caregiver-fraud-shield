# Design (Advanced) — Simplified Silver Assist & Multi-Agent Scam Guard Engine

See `spec-advanced.md` for overview and `requirements-advanced.md` for the full requirement list. This supersedes `design.md` with detail recovered from the `.pages` discussion draft — named tools, the human-review layer, and deck-production design. Nothing from `design.md` is removed — this is additive.

## 1. UX Design

### 1.1 Screens

**Silver Mode – Home**
- 4 large tiles: Account Balance, Add Money, Pay Someone, Get Help
- Each tile has a distinct color-coded icon (redundant identification beyond color alone)
- Minimal navigation depth — every core task reachable in one tap from home

**Pay Someone**
- Simple payee + amount input
- New payee and unusually large amount are auto-detected from what's typed (no manual flagging needed by the user)

**Scam Guard Alert (triggered flow)**
- Warning banner explaining, in plain language and the customer's preferred language, why the transfer was paused
- Face-scan verification card (or visual puzzle-match as an alternative)
- Caregiver-notified banner confirming a 1-click approval request was sent

**Confirmation / Outcome screens**
- Final state shown to the senior regardless of outcome (approved, blocked, or timed out)

**Fraud-Ops Review Console (new, internal-facing)**
- Not shown to the senior or caregiver — a simple queue view for the bank's fraud team showing escalated/ambiguous flags, the triggering signals, and an approve/block action
- Exists so the pitch can honestly say a human reviews anything the automated layer can't resolve cleanly, rather than presenting the system as fully autonomous

### 1.2 Visual Style
- **Font:** Atkinson Hyperlegible (Google Font, purpose-built for low-vision legibility)
- **Palette:** OCBC-style red accent; high-contrast dark text on warm off-white background
- **Icons:** color-coded per tile, redundant with labels/shape so color-blind users aren't dependent on hue alone

### 1.3 Design Mockup Reference
Built as a Claude Design canvas (published as an Artifact) with two artboards:
1. Silver Mode – Home
2. Silver Mode – Scam Guard Alert

### 1.4 "See it in Action" Slide Production **(new)**
The pitch template requires this slide to *show*, not just describe, the solution working — either:
- A short recorded demo video of the working prototype (recommended, per the discussion draft — removes live-demo risk from webcam/lighting/network conditions), or
- 2–3 key screenshots capturing the pause → challenge → caregiver-notify flow in sequence

Recording is preferred over a live demo specifically to de-risk the face-api.js webcam step, which depends on network/lighting conditions outside the team's control at presentation time (see Section 2.9, Testing Notes).

## 2. System / Technical Design

### 2.1 Component Overview

| Component | Role |
|---|---|
| Silver Mode frontend | 4-tile UI, Pay Someone form, alert/challenge/confirmation screens |
| Fraud rules engine (`fraudCheck.js`) | Evaluates a transaction's signals and returns a flagged/not-flagged decision with reasons |
| Response/action layer (`transferFlow.js`) | Takes the fraud engine's result and drives what happens next (pause, warn, challenge, notify, log) |
| Face detection module (face-api.js, browser webcam) | Stand-in biometric challenge for the hackathon demo |
| Caregiver notification (simulated) | 1-click approval request delivery |
| Incident log (simulated) | Records triggering signals, timestamp, device info for the fraud team |
| "Get Help" link-checker | Accepts a pasted/forwarded link or message, checks against known scam patterns, returns a plain-language verdict |
| **Fraud-Ops Review Console (new, simulated)** | Internal queue for human-in-the-loop review of escalated/ambiguous flags |

### 2.2 Fraud Detection Logic Design

Two-tier rule structure, implemented in `fraudCheck.js`:

1. **Auto-flag rules** — trigger a pause on their own, regardless of anything else:
   - Remote-access/screen-sharing app active during the session — named examples: **AnyDesk, TeamViewer**
   - Destination account already flagged as high-risk
   - **(new)** Application installed from outside the official app store (sideloaded APK) detected on the device

2. **Soft-signal scoring** — no single signal proves fraud alone; a pause triggers only once **2 or more** soft signals are present simultaneously:
   - New, unverified payee
   - Unusual hour for this customer (illustrative example from the discussion draft: a **3am** transfer attempt, well outside a ~9am–9/11pm normal-activity window; the exact window should be configurable per customer, not hardcoded)
   - Amount unusually large vs. typical history
   - Multiple rapid repeated attempts
   - **(new)** Multiple failed OTP/2FA attempts (tracked separately from repeated transfer attempts)
   - Sudden request to raise transfer limit
   - Newly added overseas account

This combination-of-signals approach is deliberately more defensible to judges than claiming any one signal alone proves fraud.

```javascript
// Core shape of the decision function (see fraudCheck.js for full implementation)
function checkTransactionRisk(signals) {
  // 1. Auto-flag rules short-circuit to { flagged: true, reasons }
  //    includes: remote-access tool detected (AnyDesk/TeamViewer), sideloaded app detected
  // 2. Otherwise, collect soft signals present
  //    includes: unusual hour (customer-specific window), repeated OTP failures
  // 3. If soft signal count >= SOFT_SIGNAL_THRESHOLD (2), flag with those reasons
  // 4. Otherwise, return { flagged: false, reasons: [] }
}
```

### 2.3 Response Flow Design

Implemented in `transferFlow.js`, called with the fraud engine's result:

- **Not flagged:** transaction completes normally.
- **Flagged**, in order:
  1. Pause the transfer before funds move
  2. Show the senior a plain-language warning screen listing the triggering reasons
  3. Require a biometric/visual challenge before the transfer can proceed
  4. In parallel, notify the linked caregiver with a 1-click approval request and the flagged reasons
  5. Log the incident (signals, timestamp, device info) for the fraud team
  6. **(new)** If the challenge fails, times out, or the signal combination is ambiguous, escalate to the Fraud-Ops Review Console for human decision, rather than auto-resolving one way or the other

Each action in the current build is a stand-in (`console.log`) for a real function (render a screen, send a push notification, write to a database) — this is intentional scaffolding, meant to be wired into real UI/backend calls later.

### 2.4 Realistic 3-Layer Detection Approach (why WhatsApp scanning is out)

1. **Pre-emptive layer:** sender-reputation / known-scam-pattern detection for SMS and calls, similar to ScamShield — filtering suspicious messages to a junk folder via an automated algorithm plus user reporting, exactly as ScamShield already does today for SMS/calls.
2. **Behavioral/transaction-side layer (the real differentiator):** since encrypted-channel content (WhatsApp/Telegram) cannot be scanned by any outside app — messages there are end-to-end encrypted, a hard technical limitation, not a design choice — the agent instead watches the *banking side* after a link is tapped: new payee, unusual hour, remote-access app detected (AnyDesk/TeamViewer), sideloaded app detected, sudden limit/mobile-number-change requests, repeated OTP failures. This catches the scam regardless of which channel delivered it.
3. **User-initiated check:** the "Get Help" tile lets the senior or caregiver paste/forward a suspicious link or message for a plain-language check against known scam patterns.

**(new) Layer 4 — human-in-the-loop:** anything the first three layers can't resolve with confidence (challenge failure, ambiguous signal mix) goes to a human fraud analyst, not an automatic hard block. The discussion draft is explicit that framing this as human-in-the-loop, rather than a fully autonomous AI decision, is both more honest and a stronger answer to a judge's "what if the AI gets it wrong" question.

### 2.5 Biometric Verification Design

- Demo scope: browser webcam capture (`getUserMedia`) + face-api.js (client-side, loaded from CDN) checking for a live face.
- Includes a "Simulate Verified" fallback button if the camera or model fails to load, so the demo never dead-ends.
- Framing for production: this simulates the verification step; in production it would integrate with **Singpass Face Verification (SFV)**, which MAS announced major Singapore retail banks are already rolling out (2024) specifically to replace phishable SMS OTPs for high-risk actions.

### 2.6 Tech Stack

- **Fraud logic:** JavaScript rules engine (`fraudCheck.js`, `transferFlow.js`) — chosen over a trained ML model as the realistic, buildable, and honestly-explainable option for hackathon timeframes.
- **Demo frontend:** Single self-contained HTML file (`silver-mode-demo.html`) — home screen, Pay Someone form with a "demo controls" panel to simulate signals that can't be faked in a browser (remote-access active, rapid attempts, limit-increase request, new overseas account, known high-risk recipient, sideloaded-app flag).
- **Face detection:** face-api.js via CDN, real webcam feed, live detection (not a scripted timer).
- **Suggested full-build stack** (for the Architecture & Tech Stack appendix slide): React front end, Python/FastAPI backend, an LLM API for "Get Help" link-checking and for generating the plain-language explanation text shown to the senior.

### 2.7 Integration Points (future / production)

- OCBC core banking + Great Eastern e-Connect (transaction and account data)
- Singpass Face Verification (biometric challenge, replacing the demo's face-api.js stand-in)
- Existing Digital Silvers Programme senior outreach (adoption channel)
- Fraud-ops case-management system (for the human-in-the-loop review queue)

### 2.8 Design Constraints

- Must fail closed (block) on any uncertain/failed verification, never fail open.
- Must not represent WhatsApp/Telegram content scanning as a capability.
- Caregiver linking requires the account holder's own explicit approval — the caregiver cannot self-initiate the link.
- Named remote-access tools (AnyDesk, TeamViewer) and sideloaded-app detection are treated as auto-flag, not soft-signal — the discussion draft calls these out as close to unambiguous fraud indicators for this user segment.

### 2.9 Testing Notes

- `silver-mode-demo.html` was tested end-to-end via an automated Playwright browser session: new payee + large amount + unusual hour correctly triggers the pause screen with matching reasons; a known payee with a normal amount goes through immediately. Caregiver notification, confirmation screens, and the face-detection fallback button were also verified.
- The face-api.js CDN load itself could not be verified from that testing session's network — recommended to test that one step with normal internet access before relying on it in a live demo, and to record the demo video in advance as a fallback (see Section 1.4).
