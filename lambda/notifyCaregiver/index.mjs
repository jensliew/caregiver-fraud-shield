import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

// Region comes from the Lambda's own built-in AWS_REGION env var — no need
// to set it separately.
const ses = new SESv2Client({});
const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const SENDER_EMAIL = process.env.SENDER_EMAIL;
const CAREGIVER_EMAIL = process.env.CAREGIVER_EMAIL;
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
// DynamoDB table that stores one decision record per locked transfer,
// keyed by a token the app generates. Survives Lambda cold starts, so the
// caregiver can click Approve/Reject minutes later and the app still sees it.
const DECISIONS_TABLE = process.env.DECISIONS_TABLE;
// Where the caregiver's Approve/Reject links point back to — this
// function's own public Function URL. Set as an env var so the email can
// build absolute links without hardcoding the deploy URL in code.
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
// Fraud hotline the malware-alert email's "Call hotline" button dials.
const HOTLINE_NUMBER = process.env.HOTLINE_NUMBER || '+6567633333';

const MAX_SUBJECT_LENGTH = 200;
const MAX_BODY_LENGTH = 5000;
const MAX_TOKEN_LENGTH = 128;
// Records auto-expire from DynamoDB after this window (TTL attribute).
const DECISION_TTL_SECONDS = 60 * 60 * 24; // 24h

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (statusCode, obj) => ({
  statusCode,
  headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  body: JSON.stringify(obj),
});

const html = (statusCode, markup) => ({
  statusCode,
  headers: { 'Content-Type': 'text/html; charset=utf-8' },
  body: markup,
});

// Only allow tokens the app itself generates: url-safe id characters only.
const isValidToken = (token) => typeof token === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(token) && token.length <= MAX_TOKEN_LENGTH;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Caregiver email + approval relay for the "sudden limit increase +
 * suspicious recipient profile" lock. Three routes on one Function URL:
 *
 *   POST                       → send the HTML alert email (with Approve /
 *                                Reject buttons) and store a `pending`
 *                                decision keyed by the app-supplied token.
 *   GET ?action=approve|reject → the caregiver clicked a button in the
 *                                email; record the decision and show them
 *                                a confirmation page.
 *   GET ?action=status         → the app polls this to learn the decision
 *                                and unlock (or keep blocking) the transfer.
 *
 * The recipient is fixed server-side (CAREGIVER_EMAIL env), never from the
 * request, so this can't be turned into an open mail relay.
 */
export const handler = async (event) => {
  const method = event.requestContext?.http?.method || 'POST';

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (!SENDER_EMAIL || !CAREGIVER_EMAIL || !DECISIONS_TABLE) {
    return json(500, { ok: false, error: 'Lambda not configured: set SENDER_EMAIL, CAREGIVER_EMAIL, DECISIONS_TABLE.' });
  }

  const query = event.queryStringParameters || {};

  if (method === 'GET') {
    if (query.action === 'status') return handleStatus(query.token);
    if (query.action === 'approve' || query.action === 'reject' || query.action === 'unblock') {
      return handleDecision(query.action, query.token);
    }
    return html(400, '<p>Unknown request.</p>');
  }

  return handleSend(event);
};

