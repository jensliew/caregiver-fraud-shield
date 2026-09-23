import type { GetHelpResult } from './types';

/**
 * "Get Help" link/message check — FR5.1/FR5.2. This is a rule-based
 * pattern stub, NOT the LLM-backed check described in requirements.md.
 * Swapping this out for a real LLM API call is the documented next step —
 * deliberately not hardcoded here since it needs an API key this codebase
 * shouldn't ship.
 */
const SUSPICIOUS_PATTERNS = [
  /bit\.ly|tinyurl|t\.co\//i,
  /verify.*(account|identity)/i,
  /urgent.*(action|response)/i,
  /gift ?card/i,
  /suspend(ed)?.*account/i,
  /claim.*(prize|refund)/i,
  /\.apk(\s|$)/i,
];

export function checkLinkOrMessage(text: string): GetHelpResult {
  const input = (text || '').trim();
  if (!input) {
    return { verdict: 'empty', message: 'Paste a link or message first.' };
  }
  const matched = SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(input));
  if (matched) {
    return {
      verdict: 'suspicious',
      message: 'This looks similar to known scam patterns. Do not click the link or share any codes. If unsure, ask a caregiver or call us directly.',
    };
  }
  return {
    verdict: 'unclear',
    message: "We didn't recognize a known scam pattern here, but that doesn't guarantee it's safe. When in doubt, don't click.",
  };
}
