import { cn } from '@/lib/cn';

/** Grey placeholder block while data loads. Size it like the content it replaces. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block rounded-md bg-border/70 motion-safe:animate-pulse', className)} />;
}
