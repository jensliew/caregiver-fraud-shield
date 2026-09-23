# Project Spec (Advanced) — Simplified Silver Assist & Multi-Agent Scam Guard Engine

**Hackathon:** OCBC OPC Hackathon
**Pitch template:** Problem Statement → Solution → See it in Action → Benefits and Challenges → Appendix (Benefit Estimation, Architecture & Tech Stack, Other supporting information)
**Sources:** `OCBC_OPC_Hackathon_Session_Notes.md` (full session notes) + `OCBC HACKHATON DISCUSSION.pages` ("Slide 3 Planning — Discussion Draft", the newer, more recent file in the same folder). The `.pages` file is Apple's proprietary compressed format; its text was recovered from the underlying binary rather than opened natively, so some fragments below are reconstructed from partial text runs — flagged where the wording is illustrative rather than a verbatim quote.

This supersedes `spec.md` by adding the judge-readiness and deck-production material that was still in discussion-draft form when the baseline doc was written. Nothing from `spec.md` is removed — this is additive.

## 1. Summary

An autonomous, simplified banking interface for senior citizens ("Silver Mode"), paired with a proactive, caregiver-linked fraud engine that stops scam transactions **before** money moves — rather than freezing an account after the fact, which is all today's Kill Switch can do. It extends OCBC's existing Digital Silvers Programme direction across OCBC Digital and Great Eastern e-Connect, and targets the bank's own "Pay Someone" transfer flow as the primary point of intervention.

## 2. Problem (one sentence)

Senior citizens aged 55+ face digital exclusion from complex banking apps and are increasingly targeted by scams, forcing branch dependency for basic tasks while leaving them exposed to fraud that today's reactive safeguards fail to prevent.

Key evidence:
- Under 50% of OCBC customers aged 60+ use digital banking regularly (OCBC SeniorCare); seniors make up a majority of branch footfall.
- Seniors 65+ were the only age group in Singapore whose scam-victim count rose from 2024→2025, with an average loss of **$37,000 per victim** — the highest of any age group (Ministry of Home Affairs, 2026).
- The discussion draft references a **2026 police advisory on senior citizens as scam targets**, consistent with and reinforcing the MHA figure above — cite both in the deck as corroborating, independent sources rather than a single data point.
- Existing safeguards (Kill Switch, S$5,000 default transfer limit) are reactive: they only help *after* a scam is already suspected or a ceiling is hit.

## 3. Solution (one sentence)

By replacing complex menus with a simple visual interface and pairing it with a proactive, caregiver-linked scam guard, this solution closes the exact gap today's reactive Kill Switch leaves open — stopping fraud before funds move, instead of only freezing accounts after they're gone.

## 4. Core Capabilities

1. **Silver Mode** — ultra-simplified, high-contrast, large-font portal with 4 primary tiles: Account Balance, Add Money, Pay Someone, Get Help.
2. **Proactive Scam & Malware Guard Agent** — background rules engine that pauses high-risk actions (new payee, remote-access app active, unusual hour, limit-increase request, sideloaded/unofficial app detected, etc.) before completion.
3. **Smart Friction & Biometric Challenge** — replaces phishable SMS OTPs with facial verification or a visual puzzle-match, plus a plain-language warning in the customer's preferred language (English/Malay/Mandarin).
4. **Caregiver Co-Pilot Sync** — a linked family member gets a real-time 1-click approval request for high-risk changes (limit increases, mobile number changes, large transfers).
5. **Fraud-Ops Human-in-the-Loop Review** (new) — flagged incidents that aren't resolved by the automated challenge surface to a human fraud analyst, not just an automated allow/block — the discussion draft is explicit that the pitch should describe this as "human-in-the-loop," not a fully autonomous black box, since that framing is both more honest and more defensible to judges.

## 5. Target Users

