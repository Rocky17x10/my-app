'use client';

import { Search } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

import { Button, Dialog, Field, Input, Select, Textarea } from '@/components/ui';
import { FormError } from '@/features/dialogs/form-error';
import { api, errorMessage } from '@/lib/api';
import { useApi } from '@/lib/hooks';
import type { Asset, Maintenance, Page } from '@/types';

const TYPES = ['Repair', 'Inspection', 'Upgrade', 'Cleaning', 'Battery replacement', 'Screen replacement'];
const PICK_LIMIT = 50;

function useDebounced(value: string, ms = 300): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

/** Search box + native select over assets that can be sent for maintenance (available, or in maintenance without an open record). */
function AssetPicker({ value, onChange }: { value: Asset | null; onChange: (asset: Asset | null) => void }) {
  const [text, setText] = useState('');
  const search = useDebounced(text.trim());
  const query = { search, limit: PICK_LIMIT, sort: 'assetTag', order: 'asc' } as const;
  const available = useApi<Page<Asset>>('/assets', { ...query, status: 'available' });
  const inMaintenance = useApi<Page<Asset>>('/assets', { ...query, status: 'maintenance' });
  const groups = [
    { label: 'Available', page: available.data },
    { label: 'In maintenance', page: inMaintenance.data },
  ];
  const options = groups.flatMap((g) => g.page?.data ?? []);
  const loading = available.loading || inMaintenance.loading;
  const more = groups.some((g) => (g.page?.total ?? 0) > PICK_LIMIT);
  const error = available.error ?? inMaintenance.error;

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <Input
        type="search"
        icon={<Search />}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search tag, name or serial…"
        aria-label="Search assets"
      />
      <Field
        label="Asset"
        required
        error={error?.message}
        hint={
          loading
            ? 'Loading assets…'
            : more
              ? `Showing the first ${PICK_LIMIT} matches per status. Search to narrow the list.`
              : 'Assigned and retired assets cannot be sent for maintenance.'
        }
      >
        <Select
          value={value ? String(value.id) : ''}
          onChange={(e) => onChange(options.find((a) => String(a.id) === e.target.value) ?? value)}
        >
          <option value="" disabled>
            {options.length === 0 && !loading ? 'No matching assets' : 'Choose an asset'}
          </option>
          {/* Keep the chosen asset selectable when a new search no longer lists it. */}
          {value && !options.some((a) => a.id === value.id) && (
            <option value={value.id}>
              {value.assetTag} · {value.name}
            </option>
          )}
          {groups.map(
            (g) =>
              (g.page?.data.length ?? 0) > 0 && (
                <optgroup key={g.label} label={g.label}>
                  {g.page?.data.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.assetTag} · {a.name}
                    </option>
                  ))}
                </optgroup>
              ),
          )}
        </Select>
      </Field>
    </div>
  );
}

export function StartMaintenanceDialog({
  open,
  onClose,
  onStarted,
}: {
  open: boolean;
  onClose: () => void;
  onStarted: (record: Maintenance) => void;
}) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [values, setValues] = useState({ maintenanceType: '', problemDescription: '', serviceProvider: '', adminNotes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (key: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const maintenanceType = values.maintenanceType.trim();
    const problemDescription = values.problemDescription.trim();
    if (!asset || !maintenanceType || !problemDescription) {
      setError('Choose an asset and enter the type and the problem.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const record = await api.post<Maintenance>('/maintenance', {
        assetId: asset.id,
        maintenanceType,
        problemDescription,
        // Optional fields are left out when blank.
        serviceProvider: values.serviceProvider.trim() || undefined,
        adminNotes: values.adminNotes.trim() || undefined,
      });
      onStarted(record);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      size="lg"
      title="Start maintenance"
      description="The asset's status changes to In maintenance until the record is completed."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="start-maintenance-form" loading={saving}>
            Start maintenance
          </Button>
        </>
      }
    >
      <form id="start-maintenance-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormError message={error} />
        </div>
        <AssetPicker value={asset} onChange={setAsset} />
        <Field label="Type" required>
          <Input value={values.maintenanceType} onChange={set('maintenanceType')} maxLength={80} list="maintenance-types" placeholder="e.g. Repair" />
        </Field>
        <datalist id="maintenance-types">
          {TYPES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <Field label="Service provider">
          <Input value={values.serviceProvider} onChange={set('serviceProvider')} maxLength={150} placeholder="e.g. Dell service centre" />
        </Field>
        <Field label="Problem" required className="sm:col-span-2">
          <Textarea value={values.problemDescription} onChange={set('problemDescription')} rows={3} placeholder="What is wrong with the asset?" />
        </Field>
        <Field label="Notes" hint="Internal; employees do not see them." className="sm:col-span-2">
          <Textarea value={values.adminNotes} onChange={set('adminNotes')} rows={2} />
        </Field>
      </form>
    </Dialog>
  );
}
