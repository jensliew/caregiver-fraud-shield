import { OutcomeLayout } from './OutcomeLayout';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { money } from '../../lib/format';

export function AddMoneyDoneScreen() {
  const { balance, setScreen } = useAppState();
  const t = useT();

  return (
    <OutcomeLayout icon="checkCircle" tone="success" title={t('addMoneySuccessTitle')} onHome={() => setScreen('home')} homeLabel={t('homeButton')}>
      <p>
        {t('newBalanceLabel')}: <strong>{money(balance)}</strong>
      </p>
    </OutcomeLayout>
  );
}
