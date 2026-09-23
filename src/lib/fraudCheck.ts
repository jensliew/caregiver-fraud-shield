import type { Category, Decision, Signals } from './types';

/**
 * Fraud rules engine — pure, no React/DOM dependency, fully unit-testable
 * in isolation (see fraudCheck.test.ts).
 *
 * Three detection categories, each independently triggerable:
 *   1. limit-increase      — an explicit limit-raise request, or a large
 *                            amount to an unfamiliar payee (never large
 *                            amount alone — a known payee can legitimately
 *                            send a large amount).
 *   2. malware              — any one signal is severe enough alone: it's
 *                            exactly the pattern from the real malware
 *                            advisory this project is built around.
 *   3. suspicious-profile   — the destination itself is the risk signal.
 *                            A newly added overseas account, a known
 *                            high-risk recipient bank, a session from a
 *                            different country/IP, or a recipient with a
 *                            high report rate from other users each flags
 *                            on its own. Multiple-high-amount-transactions
 *                            stays corroborating detail only, to avoid
 *                            flagging a senior for simply paying someone new.
 */
export function checkTransactionRisk(signals: Signals): Decision {
  const categories: Category[] = [];

  const limitTriggered = signals.limitIncreaseRequest || (signals.largeAmount && signals.newPayee);
  if (limitTriggered) {
    categories.push({
      id: 'limit-increase',
      label: 'Unusual transfer amount or limit increase',
      reasons: [
        signals.limitIncreaseRequest && 'Sudden request to raise the transfer limit',
        signals.largeAmount && 'Amount unusually large vs. typical history',
        !signals.limitIncreaseRequest && signals.newPayee && 'New, unverified payee',
      ].filter((r): r is string => Boolean(r)),
    });
  }

  const malwareTriggered = signals.securityAppUninstalled || signals.remoteAccessActive || signals.sideloadedAppDetected;
  if (malwareTriggered) {
    categories.push({
      id: 'malware',
      label: 'Possible malware on this device',
      reasons: [
        signals.securityAppUninstalled && 'Security app (Singpass/ScamShield) was uninstalled',
        signals.remoteAccessActive && 'Remote access app (e.g. AnyDesk, TeamViewer) detected active',
        signals.sideloadedAppDetected && 'App installed outside the official app store detected',
      ].filter((r): r is string => Boolean(r)),
    });
  }

  const profileTriggered =
    signals.newOverseasAccount || signals.knownHighRiskRecipient || signals.differentCountryIP || signals.highReportRate;
  if (profileTriggered) {
    categories.push({
      id: 'suspicious-profile',
      label: 'Suspicious recipient profile',
      reasons: [
        signals.newOverseasAccount && 'Newly added overseas account',
        signals.knownHighRiskRecipient && 'Destination is a known high risk recipient bank',
        signals.differentCountryIP && 'Session from a different country/IP than usual',
        signals.multipleHighAmountTransactions && 'Multiple high amount transactions to this recipient',
        signals.highReportRate && 'This recipient has a high report rate from other users',
      ].filter((r): r is string => Boolean(r)),
    });
  }

  return {
    flagged: categories.length > 0,
    categories,
    reasons: categories.flatMap((c) => c.reasons),
  };
}
