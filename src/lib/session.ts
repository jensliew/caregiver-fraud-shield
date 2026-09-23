/**
 * Remembers which account this device last registered/logged into, so the
 * login screen can offer face/PIN login for that specific account without
 * re-typing the email. The account record itself lives server-side (see
 * lib/authApi.ts); this only stores the email pointer + the on-device face
 * descriptor for the enroll-once/verify-every-time biometric.
 */
const EMAIL_KEY = 'silver-guard:account-email';

export function saveSessionEmail(email: string): void {
  localStorage.setItem(EMAIL_KEY, email);
}

export function getSessionEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}

export function clearSession(): void {
  localStorage.removeItem(EMAIL_KEY);
}
