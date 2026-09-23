/**
 * Small hand-authored outline icon set — 24x24 viewBox, currentColor
 * strokes, no library. Used instead of emoji so icons render identically
 * across platforms and can be recolored per tile through Tailwind's
 * `text-*` color utilities (SVG strokes inherit `currentColor`).
 */
import type { JSX, SVGProps } from 'react';

export type IconName =
  | 'shield'
  | 'wallet'
  | 'plusCircle'
  | 'send'
  | 'headset'
  | 'alertTriangle'
  | 'camera'
  | 'users'
  | 'checkCircle'
  | 'xCircle'
  | 'clock'
  | 'clipboard'
  | 'arrowLeft'
  | 'faceScan'
  | 'keypad'
  | 'phone'
  | 'videoCall'
  | 'trendUp'
  | 'shieldAlert'
  | 'flag'
  | 'eye'
  | 'eyeOff'
  | 'bank'
  | 'lock'
  | 'mail'
  | 'logout'
  | 'settings';

const PATHS: Record<IconName, JSX.Element> = {
  // brand mark — shield with a check, reused wherever "Silver Guard" trust needs reinforcing
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  // Account Balance tile — wallet
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18" />
      <circle cx="16" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  // Add Money tile
  plusCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  // Pay & Transfer tile — send
  send: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h7M12.5 8.5L16 12l-3.5 3.5" />
    </>
  ),
  // Get Help tile — support headset
  headset: (
    <>
      <path d="M4.5 13a7.5 7.5 0 0 1 15 0" />
      <path d="M4.5 13v3a2 2 0 0 0 2 2h.75v-6H6.5a1 1 0 0 0-1 1z" />
      <path d="M19.5 13v3a2 2 0 0 1-2 2h-.75v-6h.75a1 1 0 0 1 1 1z" />
    </>
  ),
  // warning banner heading
  alertTriangle: (
    <>
      <path d="M12 4.5l8.5 15h-17L12 4.5z" />
      <path d="M12 10.5v4M12 17.3h.01" />
    </>
  ),
  // face-scan card heading
  camera: (
    <>
      <path d="M4 8h3.2l1.8-2h6l1.8 2H20v11H4z" />
      <circle cx="12" cy="13.5" r="3.3" />
    </>
  ),
  // caregiver banner heading
  users: (
    <>
      <circle cx="9" cy="8.3" r="3" />
      <path d="M4 20c0-3 2.4-5.2 5-5.2s5 2.2 5 5.2" />
      <circle cx="17.6" cy="8.6" r="2.1" />
      <path d="M15.4 12.6c1.8.5 3.2 2.1 3.2 4.6" />
    </>
  ),
  // outcome: approved
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.3l2.6 2.6L16.2 9" />
    </>
  ),
  // outcome: blocked
  xCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  // outcome: pending review
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5l3.2 1.8" />
    </>
  ),
  // Fraud-Ops Review Console link
  clipboard: (
    <>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4h6v2.2H9z" />
      <path d="M9 11h6M9 15h4" />
    </>
  ),
  // back arrow
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  // login — face scan (viewfinder corners + a small smiling face)
  faceScan: (
    <>
      <path d="M4 8V6.5A1.5 1.5 0 0 1 5.5 5H8" />
      <path d="M20 8V6.5A1.5 1.5 0 0 0 18.5 5H16" />
      <path d="M4 16v1.5A1.5 1.5 0 0 0 5.5 19H8" />
      <path d="M20 16v1.5a1.5 1.5 0 0 1-1.5 1.5H16" />
      <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="1" fill="currentColor" stroke="none" />
      <path d="M9 15c1 1 5 1 6 0" />
    </>
  ),
  // login — PIN/credentials alternative (keypad dots)
  keypad: (
    <>
      <circle cx="8" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="8" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  // Get Help — call a relationship manager
  phone: <path d="M6.5 4h2.7l1.4 3.6-1.9 1.5a11.5 11.5 0 0 0 5.7 5.7l1.5-1.9L19.5 14.8v2.7a1.5 1.5 0 0 1-1.6 1.5C11 18.5 5.5 13 5 6.6A1.5 1.5 0 0 1 6.5 4z" />,
  // Get Help — video call with a relationship manager
  videoCall: (
    <>
      <rect x="3" y="7" width="12" height="10" rx="2" />
      <path d="M15 10.3L21 7.5v9L15 13.7" />
    </>
  ),
  // fraud category: unusual amount / limit increase
  trendUp: (
    <>
      <path d="M4 16l5.5-5.5 3.5 3.5L20 7" />
      <path d="M14.5 7H20v5.5" />
    </>
  ),
  // fraud category: malware
  shieldAlert: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  // fraud category: suspicious recipient profile
  flag: (
    <>
      <path d="M6 3v18" />
      <path d="M6 4.5h11l-2.5 3.3L17 11H6" />
    </>
  ),
  // balance masking — show
  eye: (
    <>
      <path d="M2 12c2.5-4.5 6.5-7 10-7s7.5 2.5 10 7c-2.5 4.5-6.5 7-10 7s-7.5-2.5-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  // balance masking — hide
  eyeOff: (
    <>
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.6 10.6 0 0 1 12 5c3.5 0 7.5 2.5 10 7-.8 1.5-1.8 2.8-3 3.9M6.7 6.7C4.9 7.9 3.4 9.7 2 12c2.5 4.5 6.5 7 10 7 1.3 0 2.6-.3 3.9-1" />
      <path d="M9.5 9.8a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  // Add Money — bank / funding source
  bank: (
    <>
      <path d="M4 10l8-5 8 5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
      <path d="M3.5 20.5h17" />
    </>
  ),
  // Pay & Transfer locked — feature-wide hold pending caregiver authorization
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
      <circle cx="12" cy="15.2" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  // caregiver email alert
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  // Home screen — logout
  logout: (
    <>
      <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4" />
      <path d="M19 12H9" />
    </>
  ),
  // header — accessibility settings: a small "A" and a big "A", the
  // universal text-size/display-settings mark (Safari Reader, Kindle,
  // etc.) — shows what the feature does at a glance, not just "settings"
  settings: (
    <>
      <path d="M5.5 10L2.5 19M5.5 10L8.5 19M3.8 15.5H7.2" />
      <path d="M16 4L11 19M16 4L21 19M13 14H19" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref'> {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 24, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
