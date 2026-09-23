import { Icon } from '../icons/Icon';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import type { Lang } from '../../lib/types';

export function AppHeader() {
  const { lang, setLang, setScreen } = useAppState();
  const t = useT();

  return (
    <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
      <div className="flex items-center gap-2 text-lg font-extrabold text-accent">
        <Icon name="shield" size={26} />
        {t('appTitle')}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setScreen('accessibility')}
          aria-label={t('accessibilitySettingsLink')}
          className="min-h-tap min-w-tap flex items-center justify-center text-ink-muted"
        >
          <Icon name="settings" size={24} />
        </button>
        <label className="flex items-center gap-2 text-xs text-ink-muted">
          {t('langLabel')}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className="font-sans text-sm px-3 py-2 rounded-lg border border-border bg-surface text-ink min-h-[40px]"
          >
            <option value="en">EN</option>
            <option value="ms">BM</option>
            <option value="zh">中文</option>
            <option value="ta">தமிழ்</option>
          </select>
        </label>
      </div>
    </header>
  );
}
