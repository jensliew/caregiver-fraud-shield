import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import type { FontScale } from '../../lib/accessibilityPrefs';

const FONT_SCALE_OPTIONS: FontScale[] = ['normal', 'large', 'extraLarge'];
const FONT_SCALE_LABEL_KEY: Record<FontScale, 'fontSizeNormalOption' | 'fontSizeLargeOption' | 'fontSizeExtraLargeOption'> = {
  normal: 'fontSizeNormalOption',
  large: 'fontSizeLargeOption',
  extraLarge: 'fontSizeExtraLargeOption',
};

/**
 * Reachable from the gear icon in AppHeader on every screen, not just
 * Home — someone struggling to read text needs to be able to fix it from
 * wherever they are, not navigate Home first. No single "came from"
 * screen to return to (this app has no navigation history stack), so
 * Back always goes to Home, same as every other global/utility screen.
 */
export function AccessibilitySettingsScreen() {
  const { accessibilityPrefs, setAccessibilityPref } = useAppState();
  const t = useT();

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="home" />
        <h1 className="text-xl font-bold text-balance">{t('accessibilityScreenTitle')}</h1>
      </ScreenHeaderTint>

      <div className="bg-surface border border-border rounded-2xl p-4">
        <p className="text-lg">{t('previewSampleText')}</p>
      </div>

      <label className="flex flex-col gap-2 font-bold mb-2">
        <span>{t('fontSizeLabel')}</span>
        <select
          value={accessibilityPrefs.fontScale}
          onChange={(e) => setAccessibilityPref('fontScale', e.target.value as FontScale)}
          className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
        >
          {FONT_SCALE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {t(FONT_SCALE_LABEL_KEY[option])}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-3 py-2 text-base min-h-tap">
        <input
          type="checkbox"
          checked={accessibilityPrefs.bold}
          onChange={(e) => setAccessibilityPref('bold', e.target.checked)}
          className="w-7 h-7 accent-accent shrink-0"
        />
        <span>{t('boldTextLabel')}</span>
      </label>

      <label className="flex items-center gap-3 py-2 text-base min-h-tap">
        <input
          type="checkbox"
          checked={accessibilityPrefs.textBorder}
          onChange={(e) => setAccessibilityPref('textBorder', e.target.checked)}
          className="w-7 h-7 accent-accent shrink-0"
        />
        <span>{t('textBorderLabel')}</span>
      </label>

      <label className="flex items-start gap-3 py-2 text-base min-h-tap">
        <input
          type="checkbox"
          checked={accessibilityPrefs.eyeProtection}
          onChange={(e) => setAccessibilityPref('eyeProtection', e.target.checked)}
          className="w-7 h-7 accent-accent shrink-0 mt-1"
        />
        <span className="flex flex-col">
          {t('eyeProtectionLabel')}
          <span className="text-sm text-ink-muted font-normal">{t('eyeProtectionDescription')}</span>
        </span>
      </label>
    </ScreenShell>
  );
}
