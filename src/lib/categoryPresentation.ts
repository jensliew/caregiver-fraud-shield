import type { StringKey } from '../i18n/strings';
import type { Category, CategoryId } from './types';
import type { IconName } from '../components/icons/Icon';

export const CATEGORY_ICON: Record<CategoryId, IconName> = {
  'limit-increase': 'trendUp',
  malware: 'shieldAlert',
  'suspicious-profile': 'flag',
};

export const CATEGORY_LABEL_KEY: Record<CategoryId, StringKey> = {
  'limit-increase': 'categoryLimitIncrease',
  malware: 'categoryMalware',
  'suspicious-profile': 'categorySuspiciousProfile',
};

const SUMMARY_CLAUSE_KEY: Record<CategoryId, StringKey> = {
  'suspicious-profile': 'summaryProfile',
  'limit-increase': 'summaryLimit',
  malware: 'summaryMalware',
};

const SUMMARY_ORDER: CategoryId[] = ['suspicious-profile', 'limit-increase', 'malware'];

/**
 * Builds the plain-language sentence from whichever categories fired, e.g.
 * "This account looks unfamiliar and the amount is higher than usual.
 * Let's make sure it's really you." Detailed reasons are shown separately
 * for the specificity NFR8 asks for; this sentence is the warm framing.
 */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function buildPlainSummary(categories: Category[], t: (key: StringKey) => string): string {
  const present = SUMMARY_ORDER.filter((id) => categories.some((c) => c.id === id));
  const clauses = present.map((id) => t(SUMMARY_CLAUSE_KEY[id]));
  if (clauses.length === 0) return '';
  const joined = clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join(', ')} ${t('summaryConnector')} ${clauses[clauses.length - 1]}`;
  return `${capitalize(joined)}. ${capitalize(t('summaryClosing'))}`;
}
