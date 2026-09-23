import type { ReactNode } from 'react';

/**
 * A soft gradient wash behind the everyday banking screens (Balance, Pay &
 * Transfer, Add Money, Increase Limit, Get Help) — matches the OCBC app's
 * tinted-header pattern. Deliberately NOT used on Alert/Outcome/Review,
 * where the amber/green semantic colors should stay the only color story.
 */
export function ScreenHeaderTint({ children }: { children: ReactNode }) {
  return <div className="-mx-5 -mt-5 px-5 pt-4 pb-5 flex flex-col gap-3 bg-gradient-to-b from-header-tint-from to-bg">{children}</div>;
}
