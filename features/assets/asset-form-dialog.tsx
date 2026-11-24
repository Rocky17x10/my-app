'use client';

import { CircleExclamationPoint } from 'lucide-react';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { Asset } from '@/types';

type Values = {
  assetTag: string;
  name: string;
  category: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: 'available' | 'maintenance' | 'retired';
  department: string;
  location: string;
  purchaseDate: string;
  notes: string;
};
type TextKey = Exclude<keyof Values, 'status' | 'purchaseDate'>;

// Mirrors CreateAssetDto / UpdateAssetDto (my-api/src/assets/dto/asset.dto.ts).
const RULES: Record<TextKey, { max: number; required?: boolean; label: string }> = {
  assetTag: { max: 50, required: true, label: 'Asset tag' },
  name: { max: 150, required: true, label: 'Name' },
  category: { max: 50, required: true, label: 'Category' },
  brand: { max: 100, label: 'Brand' },
  model: { max: 100, label: 'Model' },
  serialNumber: { max: 150, label: 'Serial number' },
  department: { max: 100, label: 'Department' },
  location: { max: 150, label: 'Location' },
  notes: { max: 2000, label: 'Notes' },
};

function initialValues(asset: Asset | null): Values {
  return {
    assetTag: asset?.assetTag ?? '',
    name: asset?.name ?? '',
    category: asset?.category ?? '',
    brand: asset?.brand ?? '',
    model: asset?.model ?? '',
    serialNumber: asset?.serialNumber ?? '',
    status: asset && asset.status !== 'assigned' ? asset.status : 'available',
    department: asset?.department ?? '',
    location: asset?.location ?? '',
    purchaseDate: asset?.purchaseDate?.slice(0, 10) ?? '',
    notes: asset?.notes ?? '',
  };
}

function validate(values: Values): Partial<Record<keyof Values, string>> {
  const errors: Partial<Record<keyof Values, string>> = {};
  for (const [key, rule] of Object.entries(RULES) as [TextKey, (typeof RULES)[TextKey]][]) {
    const value = values[key].trim();
    if (rule.required && !value) errors[key] = `Enter the ${rule.label.toLowerCase()}.`;
    else if (value.length > rule.max) errors[key] = `${rule.label} can be at most ${rule.max} characters.`;
  }
  if (values.purchaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(values.purchaseDate)) {
    errors.purchaseDate = 'Use a valid date.';
  }
  return errors;
}

export type AssetFormDialogProps = {
  open: boolean;
  /** null = add a new asset. */
  asset: Asset | null;
  /** Existing categories, offered as suggestions. */
  categories: string[];
  onClose: () => void;
  onSaved: (asset: Asset, created: boolean) => void;
};

/** Add / edit an asset. Mount with a new `key` per opening so the form starts fresh. */
export function AssetFormDialog({ open, asset, categories, onClose, onSaved }: AssetFormDialogProps) {
  const formId = useId();
  const listId = useId();
  const [values, setValues] = useState(() => initialValues(asset));
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const assigned = asset?.status === 'assigned';

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length > 0) return;

    const optional = (value: string) => value.trim() || null;
    const body = {
      assetTag: values.assetTag.trim(),
      name: values.name.trim(),
      category: values.category.trim(),
      brand: optional(values.brand),
      model: optional(values.model),
      serialNumber: optional(values.serialNumber),
      department: optional(values.department),
      location: optional(values.location),
      purchaseDate: values.purchaseDate || null,
      notes: optional(values.notes),
      // The status of an assigned asset changes only through assign / unassign.
      ...(assigned ? {} : { status: values.status }),
    };

    setSaving(true);
    try {
      const saved = asset
        ? await api.patch<Asset>(`/assets/${asset.id}`, body)
        : await api.post<Asset>('/assets', body);
      onSaved(saved, !asset);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && /asset tag/i.test(err.message)) {
        setErrors({ assetTag: 'Another asset already uses this tag.' });
      } else {
        setFormError(errorMessage(err, 'Could not save the asset. Try again.'));
      }
      setSaving(false);
    }
  }

  const text = (key: TextKey) => ({
    value: values[key],
    maxLength: RULES[key].max,
    onChange: (event: { target: { value: string } }) => set(key, event.target.value),
  });

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      size="lg"
      title={asset ? `Edit ${asset.assetTag}` : 'Add asset'}
      description={
        asset ? 'Change the details of this asset.' : 'Register a new device or accessory in the inventory.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {asset ? 'Save changes' : 'Add asset'}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        {formError && (
          <p
            role="alert"
            className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger sm:col-span-2"
          >
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {formError}
          </p>
        )}

        <Field label="Asset tag" required error={errors.assetTag} hint="Unique label, e.g. LAP-0042.">
          <Input {...text('assetTag')} className="font-mono" autoComplete="off" />
        </Field>
        <Field label="Name" required error={errors.name}>
          <Input {...text('name')} placeholder="e.g. Developer laptop" />
        </Field>
        <Field label="Category" required error={errors.category}>
          <Input {...text('category')} list={listId} placeholder="e.g. Laptop" autoComplete="off" />
        </Field>
        <datalist id={listId}>
          {categories.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        <Field
          label="Status"
          hint={assigned ? 'Assigned assets keep their status. Unassign it first to change it.' : undefined}
        >
          {assigned ? (
            <Select value="assigned" disabled>
              <option value="assigned">Assigned</option>
            </Select>
          ) : (
            <Select value={values.status} onChange={(event) => set('status', event.target.value as Values['status'])}>
              <option value="available">Available</option>
              <option value="maintenance">In maintenance</option>
              <option value="retired">Retired</option>
            </Select>
          )}
        </Field>
        <Field label="Brand" error={errors.brand}>
          <Input {...text('brand')} placeholder="e.g. Dell" />
        </Field>
        <Field label="Model" error={errors.model}>
          <Input {...text('model')} placeholder="e.g. Latitude 5440" />
        </Field>
        <Field label="Serial number" error={errors.serialNumber}>
          <Input {...text('serialNumber')} className="font-mono" autoComplete="off" />
        </Field>
        <Field label="Purchase date" error={errors.purchaseDate}>
          <Input type="date" value={values.purchaseDate} onChange={(event) => set('purchaseDate', event.target.value)} />
        </Field>
        <Field label="Department" error={errors.department}>
          <Input {...text('department')} placeholder="e.g. Engineering" />
        </Field>
        <Field label="Location" error={errors.location}>
          <Input {...text('location')} placeholder="e.g. HQ, floor 2" />
        </Field>
        <Field label="Notes" error={errors.notes} className="sm:col-span-2">
          <Textarea {...text('notes')} rows={3} />
        </Field>
      </form>
    </Dialog>
  );
}
