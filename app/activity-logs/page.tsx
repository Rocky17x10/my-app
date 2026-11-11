
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavigation from "../components/AdminNavigation";
import NotificationBell from "../components/NotificationBell";

const API_URL = "http://localhost:3001";

type Profile = {
  userId?: number;
  id?: number;
  name: string;
  email: string;
  role: string;
};

type ActivityActor = {
  id: number;
  name: string;
  email?: string;
} | null;

type ActivityLog = {
  id: number;
  actor: ActivityActor;
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

type ActivityResponse = {
  data: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

const emptyResponse: ActivityResponse = {
  data: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

const actionOptions = [
  "ASSET_CREATED",
  "ASSET_UPDATED",
  "ASSET_ASSIGNED",
  "ASSET_UNASSIGNED",
];

function formatAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function getActionStyle(action: string) {
  switch (action) {
    case "ASSET_CREATED":
      return "bg-green-100 text-green-700";
    case "ASSET_UPDATED":
      return "bg-blue-100 text-blue-700";
    case "ASSET_ASSIGNED":
      return "bg-purple-100 text-purple-700";
    case "ASSET_UNASSIGNED":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function ActivityLogsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<ActivityResponse>(emptyResponse);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const limit = 20;

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("access_token");
  };

  const handleUnauthorized = useCallback(() => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }, [router]);

  const loadLogs = useCallback(
    async (token: string, showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      }

      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (actionFilter !== "all") {
          params.set("action", actionFilter);
        }

        if (entityFilter !== "all") {
          params.set("entityType", entityFilter);
        }

        if (fromDate) {
          params.set("from", fromDate);
        }

        if (toDate) {
          params.set("to", toDate);
        }

        const response = await fetch(
          `${API_URL}/activity-logs?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          },
        );

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (response.status === 403) {
          throw new Error(
            "You do not have permission to view activity logs.",
          );
        }

        if (!response.ok) {
          throw new Error(
            `Could not load activity logs. HTTP ${response.status}`,
          );
        }

        const result = await response.json();

        if (Array.isArray(result)) {
          setLogs({
            data: result,
            total: result.length,
            page: 1,
            limit,
            totalPages: result.length > 0 ? 1 : 0,
          });
        } else {
          setLogs({
            data: Array.isArray(result.data) ? result.data : [],
            total: Number(result.total ?? 0),
            page: Number(result.page ?? page),
            limit: Number(result.limit ?? limit),
            totalPages: Number(result.totalPages ?? 0),
          });
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load activity logs.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      page,
      search,
      actionFilter,
      entityFilter,
      fromDate,
      toDate,
      handleUnauthorized,
    ],
  );

  useEffect(() => {
    let active = true;

    async function initializePage() {
      const token = getToken();

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!response.ok) {
          handleUnauthorized();
          return;
        }

        const profileData = await response.json();
        const user: Profile = profileData.user ?? profileData;

        if (user.role !== "admin" && user.role !== "super_admin") {
          router.replace("/my-assets");
          return;
        }

        if (!active) return;

        setProfile(user);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not verify your account.",
        );

        setLoading(false);
      }
    }

    void initializePage();

    return () => {
      active = false;
    };
  }, [router, handleUnauthorized]);

  useEffect(() => {
    if (!profile) return;

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    void loadLogs(token);
  }, [profile, loadLogs, handleUnauthorized]);

  function clearFilters() {
    setSearch("");
    setActionFilter("all");
    setEntityFilter("all");
    setFromDate("");
    setToDate("");
    setPage(1);
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }

  const refreshLogs = () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    void loadLogs(token, true);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading activity logs...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Activity Logs
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track administrative actions and inventory changes.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3">
            <NotificationBell ticketHref="/support-center/tickets" />

            <button
              onClick={logout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          <AdminNavigation activeTab="activity-logs" />
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <div className="mb-5 text-sm text-gray-600">
          Welcome,{" "}
          <span className="font-semibold text-gray-900">
            {profile?.name || profile?.email}
          </span>
          <span className="ml-2 capitalize text-gray-500">
            ({profile?.role.replace("_", " ")})
          </span>
        </div>

        {error && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Activity Records</p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {logs.total}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Records on This Page</p>
            <p className="mt-2 text-3xl font-bold text-purple-700">
              {logs.data.length}
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">
                Activity Filters
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Search and filter recorded activities.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearFilters}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear Filters
              </button>

              <button
                onClick={refreshLogs}
                disabled={refreshing}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search admin, action, description..."
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Activity Types</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {formatAction(action)}
                </option>
              ))}
            </select>

            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Entity Types</option>
              <option value="asset">Asset</option>
              <option value="user">User</option>
              <option value="employee">Employee</option>
            </select>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-500">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900"
              />
            </div>
          </div>
        </section>

        {/* Activity table */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                Activity History
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {logs.total} total records found
              </p>
            </div>
          </div>

          {logs.data.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-medium text-gray-700">
                No activity records found.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Admin</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Entity</th>
                    <th className="px-4 py-3">Entity ID</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {logs.data.map((log) => (
                    <tr key={log.id} className="align-top hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                        {formatDate(log.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900">
                          {log.actor?.name || "Deleted User"}
                        </p>
                        {log.actor?.email && (
                          <p className="mt-1 text-xs text-gray-500">
                            {log.actor.email}
                          </p>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getActionStyle(log.action)}`}
                        >
                          {formatAction(log.action)}
                        </span>
                      </td>

                      <td className="px-4 py-4 capitalize text-gray-700">
                        {log.entityType}
                      </td>

                      <td className="px-4 py-4 font-medium text-gray-700">
                        {log.entityId ?? "—"}
                      </td>

                      <td className="max-w-md px-4 py-4 text-gray-700">
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-5 py-4">
            <p className="text-sm text-gray-500">
              Page {logs.page} of {Math.max(logs.totalPages, 1)}
              {" · "}
              {logs.total} records
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1 || refreshing}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <button
                onClick={() =>
                  setPage((current) =>
                    Math.min(logs.totalPages, current + 1),
                  )
                }
                disabled={
                  logs.totalPages === 0 ||
                  page >= logs.totalPages ||
                  refreshing
                }
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
