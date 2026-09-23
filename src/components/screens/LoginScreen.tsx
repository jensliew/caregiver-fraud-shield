import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Button } from '../Button';
import { BrandHero } from '../layout/BrandHero';
import { FaceScanCapture } from '../FaceScanCapture';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { getEnrolledDescriptor, hasEnrollment } from '../../lib/faceEnrollment';
import { getSessionEmail, clearSession } from '../../lib/session';
import { loginWithPin, loginWithFace } from '../../lib/authApi';
import type { VerifyResult } from '../../hooks/useFaceDetection';

type View = 'face' | 'pin';

/**
 * Account login (Option B, real backend), styled to the OCBC visual
 * language: a warm hero image with the signature red curve, then a clean
 * white action card with a deep-slate primary button.
 *
 * Biometric face scan is ALWAYS the default view. If this device has a
 * remembered, enrolled account the scan logs straight in; otherwise the
 * card guides the user to register or use email + PIN.
 */
export function LoginScreen() {
  const { signIn, setScreen } = useAppState();
  const t = useT();

  const sessionEmail = getSessionEmail();
  const enrolledDescriptor = hasEnrollment() ? getEnrolledDescriptor() : null;
  const canFaceLogin = Boolean(sessionEmail && enrolledDescriptor);

  const [view, setView] = useState<View>('face'); // biometric is the default
  const [email, setEmail] = useState(sessionEmail ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleFaceResult(result: VerifyResult) {
    if (!result.success || !sessionEmail || !enrolledDescriptor) {
      if (!result.success) setError(t('loginFaceFailed'));
      return;
    }
    setBusy(true);
    setError('');
    const res = await loginWithFace(sessionEmail, Array.from(enrolledDescriptor));
    setBusy(false);
    if (res.ok && res.account) signIn(res.account);
    else setError(res.error || t('loginFaceFailed'));
  }

  async function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await loginWithPin(email.trim().toLowerCase(), pin);
    setBusy(false);
    if (res.ok && res.account) {
      setPin('');
      signIn(res.account);
    } else {
      setError(res.error || t('loginPinErrorIncorrect'));
      setPin('');
    }
  }

  function useDifferentAccount() {
    clearSession();
    setEmail('');
    setView('pin');
    setError('');
  }

  return (
    <section className="relative flex-1 flex flex-col">
      <BrandHero title={t('loginHeroTitle')} subtitle={t('loginTagline')} />

      <div className="px-5 pb-8 -mt-8">
        <div className="relative bg-surface rounded-3xl shadow-lg p-6 flex flex-col gap-5">
          {view === 'face' ? (
            <>
              <div className="flex flex-col items-center gap-4">
                {enrolledDescriptor ? (
                  <FaceScanCapture
                    mode="verify"
                    scanLabel={t('loginBiometricButton')}
                    scanIcon="faceScan"
                    enrolledDescriptor={enrolledDescriptor}
                    onResult={handleFaceResult}
                  />
                ) : (
                  // No enrolled account on this device — show the scan glyph
                  // and route the user to register / PIN rather than a dead
                  // camera button.
                  <FaceIntro onRegister={() => setScreen('register')} label={t('loginBiometricButton')} />
                )}
              </div>

              {error && <p className="text-sm text-accent text-center font-bold">{error}</p>}
              {busy && <p className="text-sm text-ink-muted text-center">{t('loginVerifyingAccount')}</p>}

              <div className="flex flex-col gap-1 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setView('pin')}
                  className="w-full text-slate font-bold text-sm flex items-center justify-center gap-2 min-h-tap"
                >
                  <Icon name="keypad" size={18} />
                  {t('loginPinToggle')}
                </button>
                {canFaceLogin ? (
                  <button type="button" onClick={useDifferentAccount} className="text-xs text-ink-muted min-h-tap">
                    {t('loginUseDifferentAccount')}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sm text-ink-muted">{t('loginNoAccount')}</span>
                    <button type="button" onClick={() => setScreen('register')} className="text-accent font-bold text-sm min-h-tap px-1">
                      {t('loginRegisterLink')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <form onSubmit={handlePinSubmit} className="flex flex-col gap-4">
                <label className="flex flex-col gap-2 font-bold text-sm">
                  <span>{t('loginEmailLabel')}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={inputClass}
                    autoFocus={!email}
                  />
                </label>
                <label className="flex flex-col gap-2 font-bold text-sm">
                  <span>{t('loginPinLabel')}</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder={t('loginPinPlaceholder')}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    className={`${inputClass} text-center tracking-[0.4em] text-lg`}
                  />
                </label>
                {error && <p className="text-sm text-accent font-bold -mt-1">{error}</p>}
                <Button type="submit" variant="slate" block disabled={busy}>
                  {busy ? t('loginVerifyingAccount') : t('loginPinSubmit')}
                </Button>
              </form>

              <button
                type="button"
                onClick={() => setView('face')}
                className="w-full text-slate font-bold text-sm flex items-center justify-center gap-2 min-h-tap"
              >
                <Icon name="faceScan" size={18} />
                {t('loginBiometricButton')}
              </button>

              <div className="flex items-center justify-center gap-1 pt-2 border-t border-border">
                <span className="text-sm text-ink-muted">{t('loginNoAccount')}</span>
                <button type="button" onClick={() => setScreen('register')} className="text-accent font-bold text-sm min-h-tap px-1">
                  {t('loginRegisterLink')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

const inputClass =
  'font-sans text-base font-normal px-4 py-3 rounded-2xl border border-border bg-bg min-h-tap focus:border-accent focus:bg-surface focus:outline-none transition-colors';

/** Idle biometric intro for a device with no enrolled account yet. */
function FaceIntro({ onRegister, label }: { onRegister: () => void; label: string }) {
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative flex items-center justify-center" style={{ width: 168, height: 168 }}>
        <div className="absolute inset-0 rounded-full bg-accent-soft opacity-60 blur-xl" aria-hidden="true" />
        <div className="absolute inset-0 rounded-full border-[5px] border-border" aria-hidden="true" />
        <div className="absolute rounded-full bg-bg flex items-center justify-center ring-1 ring-border text-accent" style={{ inset: 10 }}>
          <Icon name="faceScan" size={64} />
        </div>
      </div>
      <Button variant="slate" block onClick={onRegister}>
        <Icon name="faceScan" size={22} />
        {label}
      </Button>
    </div>
  );
}
