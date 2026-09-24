import { money } from './format';
import type { CaregiverEmailFields } from './emailNotify';
import type { CurrentTransfer, Decision } from './types';

/**
 * Builds the caregiver fraud-alert email. Two shapes come out of here:
 *   - buildCaregiverEmailFields(): the structured field set the Lambda
 *     renders into the branded HTML layout (labelled rows + Approve/Decline
 *     buttons + footer). This is the primary content now.
 *   - buildCaregiverEmailSubject() / buildCaregiverEmailBody(): the subject
 *     line and a plain-text fallback body (for email clients that don't
 *     render the HTML part, and for the Fraud-Ops audit log on the incident).
 *
 * Any field the app doesn't have stays empty — nothing is fabricated.
 */

// Demo account holder. A real build would read this from the customer
// profile; hardcoded here since the mock account has no name field.
export const ACCOUNT_HOLDER_NAME = 'Madam Tan Ah Lian';

const CATEGORY_HEADING: Record<string, string> = {
  'limit-increase': 'Unusual transfer amount or limit increase',
  malware: 'Possible malware on this device',
  'suspicious-profile': 'Suspicious recipient profile',
};

/**
 * Subject line by notification type:
 *   - 'approval'     → transfer that needs the caregiver's Approve/Decline.
 *   - 'malware'      → the account was blocked on malware detection.
 *   - 'notification' → everything else (e.g. a completed limit increase);
 *                      an informational caregiver notice, no action needed.
 */
export type CaregiverEmailKind = 'approval' | 'malware' | 'notification';

export function buildCaregiverEmailSubject(kind: CaregiverEmailKind = 'notification'): string {
  switch (kind) {
    case 'approval':
      return 'Silver Guard Transaction Approval';
    case 'malware':
      return 'Silver Guard: account blocked, malware detected';
    case 'notification':
    default:
      return 'Silver Guard Caregiver Notification';
  }
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-SG', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Singapore',
    });
  } catch {
    return iso;
  }
}

/** The flagged issue(s), one per line — empty string if nothing was flagged. */
function flagIssueText(decision: Decision): string {
  if (!decision.categories.length) return '';
  const parts: string[] = [];
  for (const category of decision.categories) {
    const heading = CATEGORY_HEADING[category.id] ?? category.label;
    if (category.reasons.length) {
      parts.push(`${heading}: ${category.reasons.join('; ')}`);
    } else {
      parts.push(heading);
    }
  }
  return parts.join('\n');
}

/**
 * Structured fields for the branded HTML layout. `subject` (recipient name)
 * and `amount` come straight from what was entered in the app; a missing
 * value stays empty rather than being guessed.
 */
export function buildCaregiverEmailFields(
  transfer: Pick<CurrentTransfer, 'subject' | 'amount' | 'decision'>,
  opts: { timestamp?: string; accountHolder?: string } = {}
): CaregiverEmailFields {
  const { subject, amount, decision } = transfer;

  // A limit-increase notice has no payee, and its figure is the limit raised
  // *to* — not a payment. So drop the Recipient row and relabel the amount.
  // (Detected from the decision's category, which is the source of truth.)
  const isLimitIncrease =
    decision.categories.length > 0 && decision.categories.every((c) => c.id === 'limit-increase');

  return {
    accountHolder: opts.accountHolder || ACCOUNT_HOLDER_NAME,
    recipient: isLimitIncrease ? '' : subject || '',
    amount: Number.isFinite(amount) ? money(amount) : '',
    amountLabel: isLimitIncrease ? 'New transfer limit:' : 'Transaction Amount:',
    timestamp: formatTimestamp(opts.timestamp ?? new Date().toISOString()),
    flagIssue: flagIssueText(decision),
  };
}

/**
 * Plain-text fallback body mirroring the field layout, for clients that
 * don't render HTML and for the incident audit log. Empty fields render as
 * a blank value on their line.
 */
export function buildCaregiverEmailBody(
  transfer: Pick<CurrentTransfer, 'subject' | 'amount' | 'decision'>,
  opts: { locked?: boolean; timestamp?: string } = {}
): string {
  const f = buildCaregiverEmailFields(transfer, { timestamp: opts.timestamp });
  const amountLabel = (f.amountLabel ?? 'Transaction Amount:').replace(/:$/, '');
  const lines = [
    `For Account Holder: ${f.accountHolder}`,
    // Recipient line only when there is one (a limit increase has no payee).
    ...(f.recipient ? [`Recipient: ${f.recipient}`] : []),
    `${amountLabel}: ${f.amount}`,
    `Timestamp: ${f.timestamp}`,
    `Flag Issue: ${f.flagIssue ? '\n  ' + f.flagIssue.split('\n').join('\n  ') : ''}`,
    '',
    // A locked case awaits the caregiver's action; an informational notice
    // (e.g. a completed limit increase) is for awareness, no action needed.
    opts.locked
      ? 'Upon Caregiver approval / decline, no payment will be processed automatically.'
      : 'This notification is for your awareness. No action is needed.',
  ];
  return lines.join('\n');
}
