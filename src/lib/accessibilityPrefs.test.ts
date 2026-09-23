import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_ACCESSIBILITY_PREFS, loadAccessibilityPrefs, saveAccessibilityPrefs } from './accessibilityPrefs';

describe('accessibilityPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns the defaults when nothing has been saved', () => {
    expect(loadAccessibilityPrefs()).toEqual(DEFAULT_ACCESSIBILITY_PREFS);
  });

  it('round-trips a saved value', () => {
    saveAccessibilityPrefs({ fontScale: 'extraLarge', bold: true, textBorder: true, eyeProtection: true });
    expect(loadAccessibilityPrefs()).toEqual({ fontScale: 'extraLarge', bold: true, textBorder: true, eyeProtection: true });
  });

  it('falls back to defaults on corrupted storage rather than throwing', () => {
    localStorage.setItem('silver-guard:accessibility-prefs', '{not valid json');
    expect(loadAccessibilityPrefs()).toEqual(DEFAULT_ACCESSIBILITY_PREFS);
  });
});
