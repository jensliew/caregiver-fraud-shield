import { useState } from 'react';
import { Icon, type IconName } from '../icons/Icon';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { maskedMoney, money } from '../../lib/format';
import type { StringKey } from '../../i18n/strings';
import type { Screen } from '../../lib/types';

interface TileDef {
  icon: IconName;
  labelKey: StringKey;
  screen: Screen;
  iconBg: string;
  iconColor: string;
}

const TILES: TileDef[] = [
  { icon: 'wallet', labelKey: 'tileBalance', screen: 'balance', iconBg: 'bg-tile-balance-soft', iconColor: 'text-tile-balance' },
  { icon: 'plusCircle', labelKey: 'tileAddMoney', screen: 'addMoney', iconBg: 'bg-tile-add-soft', iconColor: 'text-tile-add' },
  { icon: 'send', labelKey: 'tilePay', screen: 'pay', iconBg: 'bg-tile-pay-soft', iconColor: 'text-tile-pay' },
  { icon: 'headset', labelKey: 'tileGetHelp', screen: 'getHelp', iconBg: 'bg-tile-help-soft', iconColor: 'text-tile-help' },
];

export function HomeScreen() {
  const { balance, setScreen, signOut } = useAppState();
  const t = useT();
  const [masked, setMasked] = useState(true); // hidden by default — a senior tapping in public shouldn't need to opt into privacy

  return (
    <section className="flex-1 flex flex-col gap-5 p-5">
      {/* Tinted header: greeting + balance + brand swoosh, overlapped by a
          floating white card of quick actions — the OCBC app's own
          structural pattern. The swoosh is a small corner accent (not a
          dominant shape) and the greeting gets explicit left padding, both
          learned the hard way: an earlier, bolder version overlapped the
          balance figure and peeked out from under the card's corner. */}
      <div className="-mx-5 -mt-5 px-5 pt-6 pb-8 relative overflow-hidden bg-gradient-to-b from-header-tint-from to-bg">
        <div className="absolute rounded-full bg-accent opacity-90" style={{ top: -15, left: -110, width: 150, height: 150 }} aria-hidden="true" />
        <div className="relative z-10 flex flex-col gap-1 pl-7">
          <span className="text-lg font-extrabold text-ink">{t('greetingText')}</span>
          <span className="text-sm text-ink-muted mt-3">{t('balanceLabel')}</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-accent">{masked ? maskedMoney() : money(balance)}</span>
            <button
              type="button"
              onClick={() => setMasked((prev) => !prev)}
              aria-label={masked ? t('showBalanceLabel') : t('hideBalanceLabel')}
              className="min-h-tap min-w-tap flex items-center justify-center text-ink-muted"
            >
              <Icon name={masked ? 'eyeOff' : 'eye'} size={22} />
            </button>
          </div>
        </div>
      </div>

      <div className="relative z-20 -mt-8 bg-surface rounded-3xl shadow-lg p-4 grid grid-cols-2 gap-4">
        {TILES.map((tile) => (
          <button
            key={tile.screen}
            type="button"
            onClick={() => setScreen(tile.screen)}
            className="flex flex-col items-center justify-center gap-3 min-h-[112px] min-w-tap p-4 text-center font-sans text-lg font-bold text-ink active:scale-[0.96]"
          >
            <span className={`w-14 h-14 rounded-full flex items-center justify-center ${tile.iconBg} ${tile.iconColor}`}>
              <Icon name={tile.icon} size={28} />
            </span>
            {t(tile.labelKey)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setScreen('review')}
        className="flex items-center justify-center gap-2 min-h-tap text-xs text-ink-muted"
      >
        <Icon name="clipboard" size={18} />
        {t('reviewConsoleLink')}
      </button>

      <button
        type="button"
        onClick={signOut}
        className="flex items-center justify-center gap-2 min-h-tap text-sm font-bold text-accent"
      >
        <Icon name="logout" size={20} />
        {t('logoutButton')}
      </button>
    </section>
  );
}
