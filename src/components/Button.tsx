import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'slate' | 'secondary' | 'danger' | 'neutral';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white shadow-sm hover:shadow-md active:scale-[0.98]',
  // OCBC's primary action bar — deep slate, full-width, soft shadow.
  slate: 'bg-slate text-white shadow-sm hover:bg-slate-hover hover:shadow-md active:scale-[0.98]',
  secondary: 'bg-surface text-accent border-2 border-accent hover:bg-accent-soft active:scale-[0.98]',
  danger: 'bg-white text-accent border-2 border-accent hover:bg-accent-soft active:scale-[0.98]',
  // deliberately NOT in the red family — a real alternate path (e.g. "can't
  // verify, escalate to a human") shouldn't read as the same kind of
  // action as Decline/Block
  neutral: 'bg-surface text-ink border-2 border-border hover:border-ink-muted active:scale-[0.98]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  block?: boolean;
}

export function Button({ variant = 'primary', block = false, className = '', children, ...rest }: ButtonProps) {
  return (
    <button
      className={`min-h-tap min-w-tap rounded-xl font-sans text-base font-bold px-5 py-3 inline-flex items-center justify-center gap-2 transition-all duration-150 ${VARIANT_CLASSES[variant]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
