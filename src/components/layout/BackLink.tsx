import { Icon } from '../icons/Icon';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import type { Screen } from '../../lib/types';

export function BackLink({ to }: { to: Screen }) {
  const { setScreen } = useAppState();
  const t = useT();

  return (
    <button
      type="button"
      onClick={() => setScreen(to)}
      className="self-start inline-flex items-center gap-2 min-h-tap py-1 text-sm font-bold text-accent"
    >
      <Icon name="arrowLeft" size={20} />
      {t('backButton')}
    </button>
  );
}
