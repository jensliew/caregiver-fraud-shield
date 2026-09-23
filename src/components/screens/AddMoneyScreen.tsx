import { useState, type FormEvent } from 'react';
import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { BANK_OPTIONS } from '../../lib/mockAccount';

const NONE_VALUE = '';

export function AddMoneyScreen() {
  const { addFunds, setScreen, fundingSources, selectedFundingSourceId, setSelectedFundingSourceId } = useAppState();
  const t = useT();
  const [amount, setAmount] = useState('');
  // A one-time source, typed in here rather than saved as a favourite —
  // distinct from "+ Add new account" below, which does save one.
  const [oneTimeBank, setOneTimeBank] = useState(BANK_OPTIONS[0]);
  const [oneTimeAccountNumber, setOneTimeAccountNumber] = useState('');

  const isNoneSelected = selectedFundingSourceId === NONE_VALUE;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return;
    if (isNoneSelected && !oneTimeAccountNumber.trim()) return;
    addFunds(value);
    setScreen('addMoneyDone');
  }

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="home" />
        <h1 className="text-xl font-bold text-balance">{t('addMoneyScreenTitle')}</h1>
      </ScreenHeaderTint>

      {/* Same pattern as "Increase transfer limit" on Pay & Transfer: a
          link to a dedicated screen, not a popup. Only this path actually
          saves a favourite — "None" below is for a one-time source only. */}
      <button
        type="button"
        onClick={() => setScreen('addFavourite')}
        className="self-start flex items-center gap-2 min-h-tap text-sm font-bold text-accent"
      >
        <Icon name="bank" size={18} />
        {t('addNewAccountOption')}
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('addMoneyAmountLabel')}</span>
          <input
            type="number"
            required
            min="1"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('addMoneySourceLabel')}</span>
          <select
            value={selectedFundingSourceId}
            onChange={(e) => setSelectedFundingSourceId(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          >
            <option value={NONE_VALUE}>{t('favouriteNoneOption')}</option>
            {fundingSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.bank} {source.accountNumber}
              </option>
            ))}
          </select>
        </label>

        {/* Only "None" ever needs these — a chosen favourite already has
            both, and a saved-favourite path never reaches this form at all. */}
        {isNoneSelected && (
          <>
            <label className="flex flex-col gap-2 font-bold mb-4">
              <span>{t('bankLabel')}</span>
              <select
                value={oneTimeBank}
                onChange={(e) => setOneTimeBank(e.target.value)}
                className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
              >
                {BANK_OPTIONS.map((bank) => (
                  <option key={bank} value={bank}>
                    {bank}
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
                value={oneTimeAccountNumber}
                onChange={(e) => setOneTimeAccountNumber(e.target.value)}
                className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
              />
            </label>
          </>
        )}

        <Button type="submit">{t('addMoneyConfirmButton')}</Button>
      </form>
    </ScreenShell>
  );
}