- **Primary:** OCBC banking / Great Eastern policy customers aged 55+, including dialect-first speakers who currently rely on family members or branch visits.
- **Secondary:** Linked family caregivers, who receive approval requests and stronger alerts (e.g. remote-access detected).
- **Internal:** OCBC/Great Eastern branch staff (CARE Ambassadors) and fraud/ops teams, who currently absorb manual enquiries and post-scam remediation, and who become the human-in-the-loop reviewers for escalated cases.

## 6. Business Outcomes (ranked, per company Q7)

1. Improve customer experience
2. Reduce risk / compliance lapses
3. Increase operational efficiency
4. Reduce cost
5. Increase revenue

## 7. Hackathon Scope

**In scope (hybrid build — real logic + mockup surrounding screens):**
- Real, working fraud-scoring rules engine (`fraudCheck.js`, `transferFlow.js`)
- Real browser-webcam face detection (face-api.js) as a stand-in for production biometric verification
- Click-through Silver Mode UI covering Home, Pay Someone, Scam Guard Alert, caregiver notification, and confirmation screens
- Design mockup of the two key screens (Home, Scam Guard Alert)
- A recorded demo video **or** 2–3 key screenshots of the working prototype for the "See it in Action" slide — the pitch template explicitly requires one of these two forms of proof, not just a description

**Out of scope for the hackathon:**
- Real integration with OCBC core banking or Great Eastern e-Connect
- Real integration with Singpass Face Verification (SFV) — demo simulates this step
- Real WhatsApp/Telegram message scanning (technically impossible — see limitations)
- A trained ML fraud model (a rules engine is used instead; more realistic for the build window)
- Production-grade PDPA/consent flows for biometric and behavioral data

## 8. Honest Limitations (state these to judges, don't hide them)

- ScamShield's own documentation confirms it **cannot** scan WhatsApp/Telegram content — end-to-end encryption blocks it. This system compensates by watching the *banking side* after a link is tapped, not the message itself.
- "Pause, don't reverse" only works for actions that go through this app. If a scam is completed through a different channel, this system cannot intervene.
- The demo's face detection is a concept simulation; production would integrate with the already-mandated Singpass Face Verification (MAS, 2024).
- A rules engine, not an ML model, will always have a nonzero false-positive rate — the deck should state this directly rather than let a judge raise it first (see Section 9).

## 9. Judge Readiness — Anticipated Questions & Honest Answers

The discussion draft frames this explicitly as "honest framing" for the judging panel, and flags that Slide 3 needs to show, not just claim, the solution works. Prepared answers:

- **"How much does this actually stop, vs. WhatsApp/Telegram scams you can't see?"** — We don't claim to see inside encrypted chats. We catch the *outcome* of those scams — the moment the victim tries to act on them inside the banking app — regardless of which channel delivered the scam. That's the honest, buildable scope.
- **"What's your false-positive rate?"** — Not measured yet; this is a rules engine tuned in a hackathon window, not a production model with real transaction history to calibrate against. We use a 2-signal combination threshold specifically to avoid single-signal false positives, and every flag is human-reviewable, not an automatic irreversible block.
- **"Why not just use an ML model?"** — A trained model needs labeled fraud data we don't have and can't ethically fabricate in a weekend; a transparent rules engine is also easier to explain to a senior citizen and to a regulator, which matters as much as raw accuracy here.
- **"Is this a real product or a mockup?"** — Hybrid, explicitly: the fraud-scoring logic and face-detection challenge are real, working code; onboarding and some navigation screens are click-through mockups. We say this upfront rather than let a judge discover it.
- **"What about MAS / regulatory approval?"** — We're building toward a direction MAS has already validated: Singapore's major retail banks are rolling out Singpass Face Verification (2024) to replace phishable SMS OTPs for high-risk actions. Our biometric challenge is designed to plug into that, not compete with it.

## 10. Related Documents

- `requirements-advanced.md` — detailed functional/non-functional requirements (advanced)
- `design-advanced.md` — UX and system/architecture design (advanced)
- `tasks-advanced.md` — implementation task breakdown and remaining open items (advanced)
- `spec.md`, `requirements.md`, `design.md`, `tasks.md` — original baseline versions (session-notes only)
