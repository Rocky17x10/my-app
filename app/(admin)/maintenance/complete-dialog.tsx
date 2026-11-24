'use client';

import { useState, type FormEvent } from 'react';

import { Button, Dialog, Field, Input, Textarea } from '@/components/ui';
import { FormError } from '@/features/dialogs/form-error';
import { api, errorMessage } from '@/lib/api';
import type { Maintenance } from '@/types';

export function CompleteMaintenanceDialog({
  record,
  open,
  onClose,
  onCompleted,
}: {
  record: Maintenance;
  open: boolean;
  onClose: () => void;
  onCompleted: (record: Maintenance) => void;
}) {
  const [values, setValues] = useState({
    repairDetails: record.repairDetails ?? '',
    cost: '',
    serviceProvider: record.serviceProvider ?? '',
    adminNotes: record.adminNotes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      // The API keeps the current value for blank fields, so blanks are simply left out.
      const updated = await api.patch<Maintenance>(`/maintenance/${record.id}/complete`, {
        repairDetails: values.repairDetails.trim() || undefined,
        cost: values.cost === '' ? undefined : Number(values.cost),
        serviceProvider: values.serviceProvider.trim() || undefined,
        adminNotes: values.adminNotes.trim() || undefined,
      });
      onCompleted(updated);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      title={`Complete maintenance of ${record.asset.assetTag}`}
      description="Closes the record. An asset still in maintenance becomes available again."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="complete-maintenance-form" loading={saving}>
            Complete maintenance
          </Button>
        </>
      }
    >
      <form id="complete-maintenance-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
        <Field label="Repair details" className="sm:col-span-2">
          <Textarea value={values.repairDetails} onChange={set('repairDetails')} rows={3} placeholder="What was done?" />
        </Field>
        <Field label="Cost" hint="Leave blank to keep the current cost.">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={values.cost}
            onChange={set('cost')}
            placeholder={record.cost}
          />
        </Field>
        <Field label="Service provider">
          <Input value={values.serviceProvider} onChange={set('serviceProvider')} maxLength={150} />
        </Field>
        <Field label="Notes" hint="Blank fields keep their current value." className="sm:col-span-2">
          <Textarea value={values.adminNotes} onChange={set('adminNotes')} rows={2} />
        </Field>
      </form>
    </Dialog>
  );
}
