import { OutcomeLayout } from './OutcomeLayout';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import type { IconName } from '../icons/Icon';

const OUTCOME_ICON: Record<string, IconName> = { approved: 'checkCircle', blocked: 'xCircle', 'pending-review': 'clock' };
const OUTCOME_TONE: Record<string, 'success' | 'danger' | 'warn'> = { approved: 'success', blocked: 'danger', 'pending-review': 'warn' };

export function OutcomeScreen() {
  const { outcomeStatus, setScreen } = useAppState();
  const t = useT();
  const status = outcomeStatus ?? 'approved';

  const titleKey = status === 'approved' ? 'outcomeApprovedTitle' : status === 'blocked' ? 'outcomeBlockedTitle' : 'outcomePendingTitle';

  return (
    <OutcomeLayout icon={OUTCOME_ICON[status]} tone={OUTCOME_TONE[status]} title={t(titleKey)} onHome={() => setScreen('home')} homeLabel={t('homeButton')}>
      {status === 'pending-review' && <p>{t('outcomePendingBody')}</p>}
    </OutcomeLayout>
  );
}
