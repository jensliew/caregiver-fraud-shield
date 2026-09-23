import { useState, type FormEvent } from 'react';
import { ScreenShell } from '../layout/ScreenShell';
import { ScreenHeaderTint } from '../layout/ScreenHeaderTint';
import { BackLink } from '../layout/BackLink';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { FaceScanCapture } from '../FaceScanCapture';
import { OutcomeLayout } from './OutcomeLayout';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { money } from '../../lib/format';
import { LIMIT_OPTIONS } from '../../lib/mockAccount';
import { getEnrolledDescriptor } from '../../lib/faceEnrollment';
import type { VerifyResult } from '../../hooks/useFaceDetection';

// Below this, a limit change applies instantly with no fraud step at all.
// At or above it, it must pass biometric verification first — purely
// informational for the caregiver, never blocking, never a human-review case.
const VERIFY_THRESHOLD = 10000;
const MAX_ATTEMPTS = 3;

// A local wizard, not new global Screen entries — nothing outside this
// screen ever needs to jump directly into one of these sub-steps.
type Step = 'form' | 'updated' | 'verify' | 'verified' | 'notified' | 'failed';

export function IncreaseLimitScreen() {
  const { transferLimit, applyLimitDirectly, logLimitIncreaseAttempt, resolveLimitIncreaseAttempt, setScreen } = useAppState();
  const t = useT();
  const enrolledDescriptor = getEnrolledDescriptor();

  const [step, setStep] = useState<Step>('form');
  const [selectedLimit, setSelectedLimit] = useState(String(LIMIT_OPTIONS[0]));
  const [pendingLimit, setPendingLimit] = useState<number | null>(null);
  const [incidentId, setIncidentId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);

  function resetToForm() {
    setStep('form');
    setPendingLimit(null);
    setIncidentId(null);
    setAttempts(0);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(selectedLimit);
    if (!value) return;

    if (value < VERIFY_THRESHOLD) {
      applyLimitDirectly(value);
      setStep('updated');
      return;
    }

    setPendingLimit(value);
    setIncidentId(logLimitIncreaseAttempt(value));
    setAttempts(0);
    setStep('verify');
  }

  function handleVerifyResult(result: VerifyResult) {
    if (result.success) {
      if (incidentId != null) resolveLimitIncreaseAttempt(incidentId, 'resumed');
      setStep('verified');
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    if (nextAttempts >= MAX_ATTEMPTS) {
      if (incidentId != null) resolveLimitIncreaseAttempt(incidentId, 'blocked');
      setStep('failed');
    }
  }

  if (step === 'updated') {
    return (
      <OutcomeLayout icon="checkCircle" tone="success" title={t('limitUpdatedTitle')} onHome={() => setScreen('home')} homeLabel={t('homeButton')}>
        <p className="tabular-nums font-bold">{money(transferLimit)}</p>
      </OutcomeLayout>
    );
  }

  if (step === 'verified') {
    return (
      <OutcomeLayout icon="checkCircle" tone="success" title={t('limitVerifiedTitle')} onHome={() => setStep('notified')} homeLabel={t('continueButton')} />
    );
  }

  if (step === 'notified') {
    return (
      <OutcomeLayout icon="users" tone="success" title={t('caregiverNotifiedTitle')} onHome={() => setScreen('home')} homeLabel={t('homeButton')}>
        <p>{t('limitNotifiedInfoBody')}</p>
        {pendingLimit != null && <p className="tabular-nums font-bold">{money(pendingLimit)}</p>}
      </OutcomeLayout>
    );
  }

  if (step === 'failed') {
    return (
      <OutcomeLayout icon="xCircle" tone="danger" title={t('limitVerifyFailedTitle')} onHome={resetToForm} homeLabel={t('backToFormButton')}>
        <p>{t('limitVerifyFailedBody')}</p>
      </OutcomeLayout>
    );
  }

  if (step === 'verify') {
    const attemptsLeft = MAX_ATTEMPTS - attempts;
    return (
      <ScreenShell>
        <ScreenHeaderTint>
          <h1 className="flex items-center gap-2 text-xl font-bold text-balance">
            <Icon name="camera" size={24} />
            {t('challengeTitle')}
          </h1>
        </ScreenHeaderTint>

        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
          <p>{t('challengeInstruction')}</p>

          {enrolledDescriptor ? (
            <FaceScanCapture
              mode="verify"
              scanLabel={t('scanButton')}
              scanIcon="camera"
              enrolledDescriptor={enrolledDescriptor}
              onResult={handleVerifyResult}
            />
          ) : (
            <p className="text-sm text-warn">Face ID isn't set up on this device yet.</p>
          )}

          {attempts > 0 && attempts < MAX_ATTEMPTS && (
            <p className="text-sm text-warn font-bold">
              {t('attemptsRemainingLabel')}: {attemptsLeft}
            </p>
          )}

          <details className="mt-1">
            <summary className="cursor-pointer list-none marker:content-none text-xs text-ink-muted min-h-tap flex items-center [&::-webkit-details-marker]:hidden">
              Presenter tools
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => handleVerifyResult({ success: true, reason: 'live' })}>
                {t('simulateVerifiedButton')}
              </Button>
              <Button variant="neutral" onClick={() => handleVerifyResult({ success: false, reason: 'no-match' })}>
                Simulate Failed (demo)
              </Button>
            </div>
          </details>
        </div>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell>
      <ScreenHeaderTint>
        <BackLink to="pay" />
        <h1 className="text-xl font-bold text-balance">{t('increaseLimitTitle')}</h1>
      </ScreenHeaderTint>

      <div className="flex flex-col gap-1 mb-4 font-bold">
        <span>{t('currentLimitLabel')}</span>
        <strong className="text-lg tabular-nums">{money(transferLimit)}</strong>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <label className="flex flex-col gap-2 font-bold mb-4">
          <span>{t('newLimitLabel')}</span>
          <select
            value={selectedLimit}
            onChange={(e) => setSelectedLimit(e.target.value)}
            className="font-sans text-base px-4 py-3 rounded-xl border-2 border-border min-h-tap focus:border-accent focus:outline-none"
          >
            {LIMIT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {money(option)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">{t('increaseLimitButton')}</Button>
      </form>
    </ScreenShell>
  );
}
