import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { CategoryBadges } from '../CategoryBadges';
import { IdentityCheckStep } from './IdentityCheckStep';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { buildPlainSummary } from '../../lib/categoryPresentation';
import { sendCaregiverEmailAlert, pollCaregiverDecision } from '../../lib/emailNotify';
import { buildCaregiverEmailBody, buildCaregiverEmailFields, buildCaregiverEmailSubject } from '../../lib/caregiverEmail';
import { money } from '../../lib/format';
import { BANK_OPTIONS } from '../../lib/mockAccount';
import type { DemoControls } from '../../lib/types';

const NONE_PAYEE = '';

const DEMO_TOGGLES: { key: keyof DemoControls; label: string }[] = [
  { key: 'remoteAccessActive', label: 'Remote-access app active (AnyDesk/TeamViewer)' },
  { key: 'sideloadedAppDetected', label: 'Sideloaded app detected (outside app store)' },
  { key: 'securityAppUninstalled', label: 'Security app (Singpass/ScamShield) uninstalled' },
  { key: 'multipleHighAmountTransactions', label: 'Multiple high-amount transactions to this recipient' },
  { key: 'highReportRate', label: 'Recipient has a high report rate from other users' },
  { key: 'limitIncreaseRequest', label: 'Sudden limit-increase request' },
];

export function PayScreen() {
  const { demoControls, setDemoControl, submitTransfer, setScreen, payTransferLocked, payees, selectedPayeeId, setSelectedPayeeId } = useAppState();
  const t = useT();
  const [payee, setPayee] = useState('');
  const [bank, setBank] = useState(BANK_OPTIONS[0]);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');

  const isNoneSelected = selectedPayeeId === NONE_PAYEE;
  const selectedPayee = payees.find((p) => p.id === selectedPayeeId);
  // A saved payee is the source of truth once picked — the free-text/bank/
  // account fields below just display it (disabled), never edit it.
  const displayName = isNoneSelected ? payee : (selectedPayee?.name ?? '');
  const displayBank = isNoneSelected ? bank : (selectedPayee?.bank ?? '');
  const displayAccountNumber = isNoneSelected ? accountNumber : (selectedPayee?.accountNumber ?? '');
  // How many demo signals are currently on — shown as a badge on the
  // collapsed dropdown so its state is visible without expanding it.
  const activeToggleCount = DEMO_TOGGLES.filter(({ key }) => demoControls[key]).length;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isNoneSelected && !accountNumber.trim()) return;
    submitTransfer(displayName.trim(), parseFloat(amount));
  }

  if (payTransferLocked) {
    return <PayLockedView />;
  }

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="home" />
        <h1 className="text-xl font-bold text-balance">{t('tilePay')}</h1>
      </ScreenHeaderTint>

      <button
        type="button"
        onClick={() => setScreen('increaseLimit')}
        className="self-start flex items-center gap-2 min-h-tap text-sm font-bold text-accent"
      >
        <Icon name="trendUp" size={18} />
        {t('increaseLimitLink')}
      </button>

      {/* Same pattern as Add Money's "+ Add new account": a link to a
          dedicated screen, not a popup. Only this path saves a payee for
          reuse — "None" below is for a one-time/manual payee only. */}
      <button
        type="button"
        onClick={() => setScreen('addPayee')}
        className="self-start flex items-center gap-2 min-h-tap text-sm font-bold text-accent"
      >
        <Icon name="bank" size={18} />
        {t('addNewPayeeOption')}
      </button>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('payeeSourceLabel')}</span>
          <select
            value={selectedPayeeId}
            onChange={(e) => setSelectedPayeeId(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          >
            <option value={NONE_PAYEE}>{t('favouriteNoneOption')}</option>
            {payees.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.bank} {p.accountNumber}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('payeeLabel')}</span>
          <input
            type="text"
            required
            disabled={!isNoneSelected}
            placeholder="e.g. Jane Tan"
            value={displayName}
            onChange={(e) => setPayee(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none disabled:bg-bg disabled:text-ink-muted"
          />
        </label>
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('bankLabel')}</span>
          {isNoneSelected ? (
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
          ) : (
            <input
              type="text"
              disabled
              value={displayBank}
              className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap disabled:bg-bg disabled:text-ink-muted"
            />
          )}
        </label>
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('accountNumberLabel')}</span>
          <input
            type="text"
            required
            disabled={!isNoneSelected}
            inputMode="numeric"
            placeholder={t('accountNumberPlaceholder')}
            value={displayAccountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none disabled:bg-bg disabled:text-ink-muted"
          />
        </label>
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('amountLabel')}</span>
          <input
            type="number"
            required
            min="0"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          />
        </label>

        <details className="border border-dashed border-border rounded-xl px-4 py-2 mb-4 group">
          <summary className="cursor-pointer list-none flex items-center justify-between gap-2 min-h-tap text-xs text-ink-muted [&::-webkit-details-marker]:hidden">
            <span>
              {t('demoControlsTitle')}
              {activeToggleCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-accent-soft text-accent font-bold">
                  {activeToggleCount}
                </span>
              )}
            </span>
            <Icon name="arrowLeft" size={16} className="-rotate-90 transition-transform group-open:rotate-90" />
          </summary>
          <div className="pt-1 pb-2">
            {DEMO_TOGGLES.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 py-2 text-sm min-h-tap">
                <input
                  type="checkbox"
                  checked={demoControls[key]}
                  onChange={(e) => setDemoControl(key, e.target.checked)}
                  className="w-7 h-7 accent-accent shrink-0"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </details>

        <Button type="submit">{t('sendButton')}</Button>
      </form>
    </ScreenShell>
  );
}

