import { money } from './format';
import type { Incident } from './types';

/**
 * Plain-text formatter for the Fraud-Ops "Generate Report" disclosure —
 * internal tooling, so (like the rest of an incident's reasons/category
 * labels) this stays English-only rather than going through i18n. Pure and
 * synchronous: there's no real async "generation" step, just formatting
 * data that's already on the incident.
 */
export function buildIncidentReport(incident: Incident): string {
  const lines = [
    `Incident #${incident.id}`,
    `Subject: ${incident.subject}`,
    `Amount: ${money(incident.amount)}`,
    `Detected: ${incident.timestamp}`,
    `Categories: ${incident.categories.map((c) => c.label).join(', ')}`,
    'Signals:',
    ...incident.reasons.map((r) => `  - ${r}`),
  ];

  if (incident.identityCheck) {
    lines.push('', `Identity check at ${incident.identityCheck.timestamp}: ${incident.identityCheck.verified ? 'verified' : 'not verified'}`);
  }

  if (incident.emailLog) {
    lines.push(
      '',
      `Caregiver email sent at ${incident.emailLog.sentAt}:`,
      `  Subject: ${incident.emailLog.subject}`,
      `  Body: ${incident.emailLog.body}`
    );
  }

  return lines.join('\n');
}
