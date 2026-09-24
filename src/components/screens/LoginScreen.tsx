import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { Button } from '../Button';
import { BrandHero } from '../layout/BrandHero';
import { FaceScanCapture } from '../FaceScanCapture';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { getSessionEmail } from '../../lib/session';
import { loginWithPin, identifyByFace } from '../../lib/authApi';

type View = 'face' | 'pin';

/**
 * Account login (Option B, real backend), styled to the OCBC visual
 * language: a warm hero image with the signature red curve, then a clean
 * white action card with a deep-slate primary button.
 *
 * Biometric face scan is ALWAYS the default view and is identity-first:
 * you scan your face, the server matches it against every enrolled account
 * (1-to-many) and signs you into whichever one it belongs to — no email or
 * on-device enrollment needed, just like a phone's Face ID.
 */
export function LoginScreen() {
  const { signIn, setScreen } = useAppState();
  const t = useT();

  const sessionEmail = getSessionEmail();

  const [view, setView] = useState<View>('face'); // biometric is the default
  const [email, setEmail] = useState(sessionEmail ?? '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Identity-first: the liveness-checked live descriptor is sent to the
  // server, which finds which account this face belongs to and returns it.
  async function handleIdentify(descriptor: Float32Array) {
    setBusy(true);
    setError('');
    const res = await identifyByFace(Array.from(descriptor));
    setBusy(false);
    if (res.ok && res.account) {
      signIn(res.account);
    } else {
      setError(res.error || 'No matching account for this face. Try again or use your PIN.');
    }
  }

  function handleLivenessFail(reason: 'no-face' | 'no-blink' | 'error') {
    // FaceScanCapture already shows a specific status; keep the card's own
    // error area clear so we don't double up messages.
    if (reason === 'error') setError(t('loginFaceFailed'));
    else setError('');
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

  return (
    <section className="relative flex-1 flex flex-col">
      <BrandHero title={t('loginHeroTitle')} subtitle={t('loginTagline')} />

      <div className="px-5 pb-8 -mt-8">
        <div className="relative bg-surface rounded-3xl shadow-lg p-6 flex flex-col gap-5">
          {view === 'face' ? (
            <>
              <div className="flex flex-col items-center gap-4">
                {/* Identity-first: always available. Scan → server identifies
                    the account by face → sign in. No on-device enrollment or
                    remembered email needed. */}
                <FaceScanCapture
                  mode="identify"
                  scanLabel={t('loginBiometricButton')}
                  scanIcon="faceScan"
                  onIdentify={handleIdentify}
                  onLivenessFail={handleLivenessFail}
                  onScanStart={() => setError('')}
                />
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
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm text-ink-muted">{t('loginNoAccount')}</span>
                  <button type="button" onClick={() => setScreen('register')} className="text-accent font-bold text-sm min-h-tap px-1">
                    {t('loginRegisterLink')}
                  </button>
                </div>
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
