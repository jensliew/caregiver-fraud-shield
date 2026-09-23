# notifyCaregiver Lambda

Thin relay so the Silver Guard app can send a **real** caregiver email alert
without ever holding AWS credentials in the browser. The app calls this
function's public Function URL over `fetch()`; the function holds the
actual `ses:SendEmail` permission and sends via AWS SES.

The recipient (`CAREGIVER_EMAIL`) is fixed as a Lambda environment
variable, not read from the request — the app can't use this as an open
relay to arbitrary addresses.

## What this function does

The caregiver can act on a flagged/blocked account straight from their
inbox. Two email variants, both driven off one endpoint:

- **Transfer approval** (`kind` omitted) — the "sudden limit increase +
  suspicious recipient profile" lock. Email carries **Approve** / **Decline**.
- **Malware block** (`kind: "malware"`) — the account was blocked because
  malware/remote-access was detected. Email carries **Unblock** and
  **Call hotline** (a `tel:` link to `HOTLINE_NUMBER`).

Routes:

- `POST` — send the HTML alert email and, if a `token` is present, store a
  `pending` decision in DynamoDB keyed by that per-transfer token. Body may
  include `kind`, `subject`, `fields` (structured rows), and `body` (text
  fallback). No token → informational email, no buttons, no DB record.
- `GET ?action=approve|reject|unblock&token=…` — the caregiver clicked a
  button; record the decision (first click wins) and show a confirmation
  page.
- `GET ?action=status&token=…` — the app polls this to learn the decision
  (`pending` / `approved` / `rejected` / `unblocked` / `unknown`) and
  unlock or keep blocking.

Decisions live in a DynamoDB table so they survive Lambda cold starts (the
caregiver may click minutes later) and auto-expire after 24h via TTL.

## Prerequisites

- An AWS account and the AWS CLI configured with credentials that can
  create IAM roles/policies, Lambda functions, and manage SES identities
  (check with `aws sts get-caller-identity`).
- Decide your two email addresses: a **sender** address you control, and
  the one fixed **caregiver** (recipient) address for this demo.

## 1. Verify the sender + recipient identities in SES

A new AWS account's SES is in **sandbox mode**: it can only send to/from
*verified* addresses. Since this demo has exactly one fixed recipient,
verify both once — no production-access request needed.

```bash
aws sesv2 create-email-identity --email-identity you@example.com
aws sesv2 create-email-identity --email-identity caregiver@example.com
```

Each address gets a verification email — click the link in both before
continuing.

## 1b. Create the DynamoDB decisions table

Stores one record per paused transfer (`token` is the partition key). The
`ttl` attribute lets records auto-expire.

```bash
aws dynamodb create-table \
  --table-name caregiverDecisions \
  --attribute-definitions AttributeName=token,AttributeType=S \
  --key-schema AttributeName=token,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

aws dynamodb update-time-to-live \
  --table-name caregiverDecisions \
  --time-to-live-specification "Enabled=true,AttributeName=ttl"
```

The IAM policy in `ses-send-policy.json` is already scoped to this table
name (`table/caregiverDecisions`).

## 2. Create the IAM role

```bash
cd lambda/notifyCaregiver
aws iam create-role \
  --role-name notifyCaregiverLambdaRole \
  --assume-role-policy-document file://trust-policy.json

aws iam put-role-policy \
  --role-name notifyCaregiverLambdaRole \
  --policy-name notifyCaregiverSesSend \
  --policy-document file://ses-send-policy.json
```

`ses-send-policy.json` scopes the role to `ses:SendEmail` only (plus the
minimum CloudWatch Logs permissions Lambda needs to write logs). For
tighter scoping you can later replace the SES statement's
`"Resource": "*"` with your sender identity's specific ARN.

Note the role ARN from the first command's output
(`arn:aws:iam::<account-id>:role/notifyCaregiverLambdaRole`) — you'll need
it in step 4.

## 3. Package the function

```bash
npm install
zip -r function.zip index.mjs node_modules package.json
```

## 4. Create the function

```bash
aws lambda create-function \
  --function-name notifyCaregiver \
  --runtime nodejs20.x \
  --handler index.handler \
  --role <ROLE_ARN_FROM_STEP_2> \
  --zip-file fileb://function.zip
```

## 5. Expose it via an API Gateway HTTP API

The original design used a Lambda **Function URL**, but on this account that
returned `403` regardless of config (not an org SCP — the account isn't in
an org). An API Gateway **HTTP API** works identically from the app's
perspective — same public `POST`/`GET`, same browser code, just a different
host — so that's what's deployed.

A single `$default` route with an `AWS_PROXY` integration and payload format
2.0 forwards *every* method and path (both the app's `POST`/`GET ?action=status`
and the caregiver's `GET ?action=approve|reject` links) straight to the
Lambda, so no per-route wiring is needed.

```bash
# Create the HTTP API fronting the Lambda, with CORS for the app's origin.
aws apigatewayv2 create-api \
  --name notifyCaregiverApi \
  --protocol-type HTTP \
  --target arn:aws:lambda:<region>:<account-id>:function:notifyCaregiver \
  --cors-configuration "AllowOrigins=http://localhost:5173,AllowMethods=GET,POST,AllowHeaders=content-type"

# Allow API Gateway to invoke the function.
aws lambda add-permission \
  --function-name notifyCaregiver \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com
```

`create-api --target` auto-creates the `$default` route, the integration,
and a default stage. Note the `ApiEndpoint` from the output.

The Approve/Reject links are opened directly by the caregiver's browser
(plain navigation, not `fetch`), so they don't need a CORS allow-listed
origin — but the app's `POST` and `GET ?action=status` calls do, hence
`AllowMethods=GET,POST` above and `ALLOWED_ORIGIN` on the function.

## 6. Set environment variables

Replace the origin with wherever the app actually runs — `http://localhost:5173`
for local dev, or your deployed hosting URL for the live demo.

- `DECISIONS_TABLE` — the DynamoDB table from step 1b.
- `PUBLIC_BASE_URL` — the API's `ApiEndpoint` from step 5. The
  Approve/Reject/Unblock links in the email point back here.
- `HOTLINE_NUMBER` — the fraud hotline the malware email's "Call hotline"
  button dials (optional; defaults to `+6567633333`).

```bash
aws lambda update-function-configuration \
  --function-name notifyCaregiver \
  --environment "Variables={SENDER_EMAIL=you@example.com,CAREGIVER_EMAIL=caregiver@example.com,ALLOWED_ORIGIN=http://localhost:5173,DECISIONS_TABLE=caregiverDecisions,PUBLIC_BASE_URL=https://<id>.execute-api.<region>.amazonaws.com/,HOTLINE_NUMBER=+6567633333}"
```

## 7. Wire the URL into the app

Copy the API endpoint into the app's `.env` (copy `.env.example` first if
you haven't):

```
VITE_CAREGIVER_EMAIL_ENDPOINT=https://<id>.execute-api.<region>.amazonaws.com/
```

Restart `npm run dev` so Vite picks up the new env var.

## Updating the function after code changes

```bash
zip -r function.zip index.mjs node_modules package.json
aws lambda update-function-code --function-name notifyCaregiver --zip-file fileb://function.zip
```
