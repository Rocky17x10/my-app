'use client';

import { CircleExclamationPoint } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/form';
import { AssetSummary } from '@/features/assets/detail-list';
import { api, errorMessage } from '@/lib/api';
import type { Asset, AssetReturn } from '@/types';

export type RequestReturnDialogProps = {
  open: boolean;
  asset: Asset | null;
  onClose: () => void;
  onRequested: (request: AssetReturn) => void;
};

/** Ask IT to take a device back, with an optional note. Mount with a new `key` per opening. */
export function RequestReturnDialog({ open, asset, onClose, onRequested }: RequestReturnDialogProps) {
  const formId = useId();
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset) return;
    setSaving(true);
    setError('');
    try {
      const request = await api.post<AssetReturn>('/asset-returns', {
        assetId: asset.id,
        employeeNote: note.trim(),
      });
      onRequested(request);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the return request. Try again.'));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Request return"
      description="IT checks the device and confirms the return. You keep it until then."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            Request return
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {asset && <AssetSummary asset={asset} />}
        {error && (
          <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        <Field label="Note for IT" hint="Optional. For example the device's condition or when you can hand it over.">
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={4} />
        </Field>
      </form>
    </Dialog>
  );
}
