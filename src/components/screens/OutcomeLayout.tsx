import type { ReactNode } from 'react';
import { Icon, type IconName } from '../icons/Icon';
import { Button } from '../Button';

const TONE_CLASSES = {
  success: 'text-success',
  danger: 'text-accent',
  warn: 'text-warn',
} as const;

export function OutcomeLayout({
  icon,
  tone,
  title,
  children,
  onHome,
  homeLabel,
}: {
  icon: IconName;
  tone: keyof typeof TONE_CLASSES;
  title: string;
  children?: ReactNode;
  onHome?: () => void;
  homeLabel?: string;
}) {
  return (
    <section className="flex-1 flex flex-col items-center text-center justify-center gap-6 p-5">
      <span className={TONE_CLASSES[tone]}>
        <Icon name={icon} size={72} />
      </span>
      <h1 className={`text-xl font-bold ${TONE_CLASSES[tone]}`}>{title}</h1>
      {children}
      {onHome && homeLabel && <Button onClick={onHome}>{homeLabel}</Button>}
    </section>
  );
}
