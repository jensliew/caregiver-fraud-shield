import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { initials, money } from '../../lib/format';

export function BalanceScreen() {
  const { balance, recentActivity } = useAppState();
  const t = useT();

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="home" />
        <h1 className="text-xl font-bold text-balance">{t('balanceScreenTitle')}</h1>
      </ScreenHeaderTint>

      <div className="bg-accent text-white rounded-2xl p-6 shadow-md flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide opacity-85">{t('balanceLabel')}</span>
        <span className="text-2xl font-bold tabular-nums">{money(balance)}</span>
      </div>

      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-muted">{t('recentActivityHeading')}</h2>
      <ul className="flex flex-col">
        {recentActivity.map((item, i) => (
          <li key={i} className="flex items-center justify-between gap-3 py-4 border-b border-border last:border-none">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-full flex items-center justify-center bg-ink text-white font-extrabold text-sm shrink-0">
                {initials(item.label)}
              </span>
              <div className="flex flex-col">
                <span className="font-bold text-base">{item.label}</span>
                <span className="text-xs text-ink-muted">{item.date}</span>
              </div>
            </div>
            <span className={`font-bold tabular-nums text-base ${item.amount < 0 ? 'text-ink' : 'text-success'}`}>{money(item.amount)}</span>
          </li>
        ))}
      </ul>
    </ScreenShell>
  );
}
