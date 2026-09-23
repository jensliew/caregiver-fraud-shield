import { describe, expect, it } from 'vitest';
import { checkTransactionRisk } from './fraudCheck';

function categoryIds(result: ReturnType<typeof checkTransactionRisk>) {
  return result.categories.map((c) => c.id);
}

describe('checkTransactionRisk', () => {
  it('no signals → not flagged', () => {
    const result = checkTransactionRisk({});
    expect(result.flagged).toBe(false);
    expect(result.categories).toEqual([]);
  });

  it("large amount alone (known payee) → NOT flagged — a known payee can legitimately send a large amount", () => {
    const result = checkTransactionRisk({ largeAmount: true });
    expect(result.flagged).toBe(false);
  });

  it("new payee alone → NOT flagged — paying someone new isn't itself suspicious", () => {
    const result = checkTransactionRisk({ newPayee: true });
    expect(result.flagged).toBe(false);
  });

  it('large amount + new payee together → limit-increase category', () => {
    const result = checkTransactionRisk({ largeAmount: true, newPayee: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['limit-increase']);
  });

  it('explicit limit-increase request alone → limit-increase category', () => {
    const result = checkTransactionRisk({ limitIncreaseRequest: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['limit-increase']);
  });

  it('security app uninstalled alone → malware category', () => {
    const result = checkTransactionRisk({ securityAppUninstalled: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['malware']);
  });

  it('remote-access app alone → malware category', () => {
    const result = checkTransactionRisk({ remoteAccessActive: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['malware']);
  });

  it('sideloaded app alone → malware category', () => {
    const result = checkTransactionRisk({ sideloadedAppDetected: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['malware']);
  });

  it('known high-risk recipient alone → suspicious-profile category', () => {
    const result = checkTransactionRisk({ knownHighRiskRecipient: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['suspicious-profile']);
  });

  it('newly added overseas account alone → suspicious-profile category', () => {
    const result = checkTransactionRisk({ newOverseasAccount: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['suspicious-profile']);
  });

  it('different country/IP alone → suspicious-profile category', () => {
    const result = checkTransactionRisk({ differentCountryIP: true });
    expect(result.flagged).toBe(true);
  });

  it('high report rate alone → suspicious-profile category', () => {
    const result = checkTransactionRisk({ highReportRate: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result)).toEqual(['suspicious-profile']);
    expect(result.reasons.some((r) => /report rate/i.test(r))).toBe(true);
  });

  it('multiple-high-amount-history stays corroborating only — does not trigger alone', () => {
    const result = checkTransactionRisk({ multipleHighAmountTransactions: true });
    expect(result.flagged).toBe(false);
  });

  it('multiple categories can fire together', () => {
    const result = checkTransactionRisk({ knownHighRiskRecipient: true, limitIncreaseRequest: true, remoteAccessActive: true });
    expect(result.flagged).toBe(true);
    expect(categoryIds(result).sort()).toEqual(['limit-increase', 'malware', 'suspicious-profile'].sort());
  });
});
