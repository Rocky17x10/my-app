import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/cn';
import { SOFT, type Tone } from './tone';

const SIZES = {
  sm: 'size-7 rounded-md [&_svg]:size-4',
  md: 'size-9 rounded-lg [&_svg]:size-[18px]',
  lg: 'size-11 rounded-xl [&_svg]:size-5',
};

/** Tinted square with a saturated icon: nav items, stat cards, empty states. Decorative. */
export function IconChip({
  icon: Icon,
  tone = 'primary',
  size = 'md',
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center', SOFT[tone], SIZES[size], className)}>
      <Icon aria-hidden="true" />
    </span>
  );
}
