
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:3001";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  referenceId?: number | null;
  ticket: {
    id: number;
    ticketNumber?: string;
    subject?: string;
  } | null;
};

type NotificationBellProps = {
  ticketHref: string;
};

export default function NotificationBell({
  ticketHref,
}: NotificationBellProps) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () => sessionStorage.getItem("access_token");

  const loadNotifications = useCallback(async () => {
    const token = getToken();

    if (!token) return;

    try {
      const [notificationResponse, countResponse] = await Promise.all([
        fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
        fetch(`${API_URL}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        }),
      ]);

      if (!notificationResponse.ok || !countResponse.ok) {
        throw new Error("Unable to load notifications.");
      }

      const notificationData: Notification[] =
        await notificationResponse.json();

      const countData = await countResponse.json();

      setNotifications(notificationData);
      setUnreadCount(countData.count ?? 0);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load notifications."
      );
    }
  }, []);

  useEffect(() => {
    loadNotifications();

    const interval = window.setInterval(loadNotifications, 30000);

    return () => window.clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = async (notificationId: number) => {
    const token = getToken();

    if (!token) return false;

    try {
      const response = await fetch(
        `${API_URL}/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) {
        throw new Error("Unable to mark notification as read.");
      }

      setNotifications((previous) =>
        previous.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));

      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notification."
      );
      return false;
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();

    if (!token) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Unable to mark all notifications as read.");
      }

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      setUnreadCount(0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update notifications."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = async (
    notification: Notification
  ) => {
    if (!notification.isRead) {
      const success = await markAsRead(notification.id);

      if (!success) return;
    }

    setIsOpen(false);

    // New employee asset request: open the exact request popup.
    if (
      notification.type === "asset_request_new" &&
      notification.referenceId
    ) {
      const requestId = notification.referenceId;

      router.push(`/asset-requests?requestId=${requestId}`);

      // Also notify the page if it is already open.
      window.dispatchEvent(
        new CustomEvent("open-asset-request", {
          detail: { requestId },
        })
      );

      return;
    }

    // Existing support-ticket notification behavior.
    if (notification.ticket?.id) {
      router.push(`${ticketHref}?ticketId=${notification.ticket.id}`);

      window.dispatchEvent(
        new CustomEvent("open-support-ticket", {
          detail: { ticketId: notification.ticket.id },
        })
      );

      return;
    }

    // Employee asset request approval or rejection.
    if (
      notification.type === "asset_request_approved" ||
      notification.type === "asset_request_rejected"
    ) {
      router.push("/my-requests");
      return;
    }

    // Employee asset assignment notification.
    if (notification.type === "asset_assigned") {
      router.push("/my-assets");
    }
  };

  const getNotificationAction = (notification: Notification) => {
    if (
      notification.type === "asset_request_new" &&
      notification.referenceId
    ) {
      return `Request #${notification.referenceId} · Review request`;
    }

    if (notification.ticket?.id) {
      return notification.ticket.ticketNumber
        ? `${notification.ticket.ticketNumber} · View ticket`
        : `Ticket #${notification.ticket.id} · View ticket`;
    }

    if (
      notification.type === "asset_request_approved" ||
      notification.type === "asset_request_rejected"
    ) {
      return "View my requests";
    }

    if (notification.type === "asset_assigned") {
      return "View my assets";
    }

    return null;
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setIsOpen((previous) => !previous);
          loadNotifications();
        }}
        className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] max-w-[90vw] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl sm:w-[400px]">
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <div>
              <h3 className="font-bold text-gray-900">
                Notifications
              </h3>
              <p className="text-xs text-gray-500">
                {unreadCount} unread notification(s)
              </p>
            </div>

            <button
              type="button"
              onClick={markAllAsRead}
              disabled={loading || unreadCount === 0}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:cursor-not-allowed disabled:text-gray-400"
            >
              {loading ? "Please wait..." : "Mark all as read"}
            </button>
          </div>

          {error && (
            <p className="border-b border-red-100 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </p>
          )}

          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-semibold text-gray-700">
                  No notifications
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  You're all caught up.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() =>
                    handleNotificationClick(notification)
                  }
                  className={`w-full border-b border-gray-100 p-4 text-left transition hover:bg-blue-50 ${
                    notification.isRead
                      ? "bg-white"
                      : "bg-blue-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                        notification.isRead
                          ? "bg-gray-300"
                          : "bg-blue-600"
                      }`}
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </p>

                      <p className="mt-1 text-sm leading-5 text-gray-600">
                        {notification.message}
                      </p>

                      {getNotificationAction(notification) && (
                        <p className="mt-2 text-xs font-semibold text-blue-600">
                          {getNotificationAction(notification)}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-gray-400">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="border-t border-gray-200 p-3 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                loadNotifications();
              }}
              className="text-xs font-semibold text-blue-600 hover:underline"
            >
              Refresh notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
