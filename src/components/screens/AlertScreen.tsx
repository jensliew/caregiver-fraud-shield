import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Button } from '../Button';
import { CategoryBadges } from '../CategoryBadges';
import { IdentityCheckStep } from './IdentityCheckStep';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { buildPlainSummary } from '../../lib/categoryPresentation';
import { money } from '../../lib/format';

type Step = 'warning' | 'verify' | 'caregiverNotified';

/**
 * The single-transaction fraud pause — elder-facing, so it's one idea per
 * page with an explicit acknowledge button, not a stacked scrolling card.
 * The identity check on page 2 is never a gate (see IdentityCheckStep) —
 * resolution is always the caregiver (notified by email via SES), nothing
 * for the customer to pass or fail their way through. Per
 * requirements.md's "Parallel/escalation" framing, the incident is already
 * logged for the fraud team the moment this pause fires (see
 * AppStateContext's runFlow onLog), in parallel with the caregiver notice.
 */
export function AlertScreen() {
  const { currentTransfer, setScreen } = useAppState();
  const t = useT();
  const [step, setStep] = useState<Step>('warning');

  if (!currentTransfer) return null;
  const { subject, amount, decision } = currentTransfer;

  if (step === 'verify') {
    return <IdentityCheckStep incidentId={currentTransfer.incidentId} onContinue={() => setStep('caregiverNotified')} />;
  }

  if (step === 'caregiverNotified') {
    return (
      <section className="flex-1 flex flex-col gap-5 p-5">
        <div className="bg-success-soft border border-success rounded-2xl p-5 flex flex-col gap-3">
          <strong className="flex items-center gap-2 text-success text-lg font-bold">
            <Icon name="users" size={24} />
            {t('caregiverNotifiedTitle')}
          </strong>
          <p>{t('caregiverNotifiedBody')}</p>
        </div>
        <Button onClick={() => setScreen('home')}>{t('homeButton')}</Button>
      </section>
    );
  }

  return (
    <section className="flex-1 flex flex-col gap-5 p-5">
      <div className="bg-warn-soft border border-warn rounded-2xl p-5">
        <h1 className="flex items-center gap-2 mb-1 text-warn text-xl font-bold">
          <Icon name="alertTriangle" size={24} />
          {t('warningTitle')}
        </h1>
        <p className="text-base my-2">{buildPlainSummary(decision.categories, t)}</p>
        <CategoryBadges categories={decision.categories} />
        <ul className="list-disc pl-6 my-2">
          {decision.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        <p className="font-bold mt-3 tabular-nums">
          {subject} · {money(amount)}
        </p>
      </div>
      <Button onClick={() => setStep('verify')}>{t('continueButton')}</Button>
    </section>
  );
}
