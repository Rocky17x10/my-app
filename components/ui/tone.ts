/**
 * Colour tones shared by badges, icon chips, stat cards and charts. Each tone is a token in
 * app/globals.css that is readable as text in light and dark mode.
 * Class strings are written out in full so Tailwind can find them.
 */
export type Tone = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'neutral' | 'teal' | 'pink';

/** Tinted background + tone text, for badges and chips. */
export const SOFT: Record<Tone, string> = {
  primary: 'bg-primary/12 text-primary',
  info: 'bg-info/12 text-info',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/14 text-warning',
  danger: 'bg-danger/12 text-danger',
  neutral: 'bg-neutral/12 text-neutral',
  teal: 'bg-teal/12 text-teal',
  pink: 'bg-pink/12 text-pink',
};

/** Solid fill, for chart bars, segments and legend dots. */
export const SOLID: Record<Tone, string> = {
  primary: 'bg-primary',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-neutral',
  teal: 'bg-teal',
  pink: 'bg-pink',
};

/** SVG stroke colour, for rings and lines. */
export const STROKE: Record<Tone, string> = {
  primary: 'stroke-primary',
  info: 'stroke-info',
  success: 'stroke-success',
  warning: 'stroke-warning',
  danger: 'stroke-danger',
  neutral: 'stroke-neutral',
  teal: 'stroke-teal',
  pink: 'stroke-pink',
};
