import type { ReactNode } from 'react';

export function ScreenShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`flex-1 flex flex-col gap-5 p-5 ${className}`}>{children}</section>;
}
