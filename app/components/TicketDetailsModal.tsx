"use client";

import { ReactNode } from "react";

type TicketDetailsModalProps = {
  ticketNumber: string;
  subject: string;
  createdAt: string;
  onClose: () => void;
  children: ReactNode;
};

export default function TicketDetailsModal({
  ticketNumber,
  subject,
  createdAt,
  onClose,
  children,
}: TicketDetailsModalProps) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-700">
              {ticketNumber}
            </p>

            <h2
              id="ticket-modal-title"
              className="mt-1 text-xl font-bold text-gray-900"
            >
              {subject}
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Created {new Date(createdAt).toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close ticket details"
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            ✕ Close
          </button>
        </div>

        <div className="overflow-y-auto p-5 md:p-7">
          {children}
        </div>
      </div>
    </div>
  );
}
