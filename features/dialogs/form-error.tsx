import { CircleExclamationPoint } from 'lucide-react';

/** The API's error message inside a dialog or form (toasts are inert behind a modal). */
export function FormError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-2.5 rounded-lg bg-danger/10 p-3 text-sm text-danger">
      <CircleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}
