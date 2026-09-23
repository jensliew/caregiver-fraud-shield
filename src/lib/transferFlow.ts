import type { Decision } from './types';

/**
 * Response/action layer — pure orchestration, no knowledge of fraudCheck
 * or the DOM. It's handed a decision and drives what happens next via
 * injected hooks; the React state layer supplies hooks that call setState.
 * Mirrors design.md §2.3's step order.
 */
export interface TransferFlowHooks {
  onProceed?: () => void;
  onPause?: (reasons: string[]) => void;
  onLog?: (decision: Decision) => void;
  onCaregiverNotify?: (reasons: string[]) => void;
  onChallenge?: (reasons: string[]) => void;
}

export function startTransferFlow(decision: Decision, hooks: TransferFlowHooks): void {
  const { onProceed, onPause, onLog, onCaregiverNotify, onChallenge } = hooks;

  if (!decision.flagged) {
    onProceed?.();
    return;
  }

  onPause?.(decision.reasons);
  onLog?.(decision);
  onCaregiverNotify?.(decision.reasons);
  onChallenge?.(decision.reasons);
}

export interface ChallengeHooks {
  onResume?: () => void;
  onEscalate?: () => void;
}

/** Biometric/visual challenge resolves to either resume or escalate — never auto-allow. */
export function resolveChallenge(passed: boolean, hooks: ChallengeHooks): void {
  if (passed) {
    hooks.onResume?.();
  } else {
    hooks.onEscalate?.();
  }
}

export interface ReviewHooks {
  onResume?: () => void;
  onBlock?: () => void;
}

/** Fraud-Ops human review resolves to either resume or block. */
export function resolveReview(approved: boolean, hooks: ReviewHooks): void {
  if (approved) {
    hooks.onResume?.();
  } else {
    hooks.onBlock?.();
  }
}
