import { describe, expect, it } from 'vitest';
import { shouldLockForMalware, shouldLockPayTransfer } from './featureLock';
import type { Decision } from './types';

function decisionWith(categoryIds: Decision['categories'][number]['id'][]): Decision {
  const categories = categoryIds.map((id) => ({ id, label: '', reasons: [] }));
  return { flagged: categories.length > 0, categories, reasons: [] };
}

describe('shouldLockPayTransfer', () => {
  it('no recent limit increase → never locks, regardless of decision', () => {
    expect(shouldLockPayTransfer(false, decisionWith(['suspicious-profile']))).toBe(false);
  });

  it('recent limit increase alone (no suspicious-profile category) → does not lock', () => {
    expect(shouldLockPayTransfer(true, decisionWith(['malware']))).toBe(false);
    expect(shouldLockPayTransfer(true, decisionWith([]))).toBe(false);
  });

  it('recent limit increase + suspicious-profile category → locks', () => {
    expect(shouldLockPayTransfer(true, decisionWith(['suspicious-profile']))).toBe(true);
  });

  it('recent limit increase + suspicious-profile alongside other categories → still locks', () => {
    expect(shouldLockPayTransfer(true, decisionWith(['malware', 'suspicious-profile']))).toBe(true);
  });
});

describe('shouldLockForMalware', () => {
  it('no malware category → does not lock', () => {
    expect(shouldLockForMalware(decisionWith([]))).toBe(false);
    expect(shouldLockForMalware(decisionWith(['suspicious-profile']))).toBe(false);
  });

  it('malware category alone → locks, no other signal or state needed', () => {
    expect(shouldLockForMalware(decisionWith(['malware']))).toBe(true);
  });

  it('malware alongside other categories → still locks', () => {
    expect(shouldLockForMalware(decisionWith(['malware', 'suspicious-profile', 'limit-increase']))).toBe(true);
  });
});
