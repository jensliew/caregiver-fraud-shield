import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const USERS_TABLE = process.env.USERS_TABLE || 'silverGuardUsers';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{6}$/;

const normEmail = (e) => String(e || '').trim().toLowerCase();

// Demo defaults a fresh account starts with — kept server-side so the
// account is the source of truth, not the browser.
const INITIAL_BALANCE = 18240.5;
const INITIAL_TRANSFER_LIMIT = 5000;

// scrypt password hashing: random per-user salt, constant-time compare.
function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(pin, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// The account view returned to the client — never includes the PIN hash.
function publicAccount(item) {
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

/**
 * Silver Guard account auth (Option B, self-rolled). Routes on one API:
 *   POST ?action=register  → create account (name, email, caregiverEmail,
 *                            pin, optional faceDescriptor). PIN is scrypt-
 *                            hashed; the face descriptor (a 128-float
 *                            vector, not a photo) is stored on the account.
 *   POST ?action=login     → verify PIN, return the public account.
 *   POST ?action=faceLogin → verify a live face descriptor against the
 *                            enrolled one (server-side euclidean distance).
 *   GET  ?action=account   → fetch the public account by email.
 */
export const handler = async (event) => {
  const method = event.requestContext?.http?.method || 'POST';
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS_HEADERS, body: '' };

  const query = event.queryStringParameters || {};
  const action = query.action;

  try {
    if (method === 'GET' && action === 'account') return await handleGetAccount(query.email);

    let payload = {};
    if (event.body) {
      try {
        payload = JSON.parse(event.body);
      } catch {
        return json(400, { ok: false, error: 'Invalid JSON body.' });
      }
    }

    if (action === 'register') return await handleRegister(payload);
    if (action === 'login') return await handleLogin(payload);
    if (action === 'faceLogin') return await handleFaceLogin(payload);
    return json(400, { ok: false, error: 'Unknown action.' });
  } catch (err) {
    console.error('auth error', err);
    return json(500, { ok: false, error: 'Server error.' });
  }
};

async function handleRegister(p) {
  const email = normEmail(p.email);
  const name = String(p.name || '').trim().slice(0, 120);
  const caregiverEmail = normEmail(p.caregiverEmail);
  const pin = String(p.pin || '');

  if (!name) return json(400, { ok: false, error: 'Name is required.' });
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'A valid email is required.' });
  if (!EMAIL_RE.test(caregiverEmail)) return json(400, { ok: false, error: 'A valid caregiver email is required.' });
  if (!PIN_RE.test(pin)) return json(400, { ok: false, error: 'PIN must be 6 digits.' });

  const faceDescriptor = sanitizeDescriptor(p.faceDescriptor);

  const item = {
    email,
    name,
    caregiverEmail,
    pinHash: hashPin(pin),
    faceDescriptor,
    balance: INITIAL_BALANCE,
    transferLimit: INITIAL_TRANSFER_LIMIT,
    createdAt: new Date().toISOString(),
  };

  try {
    await ddb.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: item,
        // Don't clobber an existing account with the same email.
        ConditionExpression: 'attribute_not_exists(email)',
      })
    );
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return json(409, { ok: false, error: 'An account with this email already exists.' });
    }
    throw err;
  }

  return json(200, { ok: true, account: publicAccount(item) });
}

async function handleLogin(p) {
  const email = normEmail(p.email);
  const pin = String(p.pin || '');
  if (!EMAIL_RE.test(email) || !pin) return json(400, { ok: false, error: 'Email and PIN are required.' });

  const item = await getUser(email);
  // Same generic message whether the email is unknown or the PIN is wrong,
  // so the endpoint doesn't reveal which emails are registered.
  if (!item || !verifyPin(pin, item.pinHash)) {
    return json(401, { ok: false, error: 'Incorrect email or PIN.' });
  }
  return json(200, { ok: true, account: publicAccount(item) });
}

async function handleFaceLogin(p) {
  const email = normEmail(p.email);
  const descriptor = sanitizeDescriptor(p.faceDescriptor);
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'A valid email is required.' });
  if (!descriptor) return json(400, { ok: false, error: 'A face descriptor is required.' });

  const item = await getUser(email);
  if (!item || !item.faceDescriptor || !item.faceDescriptor.length) {
    return json(401, { ok: false, error: 'No enrolled face for this account.' });
  }

  const distance = euclidean(descriptor, item.faceDescriptor);
  // Mirror the client's tightened match threshold (see useFaceDetection).
  const match = Number.isFinite(distance) && distance < 0.55;
  if (!match) return json(401, { ok: false, error: 'Face does not match.', distance });
  return json(200, { ok: true, account: publicAccount(item), distance });
}

async function handleGetAccount(emailRaw) {
  const email = normEmail(emailRaw);
  if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'A valid email is required.' });
  const item = await getUser(email);
  if (!item) return json(404, { ok: false, error: 'Account not found.' });
  return json(200, { ok: true, account: publicAccount(item) });
}

async function getUser(email) {
  const res = await ddb.send(new GetCommand({ TableName: USERS_TABLE, Key: { email } }));
  return res.Item || null;
}

// Accept only an array of finite numbers of the expected 128 length.
function sanitizeDescriptor(raw) {
  if (!Array.isArray(raw) || raw.length !== 128) return null;
  const cleaned = raw.map((n) => (typeof n === 'number' && Number.isFinite(n) ? n : NaN));
  if (cleaned.some((n) => Number.isNaN(n))) return null;
  return cleaned;
}

function euclidean(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}
