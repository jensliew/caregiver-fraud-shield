/**
 * Real (not mocked) caregiver email alert — POSTs to a small AWS Lambda
 * Function URL (see lambda/notifyCaregiver/) that holds the actual SES
 * send permission; the browser never sees AWS credentials. Recipient is
 * fixed server-side by the Lambda itself, not sent from here — see that
 * function's README for why.
 *
 * The email now carries Approve / Reject buttons. Each links back to the
 * same Lambda, which records the caregiver's decision in DynamoDB keyed by
 * a per-transfer `token`. The app then polls the status endpoint (see
 * pollCaregiverDecision) to learn the outcome and unlock — or keep
 * blocking — the paused transfer, even though the click happens entirely
 * outside the app in the caregiver's email client.
 *
 * Deliberately non-blocking: this is an additional notification/approval
 * channel alongside the existing in-app "caregiver phone" mock, not a hard
 * dependency of the fraud flow. A network hiccup here must never stop the
 * rest of the app from working.
 */
/**
 * Structured fields the Lambda renders into the branded email layout
 * (labelled rows + Approve/Decline buttons + footer). Any field the app
 * doesn't have stays null/empty and renders as a blank value — nothing is
 * fabricated. See lib/caregiverEmail.ts for how these are derived.
 */
export interface CaregiverEmailFields {
  accountHolder: string;
  recipient: string;
  amount: string;
  timestamp: string;
  flagIssue: string;
}

export interface CaregiverEmailPayload {
  subject: string;
  body: string;
  /** Structured field set for the HTML layout; text `body` is the fallback. */
  fields?: CaregiverEmailFields;
  /**
   * The registered caregiver's email for the active account. The Lambda
   * validates it's a plausible address and sends there; if omitted it falls
   * back to the server-configured default recipient.
   */
  to?: string;
  /** Unique per locked transfer; ties the email's buttons to the poll. */
  token: string;
  /**
   * 'malware' → the account was blocked on malware detection; the email
   * offers Unblock + Call hotline instead of Approve/Decline. Omitted for
   * the normal transfer approval / informational flow.
   */
  kind?: 'malware';
}

export type CaregiverDecision = 'approved' | 'rejected' | 'unblocked' | 'pending' | 'unknown';

/** URL-safe token identifying one paused transfer's approval request. */
export function newDecisionToken(): string {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return `t_${Date.now().toString(36)}_${rand}`.replace(/[^A-Za-z0-9._-]/g, '');
}

export async function sendCaregiverEmailAlert(payload: CaregiverEmailPayload): Promise<{ ok: boolean }> {
  const endpoint = import.meta.env.VITE_CAREGIVER_EMAIL_ENDPOINT;
  if (!endpoint) return { ok: false };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

/** One-shot read of the caregiver's decision for a given token. */
export async function fetchCaregiverDecision(token: string): Promise<CaregiverDecision> {
  const endpoint = import.meta.env.VITE_CAREGIVER_EMAIL_ENDPOINT;
  if (!endpoint) return 'unknown';

  try {
    const url = new URL(endpoint);
    url.searchParams.set('action', 'status');
    url.searchParams.set('token', token);
    const res = await fetch(url.toString(), { method: 'GET' });
    if (!res.ok) return 'unknown';
    const data = (await res.json()) as { decision?: CaregiverDecision };
    return data.decision ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Polls the status endpoint until the caregiver reaches a terminal decision
 * (approved / rejected / unblocked) or the caller aborts. Resolves with that
 * decision, or 'unknown' if aborted / no endpoint configured. `pending` and
 * `unknown` just keep polling.
 */
export function pollCaregiverDecision(
  token: string,
  opts: { intervalMs?: number; signal?: AbortSignal } = {}
): Promise<CaregiverDecision> {
  const { intervalMs = 4000, signal } = opts;

  return new Promise((resolve) => {
    if (signal?.aborted) return resolve('unknown');
    let timer: ReturnType<typeof setTimeout>;

    const stop = (result: CaregiverDecision) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onAbort = () => stop('unknown');
    signal?.addEventListener('abort', onAbort);

    const tick = async () => {
      const decision = await fetchCaregiverDecision(token);
      if (signal?.aborted) return;
      if (decision === 'approved' || decision === 'rejected' || decision === 'unblocked') return stop(decision);
      timer = setTimeout(tick, intervalMs);
    };

    tick();
  });
}
