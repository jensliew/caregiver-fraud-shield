import type { ActivityItem, FundingSource } from './types';

/**
 * Static reference data for the demo account. The *mutable* balance/limit
 * live in AppStateContext (React state), not here — this module only
 * holds the constants and pure predicates that don't change at runtime.
 */
const KNOWN_PAYEES = ['jane tan', 'sp services', 'ntuc fairprice', 'grab'];
const KNOWN_HIGH_RISK_RECIPIENTS = ['agnes kar men', 'quickcash transfer sdn bhd'];
const LARGE_AMOUNT_THRESHOLD = 1000;

export const INITIAL_BALANCE = 18240.5;
export const INITIAL_TRANSFER_LIMIT = 5000;

export const INITIAL_ACTIVITY: ActivityItem[] = [
  { label: 'Grab', date: 'Yesterday', amount: -18.5 },
  { label: 'NTUC FairPrice', date: '3 days ago', amount: -64.2 },
  { label: 'SP Services', date: '5 days ago', amount: -142.8 },
  { label: 'Jane Tan', date: '1 week ago', amount: -100.0 },
];

// Starts empty — no pre-seeded favourites. The Add Money screen's dropdown
// has its own "None" option for this state; a real favourite only exists
// once the user actually adds one via the dedicated Add Favourite screen.
export const INITIAL_FUNDING_SOURCES: FundingSource[] = [];

export const BANK_OPTIONS = ['Maybank', 'Public Bank', 'CIMB Bank', 'AmBank', 'RHB Bank', 'UOB', 'DBS Bank', "Touch 'n Go eWallet"];

// Preset daily-limit choices for IncreaseLimitScreen's dropdown, 5k steps.
// Anything >= 10000 (the 3rd option onward) triggers the biometric-verify
// + caregiver-notify wizard; below that applies instantly.
export const LIMIT_OPTIONS = [5000, 10000, 15000, 20000, 25000, 30000, 35000, 40000, 45000, 50000];

function normalize(name: string): string {
  return (name || '').trim().toLowerCase();
}

export function isNewPayee(name: string): boolean {
  return !KNOWN_PAYEES.includes(normalize(name));
}

export function isKnownHighRiskRecipient(name: string): boolean {
  return KNOWN_HIGH_RISK_RECIPIENTS.includes(normalize(name));
}

export function isLargeAmount(amount: number): boolean {
  return Number(amount) > LARGE_AMOUNT_THRESHOLD;
}
