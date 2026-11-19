
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import NotificationBell from "./NotificationBell";

type AdminTab =
  | "dashboard"
  | "assets"
  | "users"
  | "asset-requests"
  | "asset-returns"
  | "maintenance"
  | "reports"
  | "support-center"
  | "activity-logs";

type AdminNavigationProps = {
  activeTab: AdminTab;
};

const tabs: { label: string; href: string; id: AdminTab }[] = [
  { label: "Dashboard", href: "/dashboard", id: "dashboard" },
  { label: "Asset Management", href: "/", id: "assets" },
  { label: "User Management", href: "/users", id: "users" },
  { label: "Asset Requests", href: "/asset-requests", id: "asset-requests" },
  { label: "Asset Return", href: "/asset-returns", id: "asset-returns" },
  { label: "Maintenance", href: "/maintenance", id: "maintenance" },
  { label: "Reports", href: "/reports", id: "reports" },
  { label: "Support Center", href: "/support-center", id: "support-center" },
  { label: "Activity Logs", href: "/activity-logs", id: "activity-logs" },
];

export default function AdminNavigation({
  activeTab,
}: AdminNavigationProps) {
  const router = useRouter();
  const [accountOpen, setAccountOpen] = useState(false);

  function handleLogout() {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }

  return (
    <div className="w-full min-w-0 space-y-3">

      {/* Notification and My Account */}
      <div className="flex justify-end items-center gap-2">

        <NotificationBell ticketHref="/support-center/tickets" />

        <div className="relative">
          <button
            type="button"
            onClick={() => setAccountOpen((previous) => !previous)}
            aria-expanded={accountOpen}
            className="flex h-11 items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50"
          >
            <span>My Account</span>
            <span className="text-xs">▼</span>
          </button>

          {accountOpen && (
            <>
              <button
                type="button"
                aria-label="Close account menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setAccountOpen(false)}
              />

              <div className="absolute right-0 top-12 z-20 w-52 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">

                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-sm font-semibold text-gray-800">
                    My Account
                  </p>
                  <p className="text-xs text-gray-500">
                    Account settings
                  </p>
                </div>

                <Link
                  href="/change-password"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-blue-50 hover:text-blue-700"
                >
                  <span>🔒</span>
                  Change Password
                </Link>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                >
                  <span>↪</span>
                  Logout
                </button>

              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="w-full min-w-0 overflow-x-auto">
        <div className="grid min-w-[1350px] grid-cols-9 gap-2">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex h-11 items-center justify-center whitespace-nowrap rounded-lg border px-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
