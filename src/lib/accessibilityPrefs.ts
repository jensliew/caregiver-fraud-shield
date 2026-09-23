/**
 * Device-level display preferences — same honest scope as pinAuth.ts /
 * faceEnrollment.ts: plain localStorage, not account data, so it doesn't
 * follow the user to another device. Pure read/write + a safe default,
 * fully unit-testable without touching the DOM (applying these to the
 * page is AppStateContext's job, not this module's).
 */
export type FontScale = 'normal' | 'large' | 'extraLarge';

export interface AccessibilityPrefs {
  fontScale: FontScale;
  bold: boolean;
  textBorder: boolean;
  eyeProtection: boolean;
}

const STORAGE_KEY = 'silver-guard:accessibility-prefs';

export const DEFAULT_ACCESSIBILITY_PREFS: AccessibilityPrefs = {
  fontScale: 'normal',
  bold: false,
  textBorder: false,
  eyeProtection: false,
};

export const FONT_SCALE_PERCENT: Record<FontScale, string> = {
  normal: '100%',
  large: '115%',
  extraLarge: '130%',
};

export function loadAccessibilityPrefs(): AccessibilityPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY_PREFS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_ACCESSIBILITY_PREFS, ...parsed };
  } catch {
    return DEFAULT_ACCESSIBILITY_PREFS;
  }
}

export function saveAccessibilityPrefs(prefs: AccessibilityPrefs): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
