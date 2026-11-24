'use client';

import { Eye, Laptop, PackagePlus, Undo2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { Badge, IdTag, StatusBadge } from '@/components/ui/badge';
import { Button, buttonClasses } from '@/components/ui/button';
import { StatCard } from '@/components/ui/card';
import { DataTable, type Column } from '@/components/ui/data-table';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/components/ui/toast';
import { brandModel, DetailList } from '@/features/assets/detail-list';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/hooks/use-api';
import { usePagedList } from '@/lib/hooks/use-paged-list';
import type { Asset, AssetRequest, AssetReturn, Page } from '@/types';
import { RequestReturnDialog } from './request-return-dialog';

type Opened = { open: boolean; asset: Asset | null; key: number };

export function MyAssetsView() {
  const toast = useToast();
  // For role `user`, GET /assets returns only the caller's assets.
  const list = usePagedList<Asset>('/assets', { sort: 'assetTag', order: 'asc' });
  const assigned = useApi<Page<Asset>>('/assets', { limit: 1 });
  // shortcut: reads up to 100 pending returns; enough for one person's devices.
  const pendingReturns = useApi<Page<AssetReturn>>('/asset-returns/my', { status: 'pending', limit: 100 });
  const pendingRequests = useApi<Page<AssetRequest>>('/asset-requests/my', { status: 'pending', limit: 1 });
  const pendingAssetIds = new Set((pendingReturns.data?.data ?? []).map((r) => r.asset.id));

  const [details, setDetails] = useState<Asset | null>(null);
  const [request, setRequest] = useState<Opened>({ open: false, asset: null, key: 0 });

  const openRequest = (asset: Asset) => {
    setDetails(null);
    setRequest((s) => ({ open: true, asset, key: s.key + 1 }));
  };
  const count = (value: number | undefined) => (value === undefined ? '—' : value.toLocaleString());

  const columns: Column<Asset>[] = [
    {
      key: 'asset',
      header: 'Asset',
      sortKey: 'assetTag',
      // Tag and name share one column so the status stays in view on phones.
      cell: (a) => (
        <div className="min-w-0">
          <p className="font-medium text-foreground">{a.name}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <IdTag>{a.assetTag}</IdTag>
            {brandModel(a)}
          </p>
        </div>
      ),
    },
    { key: 'category', header: 'Category', sortKey: 'category', hideBelow: 'md', cell: (a) => a.category },
    {
      key: 'serial',
      header: 'Serial number',
      hideBelow: 'lg',
      cell: (a) => (a.serialNumber ? <span className="font-mono text-xs">{a.serialNumber}</span> : '—'),
    },
    { key: 'location', header: 'Location', hideBelow: 'lg', cell: (a) => a.location ?? '—' },
    {
      key: 'status',
      header: 'Status',
      cell: (a) =>
        pendingAssetIds.has(a.id) ? (
          <Badge tone="warning" dot>
            Return pending
          </Badge>
        ) : (
          <StatusBadge status={a.status} />
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My assets"
        description="Equipment IT has assigned to you. Request a return when you no longer need a device."
        actions={
          <Link href="/my-requests" className={buttonClasses('secondary')}>
            <PackagePlus aria-hidden="true" />
            Request equipment
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Assigned to you"
          value={count(assigned.data?.total)}
          icon={Laptop}
          tone="info"
          hint="Devices you are responsible for"
          loading={assigned.loading && !assigned.data}
        />
        <StatCard
          label="Returns pending"
          value={count(pendingReturns.data?.total)}
          icon={Undo2}
          tone="warning"
          hint="Waiting for IT to confirm"
          href="/my-returns"
          loading={pendingReturns.loading && !pendingReturns.data}
        />
        <StatCard
          label="Open requests"
          value={count(pendingRequests.data?.total)}
          icon={PackagePlus}
          tone="teal"
          hint="New equipment you asked for"
          href="/my-requests"
          loading={pendingRequests.loading && !pendingRequests.data}
        />
      </div>

      <DataTable
        {...list.tableProps}
        label="My assets"
        columns={columns}
        rowKey={(a) => a.id}
        searchPlaceholder="Search tag, name, serial…"
        rowActionsLabel={(a) => `Actions for ${a.assetTag}`}
        rowActions={(a) => [
          { label: 'View details', icon: Eye, onSelect: () => setDetails(a) },
          pendingAssetIds.has(a.id)
            ? { label: 'Return requested', icon: Undo2, disabled: true }
            : { label: 'Request return', icon: Undo2, onSelect: () => openRequest(a) },
        ]}
        empty={
          list.search
            ? { title: 'No assets match your search', description: 'Try a tag, name or serial number.' }
            : {
                title: 'No assets assigned to you',
                description: 'When IT assigns you a device it appears here. Need something? Send a request.',
                action: (
                  <Link href="/my-requests" className={buttonClasses('primary')}>
                    <PackagePlus aria-hidden="true" />
                    Request equipment
                  </Link>
                ),
              }
        }
      />

      <Dialog
        open={details !== null}
        onClose={() => setDetails(null)}
        size="lg"
        title={details?.name ?? 'Asset'}
        description={
          details && (
            <span className="flex flex-wrap items-center gap-2">
              <IdTag>{details.assetTag}</IdTag>
              {pendingAssetIds.has(details.id) ? (
                <Badge tone="warning" dot>
                  Return pending
                </Badge>
              ) : (
                <StatusBadge status={details.status} />
              )}
            </span>
          )
        }
        footer={
          details && (
            <>
              <Button variant="secondary" onClick={() => setDetails(null)} data-autofocus>
                Close
              </Button>
              <Button disabled={pendingAssetIds.has(details.id)} onClick={() => openRequest(details)}>
                <Undo2 aria-hidden="true" />
                {pendingAssetIds.has(details.id) ? 'Return requested' : 'Request return'}
              </Button>
            </>
          )
        }
      >
        {details && (
          <>
            <DetailList
              items={[
                ['Category', details.category],
                ['Brand', details.brand],
                ['Model', details.model],
                ['Serial number', details.serialNumber],
                ['Department', details.department],
                ['Location', details.location],
                ['Purchase date', details.purchaseDate && formatDate(details.purchaseDate)],
              ]}
            />
            <div className="mt-5 border-t border-border pt-4">
              <p className="text-xs text-muted">Notes</p>
              <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{details.notes || 'No notes.'}</p>
            </div>
          </>
        )}
      </Dialog>

      <RequestReturnDialog
        key={`request-${request.key}`}
        open={request.open}
        asset={request.asset}
        onClose={() => setRequest((s) => ({ ...s, open: false }))}
        onRequested={(created) => {
          setRequest((s) => ({ ...s, open: false }));
          toast.success('Return requested', `IT will check ${created.asset.assetTag} and confirm. Follow it under My returns.`);
          pendingReturns.reload();
          list.reload();
        }}
      />
    </div>
  );
}
