import { useState, type FormEvent } from 'react';
import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { Button } from '../Button';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { BANK_OPTIONS } from '../../lib/mockAccount';

/**
 * Same pattern as IncreaseLimitScreen and AddFavouriteScreen: a dedicated
 * single-purpose screen reached via a link on the screen it belongs to
 * (Pay & Transfer), not a modal. Only needed for a not-yet-saved payee —
 * an existing saved payee never routes through here.
 */
export function AddPayeeScreen() {
  const { addPayee, setSelectedPayeeId, setScreen } = useAppState();
  const t = useT();
  const [name, setName] = useState('');
  const [bank, setBank] = useState(BANK_OPTIONS[0]);
  const [accountNumber, setAccountNumber] = useState('');

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !accountNumber.trim()) return;
    const id = addPayee({ name: name.trim(), bank, accountNumber: accountNumber.trim() });
    setSelectedPayeeId(id);
    setScreen('pay');
  }

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="pay" />
        <h1 className="text-xl font-bold text-balance">{t('addPayeeScreenTitle')}</h1>
      </ScreenHeaderTint>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('payeeNameLabel')}</span>
          <input
            type="text"
            required
            placeholder="e.g. Jane Tan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          />
        </label>
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
