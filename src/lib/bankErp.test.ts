import { describe, expect, it } from 'vitest';
import { getReportRate, hasHighReportRate } from './bankErp';

describe('bankErp', () => {
  it('unknown recipient → zero report rate, not flagged', () => {
    expect(getReportRate('Jane Tan')).toBe(0);
    expect(hasHighReportRate('Jane Tan')).toBe(false);
  });

  it('recipient with a high on-record report rate → flagged', () => {
    expect(hasHighReportRate('agnes kar men')).toBe(true);
    expect(hasHighReportRate('quickcash transfer sdn bhd')).toBe(true);
  });

  it('lookup is case/whitespace-insensitive, like mockAccount’s payee matching', () => {
    expect(hasHighReportRate('  Agnes Kar Men  ')).toBe(true);
  });
});
