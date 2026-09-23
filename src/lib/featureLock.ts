import type { Decision } from './types';

/**
 * The "combination-of-signals" tier from requirements.md FR2.3 — a soft
 * signal escalates further only when it co-occurs with another. Here:
 * a *real*, completed transfer-limit increase (tracked as app state, not
 * a fraudCheck category — see AppStateContext's `recentLimitIncrease`),
 * followed later by a transfer that itself comes back suspicious-profile
 * flagged. Deliberately reuses fraudCheck's own category output rather
 * than re-deriving "what counts as suspicious" here, so there's a single
 * source of truth for that judgment.
 */
export function shouldLockPayTransfer(recentLimitIncrease: boolean, decision: Decision): boolean {
  return recentLimitIncrease && decision.categories.some((c) => c.id === 'suspicious-profile');
}

/**
 * The most severe tier: a malware signal alone (no combination, no prior
 * limit increase needed) locks Pay & Transfer immediately. A browser can't
 * really detect a remote-access/sideloaded app — see the `demoControls`
 * toggles this stands in for — but the response chain that follows is real.
 */
export function shouldLockForMalware(decision: Decision): boolean {
  return decision.categories.some((c) => c.id === 'malware');
}

/**
 * A suspicious recipient profile on its own (a newly added overseas
 * account, a known high-risk recipient bank, a session from a different
 * country/IP, or a recipient with a high report rate) locks Pay & Transfer
 * and requires the caregiver to Approve/Decline by email before the payment
 * can proceed. Distinct from shouldLockPayTransfer, which is the stronger
 * "recent limit increase + suspicious profile" combination; both resolve
 * the same way (email approval), but this one needs no prior limit change.
 */
export function shouldLockForSuspiciousProfile(decision: Decision): boolean {
  return decision.categories.some((c) => c.id === 'suspicious-profile');
}
