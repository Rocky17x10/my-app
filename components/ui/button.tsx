import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, Ref } from 'react';

import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm';

const BASE =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-raised hover:bg-primary-hover',
  secondary:
    'border border-border-strong bg-surface text-foreground shadow-raised hover:border-muted/50 hover:bg-surface-muted',
  ghost: 'text-muted hover:bg-surface-muted hover:text-foreground',
  danger: 'bg-danger text-surface shadow-raised hover:bg-danger-hover',
  'danger-ghost': 'text-danger hover:bg-danger/10',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-3.5 text-sm',
  icon: 'size-9',
  'icon-sm': 'size-8',
};

/** Button look for links: `<Link className={buttonClasses('secondary')}>`. */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, disables the button and sets aria-busy. */
  loading?: boolean;
  ref?: Ref<HTMLButtonElement>;
};

/** Defaults to `type="button"`; pass `type="submit"` in forms. Icon-only buttons need `aria-label`. */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  type = 'button',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses(variant, size, className)}
      {...props}
    >
      {loading && <LoaderCircle className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