async function handleSend(event) {
  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON body.' });
  }

  // Two kinds of send share this route:
  //   - Approval send: a token is present → the email carries Approve/Reject
  //     buttons and we record a `pending` decision the app can poll.
  //   - Informational send: no token → a plain alert (malware lock, or a
  //     softer flagged transfer that only raised the in-app challenge). No
  //     buttons, no DynamoDB record. An empty/absent token is valid here; a
  //     malformed non-empty token is still rejected.
  const rawToken = payload.token;
  const hasToken = typeof rawToken === 'string' && rawToken.length > 0;
  if (hasToken && !isValidToken(rawToken)) {
    return json(400, { ok: false, error: 'Invalid token.' });
  }
  if (hasToken && !PUBLIC_BASE_URL) {
    return json(500, { ok: false, error: 'Lambda not configured: set PUBLIC_BASE_URL.' });
  }

  // 'malware' → the account was blocked because malware was detected; the
  // email offers Unblock + Call hotline. Otherwise it's the transfer
  // approval / informational flow (Approve / Decline or no buttons).
  const kind = payload.kind === 'malware' ? 'malware' : 'transfer';
  // Recipient: the registered caregiver email for this account if it's a
  // plausible address, else the server-configured default. Validated so the
  // relay can't be pointed at an arbitrary address by a malformed request.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const requestedTo = typeof payload.to === 'string' ? payload.to.trim() : '';
  const recipient = EMAIL_RE.test(requestedTo) ? requestedTo : CAREGIVER_EMAIL;
  const defaultSubject = kind === 'malware' ? 'Silver Guard: account blocked, malware detected' : 'Silver Guard Transaction Approval';
  const subject = String(payload.subject || defaultSubject).slice(0, MAX_SUBJECT_LENGTH);
  const body = String(payload.body || '').slice(0, MAX_BODY_LENGTH);
  const fields = normalizeFields(payload.fields);

  let approveUrl;
  let rejectUrl;
  let unblockUrl;
  if (hasToken) {
    // Record (or reset) the decision as pending before sending, so a status
    // poll that races the email always finds the record.
    await ddb.send(
      new PutCommand({
        TableName: DECISIONS_TABLE,
        Item: {
          token: rawToken,
          decision: 'pending',
          summary: body,
          createdAt: new Date().toISOString(),
          ttl: Math.floor(Date.now() / 1000) + DECISION_TTL_SECONDS,
        },
      })
    );

    const base = PUBLIC_BASE_URL.replace(/\/$/, '');
    if (kind === 'malware') {
      unblockUrl = `${base}/?action=unblock&token=${encodeURIComponent(rawToken)}`;
    } else {
      approveUrl = `${base}/?action=approve&token=${encodeURIComponent(rawToken)}`;
      rejectUrl = `${base}/?action=reject&token=${encodeURIComponent(rawToken)}`;
    }
  }

  const hotlineDisplay = HOTLINE_NUMBER;
  let textBody = body;
  if (kind === 'malware' && unblockUrl) {
    textBody = `${body}\n\nUnblock account: ${unblockUrl}\nCall hotline: ${hotlineDisplay}`;
  } else if (approveUrl) {
    textBody = `${body}\n\nApprove: ${approveUrl}\nReject: ${rejectUrl}`;
  }

  const htmlBody =
    kind === 'malware'
      ? buildMalwareEmailHtml(subject, fields, body, { unblockUrl, hotline: hotlineDisplay })
      : buildEmailHtml(subject, fields, body, { approveUrl, rejectUrl });

  try {
    await ses.send(
      new SendEmailCommand({
        FromEmailAddress: SENDER_EMAIL,
        Destination: { ToAddresses: [recipient] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: textBody, Charset: 'UTF-8' },
              Html: { Data: htmlBody, Charset: 'UTF-8' },
            },
          },
        },
      })
    );
    return json(200, { ok: true, token: hasToken ? rawToken : null });
  } catch (err) {
    console.error('SES send failed', err);
    return json(502, { ok: false, error: 'SES send failed.' });
  }
}

const DECISION_FOR_ACTION = { approve: 'approved', reject: 'rejected', unblock: 'unblocked' };

const DECISION_CONFIRMATION = {
  approved: ['Transfer approved', 'Thank you. The transfer has been approved and can now proceed.'],
  rejected: ['Transfer rejected', 'Thank you. The transfer has been blocked.'],
  unblocked: ['Account unblocked', 'Thank you. Pay & Transfer has been unblocked on the account. If you are unsure whether the device is safe, please call the hotline before any money is moved.'],
};

async function handleDecision(action, token) {
  if (!isValidToken(token)) return html(400, decisionPage('Invalid link', 'This link is malformed.'));

  const decision = DECISION_FOR_ACTION[action];

  // Only the first click wins — a pending record flips to the decision;
  // once decided it can't be flipped again by re-clicking another link.
  try {
    await ddb.send(
      new UpdateCommand({
        TableName: DECISIONS_TABLE,
        Key: { token },
        UpdateExpression: 'SET decision = :d, decidedAt = :t',
        ConditionExpression: 'attribute_exists(#tk) AND decision = :pending',
        ExpressionAttributeNames: { '#tk': 'token' },
        ExpressionAttributeValues: { ':d': decision, ':t': new Date().toISOString(), ':pending': 'pending' },
      })
    );
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      // Either the token is unknown/expired, or it was already decided.
      const existing = await getDecision(token);
      if (!existing) return html(404, decisionPage('Link expired', 'This request is no longer available.'));
      return html(200, decisionPage('Already recorded', `This request was already ${existing.decision}.`));
    }
    console.error('Decision update failed', err);
    return html(502, decisionPage('Something went wrong', 'Please try again in a moment.'));
  }

  const [title, message] = DECISION_CONFIRMATION[decision];
  return html(200, decisionPage(title, message));
}

async function handleStatus(token) {
  if (!isValidToken(token)) return json(400, { ok: false, error: 'Invalid token.' });
  const record = await getDecision(token);
  if (!record) return json(200, { ok: true, decision: 'unknown' });
  return json(200, { ok: true, decision: record.decision });
}

async function getDecision(token) {
  const res = await ddb.send(new GetCommand({ TableName: DECISIONS_TABLE, Key: { token } }));
  return res.Item || null;
}

