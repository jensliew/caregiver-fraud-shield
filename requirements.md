# Requirements (Advanced) — Simplified Silver Assist & Multi-Agent Scam Guard Engine

See `spec-advanced.md` for the project overview. This supersedes `requirements.md` by adding requirements surfaced in the `.pages` discussion draft (named remote-access tools, authentication-failure signals, malicious-app detection, human review, and deck-production requirements). Nothing from `requirements.md` is removed — this is additive; new/changed items are marked **(new)**.

## 1. Functional Requirements

### 1.1 Silver Mode Portal (UI)
- FR1.1 The system shall present a home screen with exactly 4 large, high-contrast visual tiles: Account Balance, Add Money, Pay Someone, Get Help.
- FR1.2 Each tile shall use a distinct color-coded icon for redundant visual identification (not color alone).
- FR1.3 Text shall use a large, low-vision-legible font throughout (e.g. Atkinson Hyperlegible).
- FR1.4 The Pay Someone flow shall accept a payee and amount, and shall auto-detect whether the payee is new and whether the amount is unusually large relative to the customer's history.
- FR1.5 The interface shall support English, Malay, and Mandarin for all customer-facing warnings and prompts.

### 1.2 Fraud & Malware Guard Agent
- FR2.1 The system shall evaluate every transaction/action attempt against a defined set of risk signals (see Section 3) before allowing it to complete.
- FR2.2 The system shall support "auto-flag" signals that pause a transaction on their own (e.g. remote-access app active, known high-risk recipient), independent of any scoring threshold.
- FR2.3 The system shall support "soft" signals that only trigger a pause when at least 2 are present simultaneously (combination-of-signals scoring, not single-flag fraud claims).
- FR2.4 On flagging, the system shall record which specific signals triggered the pause, for both the user-facing explanation and the fraud team's log.
- FR2.5 **(new)** The system shall recognize named remote-access/screen-sharing applications explicitly called out in the discussion draft — at minimum **AnyDesk** and **TeamViewer** — as auto-flag triggers, rather than relying only on a generic "remote access active" category.
- FR2.6 **(new)** The system shall flag installation or presence of an application installed outside the official app store (sideloaded APK on Android), as this is a named vector in the discussion draft for delivering malware or fake banking apps.

### 1.3 Smart Friction & Biometric Challenge
- FR3.1 When a transaction is flagged, the system shall block completion until the customer passes a challenge.
- FR3.2 The challenge shall be either a facial verification check or a visual puzzle-match — not an SMS OTP.
- FR3.3 The system shall display a plain-language explanation of why the transaction was paused, in the customer's preferred language, before or alongside the challenge.
- FR3.4 If the challenge fails or times out, the system shall default to blocking the transaction (fail closed, not fail open).
- FR3.5 On failure/timeout, the system shall offer a direct path to a live human/support line via the "Get Help" tile.

### 1.4 Caregiver Co-Pilot Sync
- FR4.1 The account holder shall be able to link a trusted caregiver, with the account holder's own explicit approval (not the caregiver's request alone).
- FR4.2 High-risk changes (transfer limit increase, registered mobile number change, large payments) shall trigger a real-time 1-click approval request to the linked caregiver.
- FR4.3 Remote-access/screen-sharing detection shall be surfaced to the caregiver as a distinctly stronger warning than other soft signals.
- FR4.4 The caregiver and the senior shall both be notified of the final outcome, whether approved or blocked.

### 1.5 "Get Help" / Link-Checking
- FR5.1 The customer or caregiver shall be able to submit (paste or forward) a suspicious link or message for a check against known scam patterns.
- FR5.2 The system shall return a plain-language verdict/warning rather than a raw technical score.

### 1.6 Logging, Human Review & Feedback Loop
- FR6.1 Every flagged incident shall be logged with the triggering signals, timestamp, and device context for the bank's fraud team.
- FR6.2 Incident outcomes shall feed back into the behavioral baseline to reduce future false positives.
- FR6.3 **(new)** Flagged incidents that are not cleanly resolved by the automated challenge (e.g. challenge fails, or signals are ambiguous) shall be escalated to a human fraud analyst for review — the design is explicitly "human-in-the-loop," not a fully autonomous block/allow decision, per the discussion draft's framing for judges.

### 1.7 Pitch/Deck Production Requirements **(new)**
- FR7.1 The "See it in Action" slide (Slide 3) shall include either a recorded demo video of the working prototype, or 2–3 key screenshots showing the solution in action, per the hackathon pitch template's explicit requirement.
- FR7.2 The deck shall include a prepared, honest response to anticipated judge questions (false-positive rate, why a rules engine and not ML, WhatsApp/Telegram scanning limits, mockup-vs-real scope) rather than leaving these to be discovered live — see `spec-advanced.md` Section 9.

## 2. Non-Functional Requirements

