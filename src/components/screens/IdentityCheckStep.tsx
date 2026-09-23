import { useState } from 'react';
import { ScreenShell } from '../layout/ScreenShell';
import { Button } from '../Button';
import { Icon } from '../icons/Icon';
import { FaceScanCapture } from '../FaceScanCapture';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { getEnrolledDescriptor } from '../../lib/faceEnrollment';
import type { VerifyResult } from '../../hooks/useFaceDetection';

/**
 * Shared identity-confirmation page for every fraud response tier
 * (AlertScreen's single-signal pause, PayLockedView's compound-signal and
 * malware locks). Deliberately NOT a gate: the scan result (or the fact
 * that Face ID isn't set up) is logged onto the incident for the record,
 * but never itself resumes or unlocks anything — resolution always stays
 * with the caregiver or, for malware, Ops. No ScreenHeaderTint (matches
 * AlertScreen's convention — that gradient wash is reserved for everyday
 * banking screens, not an alert moment).
 */
export function IdentityCheckStep({ incidentId, onContinue }: { incidentId: number | null; onContinue: () => void }) {
  const { logIdentityCheck } = useAppState();
  const t = useT();
  const enrolledDescriptor = getEnrolledDescriptor();
  const [done, setDone] = useState(false);

  function handleResult(result: VerifyResult) {
    if (incidentId != null) logIdentityCheck(incidentId, result.success);
    setDone(true);
  }

  return (
    <ScreenShell>
      <h1 className="flex items-center gap-2 text-xl font-bold text-balance">
        <Icon name="camera" size={24} />
        {t('challengeTitle')}
      </h1>

      <div className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-3">
        <p>{t('challengeInstruction')}</p>

        {enrolledDescriptor && !done && (
          <FaceScanCapture mode="verify" scanLabel={t('scanButton')} enrolledDescriptor={enrolledDescriptor} onResult={handleResult} />
        )}
        {!enrolledDescriptor && !done && <p className="text-sm text-warn">Face ID isn't set up on this device yet.</p>}
        {done && <p className="text-sm text-ink-muted">{t('identityCheckNote')}</p>}

        {(done || !enrolledDescriptor) && <Button onClick={onContinue}>{t('continueButton')}</Button>}
      </div>
    </ScreenShell>
  );
}
