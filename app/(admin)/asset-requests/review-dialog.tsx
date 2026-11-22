'use client';

import { useState } from 'react';

import { Button, Dialog, Field, Textarea } from '@/components/ui';
import { RequestDetails } from '@/features/asset-requests/request-details';
import { FormError } from '@/features/dialogs/form-error';
import { api, ApiError, errorMessage } from '@/lib/api';
import type { AssetRequest } from '@/types';

type Decision = 'approved' | 'rejected';

/** Details of a request; for a pending one also the note and the approve/reject buttons. */
export function ReviewDialog({
  request,
  open,
  onClose,
  onReviewed,
  onStale,
}: {
  request: AssetRequest;
  open: boolean;
  onClose: () => void;
  onReviewed: (updated: AssetRequest) => void;
  /** Someone else reviewed it first (409): refresh the list behind the dialog. */
  onStale: () => void;
}) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<Decision | null>(null);
  const [error, setError] = useState('');
  const pending = request.status === 'pending';

  async function review(status: Decision) {
    setBusy(status);
    setError('');
    try {
      onReviewed(await api.patch<AssetRequest>(`/asset-requests/${request.id}/review`, { status, adminNote: note.trim() }));
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
      if (err instanceof ApiError && err.status === 409) onStale();
    }
  }

  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      size="lg"
      title={`Request #${request.id}`}
      description={
        pending
          ? 'Approve or reject this request; the employee is notified. Approving does not assign an asset.'
          : 'This request has been reviewed.'
      }
      footer={
        pending ? (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy !== null}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => review('rejected')} loading={busy === 'rejected'} disabled={busy === 'approved'}>
              Reject request
            </Button>
            <Button onClick={() => review('approved')} loading={busy === 'approved'} disabled={busy === 'rejected'}>
              Approve request
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose} data-autofocus>
            Close
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-5">
        <FormError message={error} />
        <RequestDetails request={request} showRequester />
        {pending && (
          <Field label="Note to the employee" hint={`Optional, sent with the decision. ${note.length}/2000 characters.`}>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="e.g. Approved: pick it up from the IT desk on Monday."
            />
          </Field>
        )}
      </div>
    </Dialog>
  );
}
