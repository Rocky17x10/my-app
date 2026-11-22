// Display formatting. Call these only in client-rendered content (after a fetch), so the
// server and browser never disagree about the time zone.

const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFormat = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

/** "22 Nov 2026"; accepts ISO timestamps and `YYYY-MM-DD`. Empty → "—". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date);
}

/** "22 Nov 2026, 14:05" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateTimeFormat.format(date);
}

/** "5 minutes ago", "yesterday"; older than a week → formatDate. */
export function timeAgo(value: string): string {
  const seconds = Math.round((new Date(value).getTime() - Date.now()) / 1000);
  if (Number.isNaN(seconds)) return value;
  const abs = Math.abs(seconds);
  if (abs < 60) return 'just now';
  if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute');
  if (abs < 86400) return relative.format(Math.round(seconds / 3600), 'hour');
  if (abs < 604800) return relative.format(Math.round(seconds / 86400), 'day');
  return formatDate(value);
}

/** Maintenance cost (DECIMAL string) → "1,250.00". */
export function formatMoney(value: string | number | null | undefined): string {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount)
    ? amount.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : String(value);
}