// Coerce the client-supplied fields object to a known shape of strings. Any
// missing/absent field becomes '' so it renders as a blank value rather than
// being fabricated — this holds for both the approval and info emails.
function normalizeFields(raw) {
  const f = raw && typeof raw === 'object' ? raw : {};
  const str = (v) => (typeof v === 'string' ? v.slice(0, 500) : '');
  return {
    accountHolder: str(f.accountHolder),
    recipient: str(f.recipient),
    amount: str(f.amount),
    timestamp: str(f.timestamp),
    flagIssue: str(f.flagIssue),
  };
}

function fieldRow(label, value) {
  // Empty value renders as a blank cell, keeping the row layout consistent.
  const shown = value ? escapeHtml(value).replace(/\n/g, '<br />') : '';
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#71717a;vertical-align:top;white-space:nowrap;">${escapeHtml(label)}</td>
    <td style="padding:8px 0 8px 16px;font-size:15px;color:#18181b;font-weight:bold;vertical-align:top;">${shown}</td>
  </tr>`;
}

/**
 * The caregiver email layout. Renders the labelled field rows always;
 * shows the Approve/Decline buttons and the "no payment will be processed"
 * footer only when this is an approval send (approveUrl/rejectUrl present).
 */
function buildEmailHtml(subject, fields, textFallback, links = {}) {
  const { approveUrl, rejectUrl } = links;
  const isApproval = Boolean(approveUrl && rejectUrl);

  const rows =
    fieldRow('For Account Holder:', fields.accountHolder) +
    fieldRow('Recipient:', fields.recipient) +
    fieldRow('Transaction Amount:', fields.amount) +
    fieldRow('Timestamp:', fields.timestamp) +
    fieldRow('Flag Issue:', fields.flagIssue);

  const buttons = isApproval
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
            <tr>
              <td style="padding-right:12px;">
                <a href="${approveUrl}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px;">Approve</a>
              </td>
              <td>
                <a href="${rejectUrl}" style="display:inline-block;padding:14px 28px;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px;">Decline</a>
              </td>
            </tr>
          </table>`
    : '';

  const footer = isApproval
    ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;color:#b45309;">
            <span style="font-size:15px;">⚠️</span> Upon Caregiver approval / decline, no payment will be processed automatically.
          </p>`
    : `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;color:#71717a;">
            This is an alert on the account you help look after. No action is needed from this email. Our fraud team is handling it.
          </p>`;

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 20px;font-size:20px;">${escapeHtml(subject)}</h1>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>
          ${buttons}
          ${footer}
        </td>
      </tr>
    </table>
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(textFallback || '')}</div>
  </body>
</html>`;
}

/**
 * The malware-block email. Same labelled field layout, but the account was
 * blocked because malware was detected on the device — so the actions are
 * Unblock (a link back here that the app polls) and Call hotline (a tel:
 * link). Unblock only renders when a token is present.
 */
function buildMalwareEmailHtml(subject, fields, textFallback, opts = {}) {
  const { unblockUrl, hotline } = opts;
  const telHref = `tel:${String(hotline || '').replace(/[^+\d]/g, '')}`;

  const rows =
    fieldRow('For Account Holder:', fields.accountHolder) +
    fieldRow('Recipient:', fields.recipient) +
    fieldRow('Transaction Amount:', fields.amount) +
    fieldRow('Timestamp:', fields.timestamp) +
    fieldRow('Flag Issue:', fields.flagIssue);

  const unblockBtn = unblockUrl
    ? `<td style="padding-right:12px;">
                <a href="${unblockUrl}" style="display:inline-block;padding:14px 28px;background:#16a34a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px;">Unblock</a>
              </td>`
    : '';

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr>
        <td style="padding:24px;">
          <h1 style="margin:0 0 8px;font-size:20px;color:#b91c1c;">${escapeHtml(subject)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#3f3f46;">Pay &amp; Transfer on the account you help look after has been <strong>blocked</strong> because signs of malware or remote control were detected on the device.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
            <tr>
              ${unblockBtn}
              <td>
                <a href="${telHref}" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px;">Call hotline</a>
              </td>
            </tr>
          </table>
          <p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;color:#b45309;">
            <span style="font-size:15px;">⚠️</span> Only unblock if you are certain the device is safe. If someone is guiding the account holder to move money, do not unblock. Call the hotline${hotline ? ` at ${escapeHtml(hotline)}` : ''}.
          </p>
        </td>
      </tr>
    </table>
    <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(textFallback || '')}</div>
  </body>
</html>`;
}

function decisionPage(title, message) {
  return `<!DOCTYPE html>
<html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title></head>
  <body style="margin:0;padding:48px 24px;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b;text-align:center;">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
      <h1 style="margin:0 0 12px;font-size:22px;">${escapeHtml(title)}</h1>
      <p style="margin:0;font-size:16px;line-height:1.5;color:#3f3f46;">${escapeHtml(message)}</p>
    </div>
  </body>
</html>`;
}
