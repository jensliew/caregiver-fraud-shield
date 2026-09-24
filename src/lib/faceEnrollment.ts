/**
 * Local storage for the enrolled face descriptor — a 128-number vector
 * from face-api.js's recognition net, NOT a photo. Comparing two
 * descriptors (see hooks/useFaceDetection.ts's matchDescriptor) is how
 * "is this the same person" gets checked, both at login and at the
 * fraud-pause challenge.
 *
 * IMPORTANT — this is a hackathon-scope stand-in, not how production would
 * work: it lives in this browser's localStorage, so it's per-device and
 * disappears if the user clears site data or switches browsers. A real
 * build would never store a biometric template client-side at all — it
 * would integrate with Singpass Face Verification (MAS, 2024), which
 * verifies against the customer's national identity record server-side
 * and returns only a pass/fail, never the template itself. See the
 * execution plan's tech-stack table for that production path.
 */
const STORAGE_KEY = 'silver-guard:face-descriptor';
// The email of the account this face was enrolled for. Kept separate from
// the session pointer (lib/session.ts) so it SURVIVES sign-out — face login
// still needs to know which account to fetch after the session is cleared.
const ENROLLED_EMAIL_KEY = 'silver-guard:face-account-email';

export function saveEnrolledDescriptor(descriptor: Float32Array, email?: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(descriptor)));
  if (email) localStorage.setItem(ENROLLED_EMAIL_KEY, email);
}

/** The account email this device's face was enrolled for, if any. */
export function getEnrolledEmail(): string | null {
  return localStorage.getItem(ENROLLED_EMAIL_KEY);
}

export function getEnrolledDescriptor(): Float32Array | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const values = JSON.parse(raw) as number[];
    return new Float32Array(values);
  } catch {
    return null;
  }
}

export function hasEnrollment(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function clearEnrollment(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(ENROLLED_EMAIL_KEY);
}
