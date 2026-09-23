export type Lang = 'en' | 'ms' | 'zh' | 'ta';

export type CategoryId = 'limit-increase' | 'malware' | 'suspicious-profile';

export interface Category {
  id: CategoryId;
  label: string;
  reasons: string[];
}

export interface Decision {
  flagged: boolean;
  categories: Category[];
  reasons: string[];
}

/** Raw inputs fraudCheck evaluates — see lib/fraudCheck.ts for how each maps to a category. */
export interface Signals {
  newPayee?: boolean;
  largeAmount?: boolean;
  limitIncreaseRequest?: boolean;
  remoteAccessActive?: boolean;
  sideloadedAppDetected?: boolean;
  securityAppUninstalled?: boolean;
  knownHighRiskRecipient?: boolean;
  newOverseasAccount?: boolean;
  differentCountryIP?: boolean;
  multipleHighAmountTransactions?: boolean;
  highReportRate?: boolean;
}

export type DemoControls = Required<
  Pick<
    Signals,
    | 'remoteAccessActive'
    | 'sideloadedAppDetected'
    | 'securityAppUninstalled'
    | 'knownHighRiskRecipient'
    | 'newOverseasAccount'
    | 'differentCountryIP'
    | 'multipleHighAmountTransactions'
    | 'highReportRate'
    | 'limitIncreaseRequest'
  >
>;

// 'limit-increase' used to be a CurrentTransfer variant routed through the
// shared fraud pipeline (AlertScreen). It no longer is — limit changes now
// have their own dedicated, non-blocking wizard (see IncreaseLimitScreen),
// so 'transfer' is the only producer of CurrentTransfer left.
export type TransferType = 'transfer';

export interface CurrentTransfer {
  type: TransferType;
  subject: string;
  amount: number;
  signals: Signals;
  decision: Decision;
  incidentId: number | null;
  /**
   * Per-transfer token tying the caregiver's email Approve/Reject buttons
   * back to this paused transfer (see lib/emailNotify.ts). Only set for the
   * compound-signal lock, which the caregiver can resolve by email.
   */
  decisionToken?: string;
}

export type IncidentStatus = 'pending' | 'resumed' | 'blocked';

export interface Incident {
  id: number;
  subject: string;
  amount: number;
  reasons: string[];
  categories: Category[];
  status: IncidentStatus;
  escalated: boolean;
  timestamp: string;
  /** Audit trail: set once the real caregiver email alert has been sent for this incident. */
  emailLog?: { subject: string; body: string; sentAt: string };
  /** Audit trail: set once the customer has gone through the (non-gating) identity-confirmation step. */
  identityCheck?: { verified: boolean; timestamp: string };
}

export interface CaregiverRequest {
  title: string;
  body: string;
  strongWarning: boolean;
  timestamp: string;
}

export type OutcomeStatus = 'approved' | 'blocked' | 'pending-review';

export interface ActivityItem {
  label: string;
  date: string;
  amount: number;
}

/** A saved "top up from" source for Add Money — a favourite bank account. */
export interface FundingSource {
  id: string;
  bank: string;
  accountNumber: string;
}

/** A saved "pay to" recipient for Pay & Transfer. */
export interface SavedPayee {
  id: string;
  name: string;
  bank: string;
  accountNumber: string;
}

export type Screen =
  | 'login'
  | 'register'
  | 'home'
  | 'balance'
  | 'addMoney'
  | 'addMoneyDone'
  | 'addFavourite'
  | 'pay'
  | 'addPayee'
  | 'increaseLimit'
  | 'alert'
  | 'outcome'
  | 'review'
  | 'getHelp'
  | 'accessibility';

export type GetHelpVerdict = 'suspicious' | 'unclear' | 'empty';

export interface GetHelpResult {
  verdict: GetHelpVerdict;
  message: string;
}
