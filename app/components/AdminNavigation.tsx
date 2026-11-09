
"use client";

import Link from "next/link";

type AdminTab =
  | "dashboard"
  | "assets"
  | "users"
  | "asset-requests"
  | "asset-returns";

type AdminNavigationProps = {
  activeTab: AdminTab;
};

const tabs: { label: string; href: string; id: AdminTab }[] = [
  { label: "Dashboard", href: "/dashboard", id: "dashboard" },
  { label: "Asset Management", href: "/", id: "assets" },
  { label: "User Management", href: "/users", id: "users" },
  { label: "Asset Request", href: "/asset-requests", id: "asset-requests" },
  { label: "Asset Return", href: "/asset-returns", id: "asset-returns" },
];

export default function AdminNavigation({
  activeTab,
}: AdminNavigationProps) {
  return (
    <nav className="w-full overflow-x-auto">
      <div className="grid min-w-[750px] grid-cols-5 gap-2">
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
  );
}