type EmailStatus = 'idle' | 'sending' | 'sent' | 'error';
type LockStep = 'warning' | 'verify' | 'notified';

/**
 * Shown instead of the Pay & Transfer form whenever `payTransferLocked` is
 * true — the whole feature is on hold, not just one transaction. One idea
 * per page (warning → identity check → caregiver notice), same discipline
 * as AlertScreen, not a stacked scrolling card. Two different tiers share
 * this view (see AppStateContext.submitTransfer):
 *   - compound signal (recent limit increase + suspicious recipient) —
 *     caregiver approve/decline resolves it.
 *   - malware alone — more severe: the caregiver notice is informational
 *     only (no approve/decline path at all), and only a Fraud-Ops reviewer
 *     can unlock it. `isMalwareLock` is derived from the decision already
 *     on `currentTransfer`, not separate state.
 * Either way, the identity check on page 2 is never a gate — see
 * IdentityCheckStep — it's logged for the record, not a way to self-clear.
 */
function PayLockedView() {
  const { currentTransfer, caregiverRequest, setScreen, logCaregiverEmail, caregiverDecide, unblockPayTransfer } = useAppState();
  const t = useT();
  const [step, setStep] = useState<LockStep>('warning');
  const [emailStatus, setEmailStatus] = useState<EmailStatus>('idle');
  // Set once the email is sent and we start polling for the caregiver's
  // Approve/Reject click; drives the "waiting for decision" UI below.
  const [awaitingDecision, setAwaitingDecision] = useState(false);
  const pollAbort = useRef<AbortController | null>(null);

  const isMalwareLock = currentTransfer?.decision.categories.some((c) => c.id === 'malware') ?? false;
  // Both lock tiers carry a token now: the compound-signal lock for
  // Approve/Reject, the malware lock for Unblock (or Call hotline).
  const decisionToken = currentTransfer?.decisionToken;

  // Stop polling if this view unmounts (e.g. the transfer resolves and the
  // lock clears), so no stray timers or state updates linger.
  useEffect(() => () => pollAbort.current?.abort(), []);

  async function handleSendEmail() {
    if (!caregiverRequest) return;
    setEmailStatus('sending');
    // Resend of the same detailed fraud report the app already auto-sends on
    // lock — built from the live transfer so the manual resend matches. This
    // view is only ever a locked case: malware (blocked notice) or a
    // suspicious/compound lock (approval required) — never informational.
    const subject = buildCaregiverEmailSubject(isMalwareLock ? 'malware' : 'approval');
    const body = currentTransfer ? buildCaregiverEmailBody(currentTransfer, { locked: true }) : caregiverRequest.body;
    const fields = currentTransfer ? buildCaregiverEmailFields(currentTransfer) : undefined;
    const result = await sendCaregiverEmailAlert({
      subject,
      body,
      fields,
      token: decisionToken ?? '',
      kind: isMalwareLock ? 'malware' : undefined,
    });
    setEmailStatus(result.ok ? 'sent' : 'error');
    if (result.ok && currentTransfer?.incidentId != null) {
      logCaregiverEmail(currentTransfer.incidentId, subject, body);
    }

    // The caregiver acts straight from the email; poll for their decision
    // and apply it. Malware block → Unblock lifts the block. Compound-signal
    // lock → Approve/Reject runs the same path as the in-app phone mock.
    if (result.ok && decisionToken) {
      setAwaitingDecision(true);
      pollAbort.current?.abort();
      const controller = new AbortController();
      pollAbort.current = controller;
      const decision = await pollCaregiverDecision(decisionToken, { signal: controller.signal });
      if (controller.signal.aborted) return;
      setAwaitingDecision(false);
      if (decision === 'unblocked') unblockPayTransfer();
      else if (decision === 'approved') caregiverDecide(true);
      else if (decision === 'rejected') caregiverDecide(false);
    }
  }

  if (step === 'verify') {
    return <IdentityCheckStep incidentId={currentTransfer?.incidentId ?? null} onContinue={() => setStep('notified')} />;
  }

  if (step === 'notified') {
    return (
      <ScreenShell>
        <ScreenHeaderTint>
          <h1 className="flex items-center gap-2 text-xl font-bold text-balance">
            <Icon name="lock" size={24} />
            {t('payLockedTitle')}
          </h1>
        </ScreenHeaderTint>

        <div className="bg-success-soft border border-success rounded-2xl p-4 flex flex-col gap-3">
          <strong className="flex items-center gap-2 text-success text-base font-bold">
            <Icon name="users" size={22} />
            {t('caregiverNotifiedTitle')}
          </strong>
          <p>{isMalwareLock ? t('malwareCaregiverInfoBody') : t('caregiverNotifiedBody')}</p>

          <Button variant="secondary" onClick={handleSendEmail} disabled={emailStatus === 'sending'}>
            <Icon name="mail" size={20} />
            {t('sendEmailAlertButton')}
          </Button>
          {emailStatus === 'sending' && <p className="text-sm text-ink-muted">{t('emailSendingStatus')}</p>}
          {emailStatus === 'sent' && <p className="text-sm text-success font-bold">{t('emailSentStatus')}</p>}
          {emailStatus === 'error' && <p className="text-sm text-accent font-bold">{t('emailFailedStatus')}</p>}
          {awaitingDecision && <p className="text-sm text-ink-muted">{t('awaitingCaregiverDecision')}</p>}
        </div>

        {isMalwareLock && (
          <div className="bg-warn-soft border border-warn rounded-2xl p-4">
            <p className="text-sm">{t('malwareOpsNoticeBody')}</p>
          </div>
        )}

        <Button variant="neutral" onClick={() => setScreen('home')}>
          {t('homeButton')}
        </Button>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="home" />
        <h1 className="flex items-center gap-2 text-xl font-bold text-balance">
          <Icon name="lock" size={24} />
          {t('payLockedTitle')}
        </h1>
      </ScreenHeaderTint>

      <div className="bg-warn-soft border border-warn rounded-2xl p-5">
        <p className="text-base mb-2">{t(isMalwareLock ? 'malwareLockedBody' : 'payLockedBody')}</p>
        {currentTransfer && (
          <>
            <p className="mb-1">{buildPlainSummary(currentTransfer.decision.categories, t)}</p>
            <CategoryBadges categories={currentTransfer.decision.categories} />
            <p className="font-bold tabular-nums">
              {currentTransfer.subject} · {money(currentTransfer.amount)}
            </p>
          </>
        )}
      </div>

      <Button onClick={() => setStep('verify')}>{t('continueButton')}</Button>
    </ScreenShell>
  );
}
