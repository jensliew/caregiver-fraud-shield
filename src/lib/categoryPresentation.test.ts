import { describe, expect, it } from 'vitest';
import { buildPlainSummary } from './categoryPresentation';
import { t } from '../i18n/strings';
import type { Category } from './types';

const en = (key: Parameters<typeof t>[1]) => t('en', key);

const profile: Category = { id: 'suspicious-profile', label: '', reasons: [] };
const limit: Category = { id: 'limit-increase', label: '', reasons: [] };
const malware: Category = { id: 'malware', label: '', reasons: [] };

describe('buildPlainSummary', () => {
  it('produces the exact two-category example sentence', () => {
    expect(buildPlainSummary([profile, limit], en)).toBe(
      "This account looks unfamiliar and the amount is higher than usual. Let's make sure it's really you."
    );
  });

  it('handles a single category', () => {
    expect(buildPlainSummary([malware], en)).toBe("We noticed something unusual on this device. Let's make sure it's really you.");
  });

  it('joins three categories with a comma before the final "and"', () => {
    expect(buildPlainSummary([profile, limit, malware], en)).toBe(
      "This account looks unfamiliar, the amount is higher than usual and we noticed something unusual on this device. Let's make sure it's really you."
    );
  });

  it('returns an empty string when nothing fired', () => {
    expect(buildPlainSummary([], en)).toBe('');
  });
});
