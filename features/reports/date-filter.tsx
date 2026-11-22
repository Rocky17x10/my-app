'use client';

import { Input } from '@/components/ui';

/** Inline "label [date]" filter for table toolbars; `name` is the input's accessible name. */
export function DateFilter({
  label,
  name,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  min?: string;
  max?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted">
      <span className="whitespace-nowrap">{label}</span>
      <Input
        type="date"
        aria-label={name}
        value={value}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        className="w-40"
      />
    </label>
  );
}
