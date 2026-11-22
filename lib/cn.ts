/** Joins class names, skipping falsy values. Later classes do not override earlier ones: use `!` for that. */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
