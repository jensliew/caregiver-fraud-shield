import type { CaregiverRequest } from './types';

/**
 * Simulated caregiver notification — builds the approval-request payload
 * the caregiver "phone" mock screen renders. A real build would send this
 * via FCM/APNs; see the execution plan's tech-stack table.
 */
export function buildApprovalRequest(args: { summary: string; reasons: string[]; strongWarning?: boolean }): CaregiverRequest {
  const { summary, reasons, strongWarning = false } = args;
  return {
    title: strongWarning ? 'Possible malware detected' : 'Approval needed',
    body: `${summary}: ${reasons.join(', ')}`,
    strongWarning,
    timestamp: new Date().toISOString(),
  };
}
