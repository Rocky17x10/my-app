'use client';

import {
  CircleCheck,
  CircleExclamationPoint,
  CircleX,
  Hammer,
  Info,
  PackageCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useId, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Textarea } from '@/components/ui/form';
import { IconChip } from '@/components/ui/icon-chip';
import type { Tone } from '@/components/ui/tone';
import { ReturnDetails } from '@/features/returns/return-details';
import { api, ApiError, errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { AssetReturn, ReturnCondition } from '@/types';

type Decision = 'approved' | 'rejected';

const DECISIONS: { value: Decision; label: string; text: string; icon: LucideIcon; tone: Tone }[] = [
  { value: 'approved', label: 'Approve', text: 'The device is back with IT.', icon: CircleCheck, tone: 'success' },
  { value: 'rejected', label: 'Reject', text: 'The employee keeps the device.', icon: CircleX, tone: 'danger' },
];

const CONDITIONS: { value: ReturnCondition; label: string; text: string; icon: LucideIcon; tone: Tone }[] = [
  { value: 'good', label: 'Good', text: 'Back in stock as available.', icon: PackageCheck, tone: 'success' },
  {
    value: 'needs_maintenance',
    label: 'Needs maintenance',
    text: 'Works, but needs a check or service first.',
    icon: Wrench,
    tone: 'warning',
  },
  { value: 'damaged', label: 'Damaged', text: 'Broken or missing parts; needs repair.', icon: Hammer, tone: 'danger' },
];

function Choice<V extends string>({
  name,
  value,
  checked,
  onChange,
  label,
  text,
  icon,
  tone,
}: {
  name: string;
  value: V;
  checked: boolean;
  onChange: (value: V) => void;
  label: string;
  text: string;
  icon: LucideIcon;
  tone: Tone;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring',
        checked ? 'border-primary bg-primary/8' : 'border-border hover:border-border-strong hover:bg-surface-muted',
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <IconChip icon={icon} tone={tone} size="sm" />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{label}</span>
        <span className="block text-xs text-muted">{text}</span>
      </span>
    </label>
  );
}

export type ReviewDialogProps = {
  open: boolean;
  request: AssetReturn | null;
  onClose: () => void;
  onReviewed: (updated: AssetReturn) => void;
  /** The list behind is out of date (e.g. someone else reviewed it first). */
  onStale: () => void;
};

/** Approve (with the device's condition) or reject a pending return; read-only for reviewed ones. */
export function ReviewDialog({ open, request, onClose, onReviewed, onStale }: ReviewDialogProps) {
  const formId = useId();
  const [decision, setDecision] = useState<Decision>('approved');
  const [condition, setCondition] = useState<ReturnCondition | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = request?.status === 'pending';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!request) return;
    if (decision === 'approved' && !condition) {
      setError('Choose the condition the device came back in.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch<AssetReturn>(`/asset-returns/${request.id}/review`, {
        status: decision,
        ...(decision === 'approved' ? { condition } : {}),
        adminNote: note.trim(),
      });
      onReviewed(updated);
    } catch (err) {
      setError(errorMessage(err, 'Could not save the review. Try again.'));
      if (err instanceof ApiError && err.status === 409) onStale();
      setSaving(false);
    }
  }

  if (!request || !pending) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        title={request ? `Return of ${request.asset.assetTag}` : 'Return'}
        description="A reviewed return request."
        footer={
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Close
          </Button>
        }
      >
        {request && <ReturnDetails request={request} showEmployee />}
      </Dialog>
    );
  }

  const opensMaintenance = decision === 'approved' && (condition === 'damaged' || condition === 'needs_maintenance');

  return (
    <Dialog
      open={open}
      onClose={saving ? () => undefined : onClose}
      size="lg"
      title="Review return"
      description={`${request.requestedBy.name} wants to hand back ${request.asset.assetTag}.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            loading={saving}
            variant={decision === 'approved' ? 'primary' : 'danger'}
          >
            {decision === 'approved' ? 'Approve return' : 'Reject return'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-5">
        <ReturnDetails request={request} showEmployee />

        {error && (
          <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
            <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">Decision</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {DECISIONS.map((option) => (
              <Choice
                key={option.value}
                name="decision"
                checked={decision === option.value}
                onChange={(value) => {
                  setDecision(value);
                  setError('');
                }}
                {...option}
              />
            ))}
          </div>
        </fieldset>

        {decision === 'approved' && (
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">
              Condition of the device
              <span className="ml-0.5 text-danger" aria-hidden="true">
                *
              </span>
            </legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {CONDITIONS.map((option) => (
                <Choice
                  key={option.value}
                  name="condition"
                  checked={condition === option.value}
                  onChange={(value) => {
                    setCondition(value);
                    setError('');
                  }}
                  {...option}
                />
              ))}
            </div>
            {opensMaintenance && (
              <p className="mt-3 flex items-start gap-2.5 rounded-lg bg-warning/10 p-3 text-sm text-warning">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  The asset goes to maintenance and an in-progress <strong>Return inspection</strong> record is opened.
                  Completing it on the{' '}
                  <Link href="/maintenance" className="font-medium underline">
                    Maintenance
                  </Link>{' '}
                  page makes the asset available again.
                </span>
              </p>
            )}
          </fieldset>
        )}

        <Field
          label="Note to the employee"
          hint={decision === 'rejected' ? 'Say why the return was rejected.' : 'Optional. Shown on their returns page.'}
        >
          <Textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={3} />
        </Field>
      </form>
    </Dialog>
  );
}
