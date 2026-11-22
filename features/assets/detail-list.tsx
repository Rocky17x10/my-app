import type { ReactNode } from 'react';

import { IdTag } from '@/components/ui/badge';
import { cn } from '@/lib/cn';
import type { Asset } from '@/types';

/** Label/value pairs in a two-column grid; empty values show "—". */
export function DetailList({ items, className }: { items: [string, ReactNode][]; className?: string }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4 sm:grid-cols-2', className)}>
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs text-muted">{label}</dt>
          <dd className="mt-0.5 text-sm break-words text-foreground">
            {value === null || value === undefined || value === '' ? '—' : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "Dell · Latitude 5440", or null when both are empty. */
export function brandModel(asset: { brand: string | null; model: string | null }): string | null {
  return [asset.brand, asset.model].filter(Boolean).join(' · ') || null;
}

/** Tag + name + category/brand/model in a tinted well (dialog headers). */
export function AssetSummary({ asset }: { asset: Pick<Asset, 'assetTag' | 'name' | 'category' | 'brand' | 'model'> }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted/60 p-3">
      <IdTag>{asset.assetTag}</IdTag>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{asset.name}</p>
        <p className="truncate text-xs text-muted">{[asset.category, brandModel(asset)].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
  );
}
