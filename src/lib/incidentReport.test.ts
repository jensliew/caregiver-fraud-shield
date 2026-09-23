import { describe, expect, it } from 'vitest';
import { buildIncidentReport } from './incidentReport';
import type { Incident } from './types';

function baseIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: 7,
    subject: 'Agnes Kar Men',
    amount: 250,
    reasons: ['Remote-access app (e.g. AnyDesk, TeamViewer) detected active'],
    categories: [{ id: 'malware', label: 'Possible malware on this device', reasons: [] }],
    status: 'pending',
    escalated: true,
    timestamp: '2026-09-21T10:00:00.000Z',
    ...overrides,
  };
}

describe('buildIncidentReport', () => {
  it('includes id, subject, amount, timestamp, categories, and each reason', () => {
    const report = buildIncidentReport(baseIncident());
    expect(report).toContain('Incident #7');
    expect(report).toContain('Agnes Kar Men');
    expect(report).toContain('S$250.00');
    expect(report).toContain('2026-09-21T10:00:00.000Z');
    expect(report).toContain('Possible malware on this device');
    expect(report).toContain('Remote-access app (e.g. AnyDesk, TeamViewer) detected active');
  });

  it('omits any email section when no emailLog is present', () => {
    const report = buildIncidentReport(baseIncident());
    expect(report).not.toContain('Caregiver email sent');
  });

  it('includes the identity-check audit note when present', () => {
    const report = buildIncidentReport(baseIncident({ identityCheck: { verified: true, timestamp: '2026-09-21T10:02:00.000Z' } }));
    expect(report).toContain('Identity check at 2026-09-21T10:02:00.000Z: verified');
  });

  it('includes the stored email audit copy when emailLog is present', () => {
    const report = buildIncidentReport(
      baseIncident({ emailLog: { subject: 'Approval needed', body: 'Agnes Kar Men · S$250.00', sentAt: '2026-09-21T10:05:00.000Z' } })
    );
    expect(report).toContain('Caregiver email sent at 2026-09-21T10:05:00.000Z');
    expect(report).toContain('Subject: Approval needed');
    expect(report).toContain('Body: Agnes Kar Men · S$250.00');
  });
});
