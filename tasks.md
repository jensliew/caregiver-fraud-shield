# Tasks (Advanced) — Simplified Silver Assist & Multi-Agent Scam Guard Engine

See `spec-advanced.md`, `requirements-advanced.md`, and `design-advanced.md` for context. This supersedes `tasks.md` with tasks surfaced in the `.pages` discussion draft. Completed items carried over from `tasks.md` are kept as-is; new tasks are marked **(new)**.

## Phase 0 — Planning & Key Decisions

- [x] Decide build approach: **Hybrid** — real working logic for the "wow" feature (fraud-flagging + face detection), mockup for surrounding screens (onboarding, general navigation)
- [x] Decide fraud model type: **Rules engine**, not a trained ML model — far more realistic for hackathon time and easier to explain/defend to judges
- [ ] Decide exact number of detection criteria to implement live vs. just describe in the deck
- [ ] Decide how far the "on detection" flow goes in the live demo — pause + challenge only, or also simulate the caregiver notification live
- [ ] Finalize tech stack for the Architecture & Tech Stack appendix slide (current lean: React front end, Python/FastAPI backend, face-api.js, an LLM API for "Get Help" link-checking)
- [x] **(new)** Decide live demo vs. recorded video — **recorded video recommended** per the discussion draft, specifically to remove webcam/lighting/network risk at presentation time

## Phase 1 — Fraud Detection Engine

- [x] Write `fraudCheck.js` — rules engine with auto-flag rules (remote-access active, known high-risk recipient) and soft-signal scoring (threshold: 2+ signals)
- [x] Write `transferFlow.js` — response-action layer (pause → warn → challenge → notify caregiver → log)
- [ ] Wire the stand-in `console.log` actions to real functions (render screen, send push notification, write to a persistent log) when moving past hackathon scaffolding
- [ ] **(new)** Extend auto-flag rules to name specific remote-access tools (AnyDesk, TeamViewer) rather than a generic "remote access" category
- [ ] **(new)** Add sideloaded-app / non-official-app-store detection as an auto-flag rule (malicious APK vector)
- [ ] **(new)** Add a separate "multiple failed OTP/2FA attempts" soft signal, distinct from repeated transfer attempts
- [ ] **(new)** Make the "unusual hour" window configurable per customer rather than a single hardcoded range; use the 3am-example / ~9am–9-11pm normal window as the demo default only

## Phase 2 — Silver Mode UI

- [x] Build `silver-mode-demo.html`: single self-contained file, Home screen with 4 tiles (Account Balance, Add Money, Pay Someone, Get Help)
- [x] Build Pay Someone form with auto-detection of new payee / large amount from typed input
- [x] Add a "demo controls" panel to simulate signals a browser can't produce on its own (remote-access active, rapid attempts, limit-increase request, new overseas account, known high-risk recipient)
- [x] Wire the fraud-check logic live into the form (confirmed working end-to-end via Playwright test)
- [ ] **(new)** Add a sideloaded-app-detected toggle to the demo-controls panel alongside the existing simulated signals

## Phase 3 — Biometric Challenge (one open item)

- [x] Implement webcam capture (`getUserMedia`) + face-api.js live face detection
- [x] Add "Simulate Verified" fallback button for camera/model load failure
- [ ] **Open:** verify the face-api.js CDN load itself on a normal internet connection before relying on it in a live demo (could not be tested from the original build session's network)

## Phase 4 — Caregiver & Human-in-the-Loop Flow

- [x] Simulate caregiver 1-click approval notification (console-log stand-in)
- [x] Build confirmation/outcome screens for both approved and blocked paths
- [ ] **(new)** Build the Fraud-Ops Review Console mockup — a simple internal queue view showing escalated/ambiguous flags with an approve/block action, so the pitch can show (not just describe) the human-in-the-loop layer
- [ ] **(new) TODO — pending, user will do later:** Deploy the real caregiver email alert (AWS SES + the `lambda/notifyCaregiver/` Lambda relay, code already written) and set `VITE_CAREGIVER_EMAIL_ENDPOINT` in `.env` so the "Send Email Alert" button on the Pay & Transfer locked screen actually delivers. Steps are in `lambda/notifyCaregiver/README.md`.

## Phase 5 — Design Mockup

- [x] Build Silver Mode – Home artboard (Claude Design canvas / Artifact)
- [x] Build Silver Mode – Scam Guard Alert artboard (warning banner, face-scan card, caregiver-notified banner)
- [x] Apply visual style: Atkinson Hyperlegible font, OCBC-red accent, high-contrast palette, color-coded icons
- [ ] **(new)** Build/mock the Fraud-Ops Review Console screen (internal-facing, low design priority relative to the senior-facing screens)

## Phase 6 — Pitch Deck Content

- [x] Draft Slide 1: Problem Statement (with sourced evidence, replacing the unverifiable "30%+ branch footfall" figure)
- [x] Draft Slide 2: Solution
- [x] Draft Slide 3: See it in Action — planning/research (mockup vs. prototype rationale, 3-layer + human-in-the-loop detection approach, biometric rationale)
- [ ] **(new)** Produce the actual "See it in Action" proof asset for Slide 3: either a recorded demo video, or 2–3 key screenshots of the pause → challenge → caregiver-notify sequence — the template requires one of these, and it is not yet produced
- [x] Draft Slide 4: Benefits and Challenges
- [ ] Build Appendix slides: Benefit Estimation, Architecture & Tech Stack, Other supporting information (not yet drafted)
- [ ] **(new)** Add the second evidence citation (2026 police advisory on senior scam targets) to the Problem Statement slide alongside the existing MHA 2026 figure, as a corroborating source
- [ ] **(new)** Write the Judge Q&A prep sheet (false-positive rate, why rules engine not ML, WhatsApp/Telegram limits, mockup-vs-real scope, MAS/regulatory alignment) — see `spec-advanced.md` Section 9 — and rehearse it as part of pitch prep, not just have it on paper

## Phase 7 — Compliance & Production-Readiness Notes (for judges / appendix, not build items)

- [ ] Note PDPA/consent requirements for biometric and behavioral data collection (flagged as an open item, not resolved)
- [ ] Note dependency on real-time data availability from OCBC systems (open question)
- [ ] Note dependency on third parties (Singpass, Great Eastern e-Connect) outside the team's control
- [ ] **(new)** Note MAS's 2024 Singpass Face Verification rollout as regulatory precedent/alignment, to be cited if a judge questions the biometric approach's feasibility

## Phase 8 — Final QA Before Submission

- [ ] Re-test `silver-mode-demo.html` end-to-end on the actual presentation machine/network (especially the face-api.js CDN load)
- [ ] Confirm all customer-facing copy has English/Malay/Mandarin variants where required
- [ ] Rehearse the honest-limitations framing (WhatsApp encryption, "pause don't reverse", demo-vs-production biometrics, nonzero false-positive rate) so it's presented proactively, not defensively
- [x] **(new)** Finalize live demo vs. recorded video decision — **recorded video**, per Phase 0 — and prepare accordingly: record early enough to allow a re-take if the first attempt has camera/lighting issues
