/**
 * Client for the Silver Guard account auth backend (lambda/auth) — real
 * DynamoDB-backed registration and login over an API Gateway HTTP API.
 * The PIN is verified server-side (scrypt-hashed there, never stored in the
 * browser); the face descriptor is a 128-float vector, not a photo.
 *
 * When VITE_AUTH_ENDPOINT is not configured (e.g. the public GitHub Pages
 * demo with no AWS backend), we fall back to a self-contained localStorage
 * store so the app is fully usable offline. That fallback mirrors the
 * Lambda's contract: same account defaults, same public-account shape, and
 * the same face-match distance threshold. The PIN is still never stored in
 * the clear — it's SHA-256 hashed with a per-account salt via Web Crypto.
 */
export interface Account {
  email: string;
  name: string;
  caregiverEmail: string;
  balance: number;
  transferLimit: number;
  faceEnrolled: boolean;
  createdAt: string;
}

export interface AuthResult {
  ok: boolean;
  account?: Account;
  error?: string;
  distance?: number;
}

const ENDPOINT = import.meta.env.VITE_AUTH_ENDPOINT;

// ── Demo defaults (mirror lambda/auth/index.mjs) ──────────────────────────
const INITIAL_BALANCE = 18240.5;
const INITIAL_TRANSFER_LIMIT = 5000;
const FACE_MATCH_THRESHOLD = 0.6; // face-api.js documented default; see useFaceDetection.ts
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{6}$/;
const normEmail = (e: unknown) => String(e || '').trim().toLowerCase();

export interface RegisterInput {
  name: string;
  email: string;
  caregiverEmail: string;
  pin: string;
  faceDescriptor?: number[];
}

// ── Remote (real backend) ─────────────────────────────────────────────────
async function post(action: string, body: unknown): Promise<AuthResult> {
  try {
    const url = new URL(ENDPOINT as string);
    url.searchParams.set('action', action);
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return (await res.json()) as AuthResult;
  } catch {
    return { ok: false, error: 'Network error. Check your connection and try again.' };
  }
}

export function registerAccount(input: RegisterInput): Promise<AuthResult> {
  if (!ENDPOINT) return localRegister(input);
  return post('register', input);
}

export function loginWithPin(email: string, pin: string): Promise<AuthResult> {
  if (!ENDPOINT) return localLoginWithPin(email, pin);
  return post('login', { email, pin });
}

export function loginWithFace(email: string, faceDescriptor: number[]): Promise<AuthResult> {
  if (!ENDPOINT) return localLoginWithFace(email, faceDescriptor);
  return post('faceLogin', { email, faceDescriptor });
}

/**
 * Identity-first face login (1-to-many): send only a live face descriptor,
 * the server finds which account it belongs to and returns it. No email
 * needed — the face selects the account. This is what "Log in with Face ID"
 * uses. Offline fallback matches against the localStorage account store.
 */
export function identifyByFace(faceDescriptor: number[]): Promise<AuthResult> {
  if (!ENDPOINT) return localIdentifyByFace(faceDescriptor);
  return post('faceIdentify', { faceDescriptor });
}

export async function fetchAccount(email: string): Promise<AuthResult> {
  if (!ENDPOINT) return localFetchAccount(email);
  try {
    const url = new URL(ENDPOINT);
    url.searchParams.set('action', 'account');
    url.searchParams.set('email', email);
    const res = await fetch(url.toString(), { method: 'GET' });
    return (await res.json()) as AuthResult;
  } catch {
    return { ok: false, error: 'Network error.' };
  }
}

// ── Local fallback (no backend configured) ────────────────────────────────

const STORE_KEY = 'silverGuard.accounts.v1';

interface StoredAccount {
  email: string;
  name: string;
  caregiverEmail: string;
  pinHash: string; // `${saltHex}:${sha256Hex}`
  faceDescriptor: number[] | null;
  balance: number;
  transferLimit: number;
  createdAt: string;
}

function readStore(): Record<string, StoredAccount> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, StoredAccount>) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredAccount>): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked — nothing we can do in a demo fallback */
  }
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toHex(new Uint8Array(digest));
}

async function hashPin(pin: string): Promise<string> {
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await sha256Hex(`${salt}:${pin}`);
  return `${salt}:${hash}`;
}

async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const actual = await sha256Hex(`${salt}:${pin}`);
  return actual === hash;
}