- NFR1 **Accessibility:** UI must remain usable for low-vision and low-digital-literacy users — large fonts, high contrast, minimal steps per task.
- NFR2 **Latency:** Risk evaluation must complete before the transaction is allowed to proceed, without introducing a delay noticeable enough to frustrate a legitimate transfer.
- NFR3 **Fail-safe default:** Any uncertain or failed verification state must default to blocking, never to allowing.
- NFR4 **Privacy/compliance:** Collection of facial biometric data and behavioral/device signals requires explicit customer consent and PDPA compliance sign-off (open item — no production data pipeline exists yet).
- NFR5 **Auditability:** All flagging decisions must be explainable in plain language and reconstructable from the log (which signals, in what combination).
- NFR6 **Channel honesty:** The system must not claim to scan encrypted channels (WhatsApp/Telegram) it cannot actually access; detection on those vectors must rely on downstream banking-side behavior instead.
- NFR7 **Language support:** All customer-facing copy must be available in English, Malay, and Mandarin.
- NFR8 **(new) Explainability to regulators/judges:** Because the fraud logic is a rules engine rather than an ML model, the specific rule and signal combination behind every flag must be reproducible on demand — this is treated as a selling point (defensible, auditable) rather than a limitation to downplay.

## 3. Fraud Detection Signal Requirements

### 3.1 Transaction & payee behavior
- New, unverified payee added, especially right before a transfer request
- Transfer amount unusually large relative to the customer's typical history
- Multiple failed or rapid repeated transfer attempts in a short window
- Transfer requested at an unusual hour for that customer — the discussion draft's own illustrative example is a transfer attempted at **3am**, well outside a senior customer's typical ~9am–9/11pm activity window; exact thresholds should be configurable per customer rather than hardcoded
- Sudden request to raise the daily/online transfer limit
- Funds destined for a newly added overseas account or a known high-risk recipient bank

### 3.2 Device & session signals
- Remote-access/screen-sharing app detected active during the session — **named examples from the discussion draft: AnyDesk, TeamViewer** (strongest real-world signal)
- Login/transaction from a new/unrecognized device or unusual location
- Newly installed app requesting unusual permissions shortly before a transaction
- **(new)** App installed from outside the official app store (sideloaded APK) — a named malware-delivery vector for fake banking apps
- Sudden uninstalling of security apps (e.g. Singpass, ScamShield)

### 3.3 Account/profile changes
- Registered mobile number or email changed shortly before a transaction
- Security settings (biometrics, 2FA) altered right before a high-value transfer
- Multiple account changes bundled together in a short time span
- **(new)** Multiple failed OTP or 2FA attempts in a short window, distinct from failed transfer attempts — the discussion draft calls this out as its own signal category alongside general "multiple failed attempts"

### 3.4 Behavioral/biometric signals
- Face verification fails to match, or liveness check indicates a photo/video rather than a live person
- Typing/navigation pattern deviates sharply from the customer's usual rhythm

### 3.5 Communication-channel context (supporting signal only, never sole trigger)
- Customer recently flagged a suspicious link/number via "Get Help"
- Timing correlation: a suspicious call/SMS followed almost immediately by a banking session

## 4. Response Requirements (what must happen on detection)

**Immediate (within the transaction):**
- Pause the transaction before funds move
- Freeze only that one action, not the whole account
- Trigger the biometric/visual challenge
- Show a plain-language reason for the pause

**Parallel/escalation:**
- Send the linked caregiver a real-time 1-click approval request
- Flag remote-access signals to the caregiver as a stronger warning
- Log full context for the fraud team
- **(new)** Route unresolved/ambiguous flags to a human fraud analyst queue for review, not just a binary automated outcome

**On challenge failure/timeout:**
- Default to blocking
- Offer a "Get Help" path to a human
- Optionally apply a short cool-down on further risky actions

**After the fact:**
- Notify both senior and caregiver of the outcome either way
- Feed the incident into the baseline to reduce future false positives

## 5. Data Requirements

- Transaction and payee history
- Device and session signals (e.g. active remote-access app detection, sideloaded app detection)
- Login timing patterns
- Biometric data for facial verification (demo-only stand-in in this build; production would use Singpass Face Verification)

## 6. Known Constraints / Non-Requirements

- The system is **not** required to (and cannot) scan WhatsApp/Telegram message content — end-to-end encryption prevents this for any outside app, per ScamShield's own documentation.
- The system is **not** expected to reverse funds already transferred; it only prevents transfers from completing through this app.
- Real Singpass Face Verification integration, real OCBC/Great Eastern core-system integration, and a trained ML model are explicitly out of scope for the hackathon build (see `spec-advanced.md` Section 7).
- Exact numeric thresholds (unusual-hour window, transfer-amount multiplier, OTP-failure count) are illustrative in this document, not finalized — the discussion draft treats these as tunable parameters, not fixed rules, and the team should say so if asked.
