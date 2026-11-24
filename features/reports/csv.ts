export type CsvValue = string | number | null | undefined;

function cell(value: CsvValue): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Spreadsheet formula injection: text starting with = + - @ (or tab/CR) would run as a formula.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV (CRLF, quoted when needed). */
export function toCsv(header: string[], rows: CsvValue[][]): string {
  return [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}

/** Saves `csv` as a file; the BOM makes Excel read it as UTF-8. Browser only. */
export function downloadCsv(filename: string, csv: string): void {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