function sanitizeDescriptor(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== 128) return null;
  const cleaned = raw.map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : NaN));
  if (cleaned.some((n) => Number.isNaN(n))) return null;
  return cleaned;
}

function euclidean(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function publicAccount(item: StoredAccount): Account {
  return {
    email: item.email,
    name: item.name,
    caregiverEmail: item.caregiverEmail || '',
    balance: item.balance ?? INITIAL_BALANCE,
    transferLimit: item.transferLimit ?? INITIAL_TRANSFER_LIMIT,
    faceEnrolled: Boolean(item.faceDescriptor && item.faceDescriptor.length),
    createdAt: item.createdAt,
  };
}

async function localRegister(input: RegisterInput): Promise<AuthResult> {
  const email = normEmail(input.email);
  const name = String(input.name || '').trim().slice(0, 120);
  const caregiverEmail = normEmail(input.caregiverEmail);
  const pin = String(input.pin || '');

  if (!name) return { ok: false, error: 'Name is required.' };
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required.' };
  if (!EMAIL_RE.test(caregiverEmail)) return { ok: false, error: 'A valid caregiver email is required.' };
  if (!PIN_RE.test(pin)) return { ok: false, error: 'PIN must be 6 digits.' };

  const store = readStore();
  if (store[email]) return { ok: false, error: 'An account with this email already exists.' };

  const item: StoredAccount = {
    email,
    name,
    caregiverEmail,
    pinHash: await hashPin(pin),
    faceDescriptor: sanitizeDescriptor(input.faceDescriptor),
    balance: INITIAL_BALANCE,
    transferLimit: INITIAL_TRANSFER_LIMIT,
    createdAt: new Date().toISOString(),
  };
  store[email] = item;
  writeStore(store);
  return { ok: true, account: publicAccount(item) };
}

async function localLoginWithPin(emailRaw: string, pin: string): Promise<AuthResult> {
  const email = normEmail(emailRaw);
  if (!EMAIL_RE.test(email) || !pin) return { ok: false, error: 'Email and PIN are required.' };
  const item = readStore()[email];
  // Generic message whether the email is unknown or the PIN is wrong.
  if (!item || !(await verifyPin(pin, item.pinHash))) {
    return { ok: false, error: 'Incorrect email or PIN.' };
  }
  return { ok: true, account: publicAccount(item) };
}

async function localLoginWithFace(emailRaw: string, faceDescriptor: number[]): Promise<AuthResult> {
  const email = normEmail(emailRaw);
  const descriptor = sanitizeDescriptor(faceDescriptor);
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required.' };
  if (!descriptor) return { ok: false, error: 'A face descriptor is required.' };

  const item = readStore()[email];
  if (!item || !item.faceDescriptor || !item.faceDescriptor.length) {
    return { ok: false, error: 'No enrolled face for this account.' };
  }
  const distance = euclidean(descriptor, item.faceDescriptor);
  const match = Number.isFinite(distance) && distance < FACE_MATCH_THRESHOLD;
  if (!match) return { ok: false, error: 'Face does not match.', distance };
  return { ok: true, account: publicAccount(item), distance };
}

async function localFetchAccount(emailRaw: string): Promise<AuthResult> {
  const email = normEmail(emailRaw);
  if (!EMAIL_RE.test(email)) return { ok: false, error: 'A valid email is required.' };
  const item = readStore()[email];
  if (!item) return { ok: false, error: 'Account not found.' };
  return { ok: true, account: publicAccount(item) };
}

async function localIdentifyByFace(faceDescriptor: number[]): Promise<AuthResult> {
  const descriptor = sanitizeDescriptor(faceDescriptor);
  if (!descriptor) return { ok: false, error: 'A face descriptor is required.' };
  const store = readStore();
  let best: StoredAccount | null = null;
  let bestDistance = Infinity;
  for (const item of Object.values(store)) {
    if (!item.faceDescriptor || !item.faceDescriptor.length) continue;
    const distance = euclidean(descriptor, item.faceDescriptor);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item;
    }
  }
  if (!best || !(bestDistance < FACE_MATCH_THRESHOLD)) {
    return { ok: false, error: 'No matching account for this face.', distance: bestDistance };
  }
  return { ok: true, account: publicAccount(best), distance: bestDistance };
}
