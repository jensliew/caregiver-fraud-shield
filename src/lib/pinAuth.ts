/**
 * Local PIN credential — set once, then validated on every login, same
 * enroll/verify shape as faceEnrollment.ts. Lives in this browser's
 * localStorage, same honest caveat as the face descriptor: a real build
 * would never store or check a PIN client-side at all — this is a
 * hackathon-scope stand-in, not a production auth pattern.
 */
const STORAGE_KEY = 'silver-guard:pin';
const MIN_PIN_LENGTH = 4;

export function savePin(pin: string): void {
  localStorage.setItem(STORAGE_KEY, pin);
}

export function hasPinSet(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

export function verifyPin(input: string): boolean {
  return localStorage.getItem(STORAGE_KEY) === input;
}

export function clearPin(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function isPinLongEnough(pin: string): boolean {
  return pin.trim().length >= MIN_PIN_LENGTH;
}

export { MIN_PIN_LENGTH };
