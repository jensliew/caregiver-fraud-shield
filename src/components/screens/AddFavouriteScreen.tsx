import { useState, type FormEvent } from 'react';
import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { Button } from '../Button';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { BANK_OPTIONS } from '../../lib/mockAccount';

/**
 * Same pattern as IncreaseLimitScreen: a dedicated single-purpose screen
 * reached via a link on the screen it belongs to (Add Money), not a modal.
 * Only needed for a one-time/not-yet-saved source — an existing favourite
 * never routes through here, so it never needs Bank/Account Number at all.
 */
export function AddFavouriteScreen() {
  const { addFundingSource, setSelectedFundingSourceId, setScreen } = useAppState();
  const t = useT();
  const [bank, setBank] = useState(BANK_OPTIONS[0]);
  const [accountNumber, setAccountNumber] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accountNumber.trim()) return;
    const id = addFundingSource({ bank, accountNumber: accountNumber.trim() });
    setSelectedFundingSourceId(id);
    setScreen('addMoney');
  }

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="addMoney" />
        <h1 className="text-xl font-bold text-balance">{t('addFavouriteScreenTitle')}</h1>
      </ScreenHeaderTint>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('bankLabel')}</span>
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          >
            {BANK_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('accountNumberLabel')}</span>
          <input
            type="text"
            required
            inputMode="numeric"
            placeholder={t('accountNumberPlaceholder')}
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          />
        </label>
        <Button type="submit">{t('saveAndUseButton')}</Button>
      </form>
    </ScreenShell>
  );
}
