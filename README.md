# Silver Guard — OCBC OPC Hackathon 2026 MVP

Silver Assist & Multi-Agent Scam Guard Engine: a simplified banking UI for seniors 55+, paired with a caregiver-linked fraud engine that pauses risky transfers before funds move — instead of only freezing an account after the fact.

## Stack

React + TypeScript + Vite + Tailwind CSS, tested with Vitest. Chosen because the project's own docs already named React as the "suggested full-build stack" — this replaces the earlier vanilla HTML/CSS/JS hackathon scaffold with a proper component structure and typed state, without changing any of the product behavior.

## Run it

```
npm install
npm run dev       # http://localhost:5173
npm run build      # type-checks (tsc -b) then produces dist/
npm run preview    # serve the production build locally
npm test           # Vitest
```

## Structure

```
src/
  main.tsx                Mounts <App/>
  App.tsx                 Screen router — maps Screen -> component
  index.css                Tailwind directives + base layer (focus rings, reduced-motion)
  lib/                      Pure logic — zero React/DOM dependency, unit-tested directly
    types.ts                Shared types: Signals, Decision, Category, Incident, ...
    fraudCheck.ts            Rules engine — auto-flag + soft-signal scoring across 3 categories
    transferFlow.ts          Response/action orchestration (pause -> challenge -> resolve)
    caregiverNotify.ts        Builds the caregiver's approval-request payload
    getHelp.ts                Rule-based link/message pattern check (LLM call is the next upgrade)
    mockAccount.ts            Static demo data + payee/amount predicates
    categoryPresentation.ts   Category -> icon/label/plain-language-sentence mapping
    format.ts                 money()/initials() formatting helpers
    *.test.ts                 Vitest suites (co-located with the code they test)
  state/
    AppStateContext.tsx      All app state (screen, balance, incidents, demo controls, ...) +
                              the handler functions that wire lib/transferFlow.ts's hooks to setState
  i18n/
    strings.ts                EN/Malay/Mandarin/Tamil copy
    useT.ts                   Translation hook, reads the current language from AppStateContext
  hooks/
    useFaceDetection.ts       face-api.js wrapper — webcam capture, blink-based liveness
                              (Eye Aspect Ratio across a sampling window), and 128-d face-
                              descriptor matching (see "Biometric verification" below)
  components/
    icons/Icon.tsx             Hand-authored outline icon set (no icon library)
    layout/                    AppHeader, BackLink, ScreenShell, ScreenHeaderTint
    Button.tsx, CategoryBadges.tsx
    FaceScanCapture.tsx         Shared enroll/verify camera UI, used on both Login and Alert
    screens/                   One component per screen (Login, Home, Balance, Pay, Alert, ...)
```

**Why state lives in `AppStateContext` and not in each component:** the fraud-detection flow spans many screens (Pay & Transfer -> Alert -> Caregiver phone -> Outcome, or -> Fraud-Ops Review Console), and several screens need to read or resolve the same in-flight transfer. A single context avoids prop-drilling that chain through every intermediate screen.

**Why `lib/` has no React imports:** `fraudCheck.ts` and `transferFlow.ts` are the same plain functions whether called from a component or a test file — that's what makes the fraud logic honestly auditable (a judge, or a future engineer, can read the whole decision path without any UI framework in the way) and directly unit-testable without rendering anything.

## Biometric verification

Real, not simulated — the same module runs at both the login screen and the fraud-pause challenge:

1. **Enrollment** (first login on a device): captures one face descriptor (a 128-number vector from face-api.js's recognition net, not a photo) and stores it in `localStorage`.
2. **Liveness**: samples Eye Aspect Ratio from face landmarks over a ~4.5s window and requires a genuine dip-then-recover (a blink) — a static photo held up to the camera shows constant EAR and correctly fails this.
3. **Identity match**: compares a fresh descriptor against the enrolled one via Euclidean distance (face-api.js's own recommended 0.6 cutoff). Liveness alone would accept any live stranger's face — this is what actually checks it's the *same* person.

All three fail closed: no face, no blink, or no match all resolve to failure, never an auto-pass.

**Caught and fixed a real bug while building this**: the face-api.js npm package doesn't bundle its model weight files — the CDN path used earlier in the project (`jsdelivr/npm/face-api.js/weights`) 404s on all three model manifests. The weights are only published in the model author's GitHub repo. Fixed by pointing at `jsdelivr`'s `/gh/` proxy, pinned to a commit SHA (the repo has no version tags for that folder). Verified by driving the actual model-loading + inference pipeline in a browser, not just reading the code — confirmed real 404s before the fix and confirmed clean model loads plus correct fail-closed rejection of a non-face test pattern after it.

**Honest limitation**: enrollment lives in this browser's `localStorage` — per-device, gone if site data is cleared, and not how production would ever handle a biometric template (see `lib/faceEnrollment.ts` for the full caveat and the production path via Singpass Face Verification).

## What's real vs. mocked, and why

Full breakdown: **https://claude.ai/code/artifact/2db24d77-89c5-4faf-bf6c-3d91d9230793**

Short version: the fraud rules engine, response flow, and face-detection challenge are real, working code. Transaction/account data, Singpass Face Verification, and caregiver push notifications are simulated — the demo-controls panel on the Pay & Transfer screen lets you set signals a browser can't otherwise produce (remote-access active, sideloaded app, security app uninstalled, etc.) and watch the real logic evaluate them live, across all three detection categories (unusual amount/limit increase, malware, suspicious recipient profile).

## Known gaps (tracked in the execution plan)

- `getHelp.ts` is a keyword-pattern stub, not the LLM-backed check described in the requirements — swap in a real API call once a key is available (~1 hr).
- Caregiver notification and the "Call a relationship manager" / "Start a video call" buttons on Get Help are mocked, not real telephony/push.
- Malay/Mandarin/Tamil copy covers only the screens shown in this demo — have a native speaker review it before presenting.
- The face-api.js CDN load is now verified working from this dev environment (see "Biometric verification" above) — still worth a final check on the actual presentation network/venue before relying on it live, since venue wifi is the one variable that can't be tested in advance.
- Biometric enrollment is per-browser (`localStorage`) — clearing site data, switching browsers, or presenting from a different machine all require re-enrolling. The "Presenter tools" reset link on Login exists for exactly this.
- "Eye Protection" (mentioned in the discussion draft) is still undefined in every spec version seen so far — not built, pending clarification of what it actually means.
