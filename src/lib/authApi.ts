/**
 * Client for the Silver Guard account auth backend (lambda/auth) — real
 * DynamoDB-backed registration and login over an API Gateway HTTP API.
 * The PIN is verified server-side (scrypt-hashed there, never stored in the
 * browser); the face descriptor is a 128-float vector, not a photo.
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

async function post(action: string, body: unknown): Promise<AuthResult> {
  if (!ENDPOINT) return { ok: false, error: 'Auth endpoint not configured.' };
  try {
    const url = new URL(ENDPOINT);
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

export interface RegisterInput {
  name: string;
  email: string;
  caregiverEmail: string;
  pin: string;
  faceDescriptor?: number[];
}

export function registerAccount(input: RegisterInput): Promise<AuthResult> {
  return post('register', input);
}

export function loginWithPin(email: string, pin: string): Promise<AuthResult> {
  return post('login', { email, pin });
}

export function loginWithFace(email: string, faceDescriptor: number[]): Promise<AuthResult> {
  return post('faceLogin', { email, faceDescriptor });
}

export async function fetchAccount(email: string): Promise<AuthResult> {
  if (!ENDPOINT) return { ok: false, error: 'Auth endpoint not configured.' };
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
