import { useState, type FormEvent } from 'react';
import { Icon } from '../icons/Icon';
import { Button } from '../Button';
import { BrandCurve } from '../layout/BrandCurve';
import { FaceScanCapture } from '../FaceScanCapture';
import { OutcomeLayout } from './OutcomeLayout';
import { useAppState } from '../../state/AppStateContext';
import { useT } from '../../i18n/useT';
import { registerAccount } from '../../lib/authApi';
import { saveEnrolledDescriptor } from '../../lib/faceEnrollment';

type Step = 'details' | 'face' | 'submitting' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Account registration (Option B, real backend), styled to the OCBC visual
 * language. Two visible steps — details, then face enrollment — with a step
 * dots indicator. The face descriptor is stored both on the account
 * (server-side) and on-device; the PIN only goes to the backend, which
 * scrypt-hashes it.
 */
export function RegisterScreen() {
  const { signIn, setScreen } = useAppState();
  const t = useT();

  const [step, setStep] = useState<Step>('details');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [caregiverEmail, setCaregiverEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleDetails(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError(t('registerErrorName'));
    if (!EMAIL_RE.test(email.trim())) return setError(t('registerErrorEmail'));
    if (!EMAIL_RE.test(caregiverEmail.trim())) return setError(t('registerErrorCaregiverEmail'));
    if (!/^\d{6}$/.test(pin)) return setError(t('registerErrorPin'));
    setStep('face');
  }

  async function handleEnrolled(descriptor: Float32Array) {
    setStep('submitting');
    setError('');
    const result = await registerAccount({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      caregiverEmail: caregiverEmail.trim().toLowerCase(),
      pin,
      faceDescriptor: Array.from(descriptor),
    });
    if (result.ok && result.account) {
      saveEnrolledDescriptor(descriptor);
      signIn(result.account);
      return;
    }
    setError(result.error || t('registerErrorGeneric'));
    setStep('error');
  }

  if (step === 'submitting') {
    return (
      <OutcomeLayout icon="checkCircle" tone="success" title={t('registerSubmittingTitle')}>
        <p>{t('registerSubmittingBody')}</p>
      </OutcomeLayout>
    );
  }

  if (step === 'error') {
    return (
      <OutcomeLayout icon="xCircle" tone="danger" title={t('registerErrorTitle')} onHome={() => setStep('details')} homeLabel={t('backButton')}>
        <p>{error}</p>
      </OutcomeLayout>
    );
  }

  return (
    <section className="relative flex-1 flex flex-col">
      <BrandCurve />

      <header className="px-6 pt-12 pb-4">
        <button
          type="button"
          onClick={() => (step === 'face' ? setStep('details') : setScreen('login'))}
          className="inline-flex items-center gap-2 min-h-tap pl-2 pr-3 py-1.5 rounded-full bg-surface/90 shadow-sm text-sm font-bold text-ink"
        >
          <Icon name="arrowLeft" size={20} />
          {t('backButton')}
        </button>
        <h1 className="mt-6 text-2xl font-extrabold text-ink leading-tight">{t('registerTitle')}</h1>
        <StepDots active={step === 'details' ? 0 : 1} />
      </header>

      <div className="px-5 pb-8 mt-auto">
        <div className="bg-surface rounded-3xl shadow-lg p-6">
          {step === 'face' ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-ink-muted text-center max-w-[30ch]">{t('registerFaceTagline')}</p>
              <FaceScanCapture mode="enroll" scanLabel={t('registerEnrollButton')} scanIcon="faceScan" onEnrolled={handleEnrolled} />
            </div>
          ) : (
            <form onSubmit={handleDetails} className="flex flex-col gap-4">
              <Field label={t('registerNameLabel')}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tan Ah Lian"
                  className={inputClass}
                />
              </Field>
              <Field label={t('registerEmailLabel')}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </Field>
              <Field label={t('registerCaregiverEmailLabel')}>
                <input
                  type="email"
                  value={caregiverEmail}
                  onChange={(e) => setCaregiverEmail(e.target.value)}
                  placeholder="caregiver@example.com"
                  className={inputClass}
                />
              </Field>
              <Field label={t('registerPinLabel')}>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className={`${inputClass} text-center tracking-[0.4em] text-lg`}
                />
              </Field>
              {error && <p className="text-sm text-accent font-bold -mt-1">{error}</p>}
              <Button type="submit" variant="slate" block>
                {t('registerContinueButton')}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

const inputClass =
  'font-sans text-base font-normal px-4 py-3 rounded-2xl border border-border bg-bg min-h-tap focus:border-accent focus:bg-surface focus:outline-none transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2 font-bold text-sm">
      <span>{label}</span>
      {children}
    </label>
  );
}

function StepDots({ active }: { active: number }) {
  return (
    <div className="mt-3 flex items-center gap-2" aria-hidden="true">
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-accent' : 'w-2.5 bg-border'}`}
        />
      ))}
    </div>
  );
}
