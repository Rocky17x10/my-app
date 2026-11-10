
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavigation from "../components/AdminNavigation";
import NotificationBell from "../components/NotificationBell";

const API_URL = "http://localhost:3001";

type AssetStatus = "available" | "assigned" | "maintenance" | "retired";

type Asset = {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  status: AssetStatus;
};

type UserInfo = {
  id: number;
  name: string;
  email?: string;
};

type MaintenanceStatus = "in_progress" | "completed";

type MaintenanceRecord = {
  id: number;
  asset: Asset;
  createdBy: UserInfo;
  completedBy: UserInfo | null;
  maintenanceType: string;
  problemDescription: string;
  repairDetails: string | null;
  startDate: string;
  completionDate: string | null;
  cost: string | number;
  serviceProvider: string | null;
  status: MaintenanceStatus;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserProfile = {
  userId?: number;
  id?: number;
  name: string;
  email: string;
  role: string;
};

type CreateForm = {
  assetId: string;
  maintenanceType: string;
  problemDescription: string;
  serviceProvider: string;
  adminNotes: string;
};

type CompleteForm = {
  repairDetails: string;
  cost: string;
  serviceProvider: string;
  adminNotes: string;
};

type StatusFilter = "all" | MaintenanceStatus;

const emptyCreateForm: CreateForm = {
  assetId: "",
  maintenanceType: "Hardware Repair",
  problemDescription: "",
  serviceProvider: "",
  adminNotes: "",
};

const emptyCompleteForm: CompleteForm = {
  repairDetails: "",
  cost: "0",
  serviceProvider: "",
  adminNotes: "",
};

export default function MaintenancePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] =
    useState<CreateForm>(emptyCreateForm);

  const [selectedRecord, setSelectedRecord] =
    useState<MaintenanceRecord | null>(null);

  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeForm, setCompleteForm] =
    useState<CompleteForm>(emptyCompleteForm);

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("access_token");
  };

  const handleUnauthorized = useCallback(() => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }, [router]);

  const getErrorMessage = async (
    response: Response,
    fallback: string,
  ) => {
    if (response.status === 401) {
      handleUnauthorized();
      return "Your session has expired. Please log in again.";
    }

    if (response.status === 403) {
      return "You do not have permission to perform this action.";
    }

    const data = await response.json().catch(() => ({}));

    return Array.isArray(data.message)
      ? data.message.join(", ")
      : data.message || `${fallback} (HTTP ${response.status})`;
  };

  const loadData = useCallback(async (token: string) => {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const [maintenanceResponse, assetsResponse] = await Promise.all([
      fetch(`${API_URL}/maintenance`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${API_URL}/assets`, {
        headers,
        cache: "no-store",
      }),
    ]);

    if (!maintenanceResponse.ok) {
      throw new Error(
        await getErrorMessage(
          maintenanceResponse,
          "Could not load maintenance records.",
        ),
      );
    }

    if (!assetsResponse.ok) {
      throw new Error(
        await getErrorMessage(
          assetsResponse,
          "Could not load assets.",
        ),
      );
    }

    const [maintenanceData, assetsData] = await Promise.all([
      maintenanceResponse.json(),
      assetsResponse.json(),
    ]);

    setRecords(Array.isArray(maintenanceData) ? maintenanceData : []);
    setAssets(Array.isArray(assetsData) ? assetsData : []);
  }, [handleUnauthorized]);

  const refreshData = useCallback(async () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    await loadData(token);
  }, [handleUnauthorized, loadData]);

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
          if (response.status === 401) {
            handleUnauthorized();
            return;
          }

          throw new Error("Unable to load your account information.");
        }

        const profileData = await response.json();
        const user: UserProfile = profileData.user ?? profileData;

        if (!active) return;

        if (user.role !== "admin" && user.role !== "super_admin") {
          router.replace("/my-assets");
          return;
        }

        setProfile(user);
        await loadData(token);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading maintenance.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void initializePage();

    return () => {
      active = false;
    };
  }, [router, handleUnauthorized, loadData]);

  const activeRecordAssetIds = useMemo(
    () =>
      new Set(
        records
          .filter((record) => record.status === "in_progress")
          .map((record) => record.asset?.id)
          .filter((id): id is number => typeof id === "number"),
      ),
    [records],
  );

  const eligibleAssets = useMemo(
    () =>
      assets.filter(
        (asset) =>
          (asset.status === "available" ||
            asset.status === "maintenance") &&
          !activeRecordAssetIds.has(asset.id),
      ),
    [assets, activeRecordAssetIds],
  );

  const filteredRecords = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;

      const searchableValues = [
        String(record.id),
        record.asset?.assetTag,
        record.asset?.name,
        record.asset?.category,
        record.maintenanceType,
        record.problemDescription,
        record.serviceProvider,
        record.createdBy?.name,
        record.status,
      ];

      const matchesSearch =
        !searchText ||
        searchableValues.some((value) =>
          String(value || "").toLowerCase().includes(searchText),
        );

      return matchesStatus && matchesSearch;
    });
  }, [records, search, statusFilter]);

  const counts = useMemo(
    () => ({
      total: records.length,
      inProgress: records.filter(
        (record) => record.status === "in_progress",
      ).length,
      completed: records.filter(
        (record) => record.status === "completed",
      ).length,
      totalCost: records
        .filter((record) => record.status === "completed")
        .reduce(
          (sum, record) => sum + Number(record.cost || 0),
          0,
        ),
    }),
    [records],
  );

  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString();
  }

  function formatMoney(value: string | number | null | undefined) {
    const amount = Number(value || 0);

    return amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  function statusClass(status: MaintenanceStatus) {
    return status === "completed"
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-800";
  }

  function updateCreateField(
    field: keyof CreateForm,
    value: string,
  ) {
    setCreateForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function updateCompleteField(
    field: keyof CompleteForm,
    value: string,
  ) {
    setCompleteForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openCreateForm() {
    setCreateForm(emptyCreateForm);
    setError("");
    setSuccess("");
    setShowCreateForm(true);
  }

  function closeCreateForm() {
    if (saving) return;

    setShowCreateForm(false);
    setCreateForm(emptyCreateForm);
  }

  async function createMaintenance(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!createForm.assetId) {
      setError("Please select an asset.");
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/maintenance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assetId: Number(createForm.assetId),
          maintenanceType: createForm.maintenanceType.trim(),
          problemDescription: createForm.problemDescription.trim(),
          serviceProvider: createForm.serviceProvider.trim() || undefined,
          adminNotes: createForm.adminNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Could not start maintenance.",
          ),
        );
      }

      const data = await response.json();

      setShowCreateForm(false);
      setCreateForm(emptyCreateForm);

      await refreshData();

      setSuccess(
        `Maintenance record #${data.id} created successfully.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to start maintenance.",
      );
    } finally {
      setSaving(false);
    }
  }

  function openDetails(record: MaintenanceRecord) {
    setSelectedRecord(record);
    setShowCompleteForm(false);
    setCompleteForm({
      repairDetails: record.repairDetails || "",
      cost: String(record.cost ?? 0),
      serviceProvider: record.serviceProvider || "",
      adminNotes: record.adminNotes || "",
    });
    setError("");
    setSuccess("");
  }

  function closeDetails() {
    if (saving) return;

    setSelectedRecord(null);
    setShowCompleteForm(false);
    setCompleteForm(emptyCompleteForm);
  }

  function openCompleteForm() {
    if (!selectedRecord) return;

    setCompleteForm({
      repairDetails: "",
      cost: "0",
      serviceProvider: selectedRecord.serviceProvider || "",
      adminNotes: selectedRecord.adminNotes || "",
    });

    setShowCompleteForm(true);
    setError("");
  }

  async function completeMaintenance() {
    if (!selectedRecord) return;

    if (
      completeForm.cost.trim() === "" ||
      !Number.isFinite(Number(completeForm.cost)) ||
      Number(completeForm.cost) < 0
    ) {
      setError("Please enter a valid maintenance cost (0 or higher).");
      return;
    }

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/maintenance/${selectedRecord.id}/complete`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            repairDetails: completeForm.repairDetails.trim() || undefined,
            cost: Number(completeForm.cost),
            serviceProvider: completeForm.serviceProvider.trim() || undefined,
            adminNotes: completeForm.adminNotes.trim() || undefined,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await getErrorMessage(
            response,
            "Could not complete maintenance.",
          ),
        );
      }

      const data = await response.json();

      setSelectedRecord(data);
      setShowCompleteForm(false);

      await refreshData();

      setSuccess(
        `Maintenance record #${data.id} completed successfully. The asset is now available.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete maintenance.",
      );
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading maintenance records...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Maintenance Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track asset repairs, maintenance progress and repair costs.
            </p>
          </div>

          {/* Notification Bell and Logout above navigation */}
          <div className="flex items-center justify-end gap-3">
            <NotificationBell ticketHref="/support-center/tickets" />

            <button
              onClick={logout}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>

          {/* Keep all six navigation tabs in their existing layout */}
          <AdminNavigation activeTab="maintenance" />
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

        {error && !selectedRecord && (
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

        {success && (
          <div className="mb-5 flex items-start justify-between gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <span>{success}</span>
            <button
              onClick={() => setSuccess("")}
              className="font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Summary cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {counts.total}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {counts.inProgress}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {counts.completed}
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Completed Repair Costs</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {formatMoney(counts.totalCost)}
            </p>
          </div>
        </section>

        {/* Maintenance list */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Maintenance Records
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View active repairs and previous maintenance history.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setError("");
                  setSuccess("");
                  void refreshData().catch((err) =>
                    setError(
                      err instanceof Error
                        ? err.message
                        : "Unable to refresh records.",
                    ),
                  );
                }}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Refresh
              </button>

              <button
                onClick={openCreateForm}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Start Maintenance
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 p-5 md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search asset, tag, maintenance type, employee..."
              className="w-full flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 md:w-52"
            >
              <option value="all">All Statuses</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="px-5 pb-3 text-sm text-gray-500">
            Showing {filteredRecords.length} of {records.length} records
          </div>

          {filteredRecords.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-medium text-gray-700">
                No maintenance records found.
              </p>
              <p className="mt-1 text-sm text-gray-400">
                Start maintenance for an available asset to create a record.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Record</th>
                    <th className="px-4 py-3 font-semibold">Asset</th>
                    <th className="px-4 py-3 font-semibold">Maintenance Type</th>
                    <th className="px-4 py-3 font-semibold">Started</th>
                    <th className="px-4 py-3 font-semibold">Created By</th>
                    <th className="px-4 py-3 font-semibold">Cost</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-semibold text-gray-800">
                        #{record.id}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {record.asset?.name || "Unknown asset"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {record.asset?.assetTag || "—"}
                          {record.asset?.category
                            ? ` • ${record.asset.category}`
                            : ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {record.maintenanceType}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                        {formatDate(record.startDate)}
                      </td>

                      <td className="px-4 py-4 text-gray-700">
                        {record.createdBy?.name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-700">
                        {formatMoney(record.cost)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                            record.status,
                          )}`}
                        >
                          {record.status === "in_progress"
                            ? "In Progress"
                            : "Completed"}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openDetails(record)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Start maintenance modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeCreateForm}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Start Maintenance
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Register an asset repair or maintenance activity.
                </p>
              </div>

              <button
                onClick={closeCreateForm}
                disabled={saving}
                className="text-2xl text-gray-400 hover:text-gray-700"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={createMaintenance} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Select Asset *
                </label>

                <select
                  required
                  value={createForm.assetId}
                  onChange={(event) =>
                    updateCreateField("assetId", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose an available asset</option>
                  {eligibleAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      {asset.assetTag} — {asset.name} ({asset.status})
                    </option>
                  ))}
                </select>

                {eligibleAssets.length === 0 && (
                  <p className="mt-1 text-xs text-amber-700">
                    No eligible assets are available. Assigned and retired
                    assets cannot be sent for maintenance.
                  </p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Maintenance Type *
                </label>

                <select
                  required
                  value={createForm.maintenanceType}
                  onChange={(event) =>
                    updateCreateField("maintenanceType", event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Hardware Repair">Hardware Repair</option>
                  <option value="Software Issue">Software Issue</option>
                  <option value="Preventive Maintenance">
                    Preventive Maintenance
                  </option>
                  <option value="Network Issue">Network Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Problem Description *
                </label>

                <textarea
                  required
                  rows={4}
                  maxLength={5000}
                  value={createForm.problemDescription}
                  onChange={(event) =>
                    updateCreateField(
                      "problemDescription",
                      event.target.value,
                    )
                  }
                  placeholder="Describe the problem or maintenance required..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Service Provider
                </label>

                <input
                  type="text"
                  maxLength={150}
                  value={createForm.serviceProvider}
                  onChange={(event) =>
                    updateCreateField("serviceProvider", event.target.value)
                  }
                  placeholder="Internal IT Team or external service provider"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">
                  Admin Notes
                </label>

                <textarea
                  rows={3}
                  maxLength={5000}
                  value={createForm.adminNotes}
                  onChange={(event) =>
                    updateCreateField("adminNotes", event.target.value)
                  }
                  placeholder="Additional internal notes..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving || eligibleAssets.length === 0}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Starting..." : "Start Maintenance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance details modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeDetails}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Maintenance Record #{selectedRecord.id}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Asset repair and maintenance details.
                </p>
              </div>

              <button
                onClick={closeDetails}
                disabled={saving}
                className="rounded-lg px-3 py-2 text-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="space-y-5 p-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-600">
                  Current Status
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                    selectedRecord.status,
                  )}`}
                >
                  {selectedRecord.status === "in_progress"
                    ? "In Progress"
                    : "Completed"}
                </span>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">
                  Asset Information
                </h3>

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-gray-500">Asset Name</p>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.asset?.name || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Asset Tag</p>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.asset?.assetTag || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.asset?.category || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Brand / Model</p>
                    <p className="font-medium text-gray-900">
                      {[
                        selectedRecord.asset?.brand,
                        selectedRecord.asset?.model,
                      ]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">
                  Maintenance Information
                </h3>

                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-500">Maintenance Type</p>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.maintenanceType}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Problem Description</p>
                    <p className="whitespace-pre-wrap text-gray-800">
                      {selectedRecord.problemDescription}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Repair Details</p>
                    <p className="whitespace-pre-wrap text-gray-800">
                      {selectedRecord.repairDetails || "Not completed yet."}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-gray-500">Start Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedRecord.startDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Completion Date</p>
                      <p className="font-medium text-gray-900">
                        {formatDate(selectedRecord.completionDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Service Provider</p>
                      <p className="font-medium text-gray-900">
                        {selectedRecord.serviceProvider || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Maintenance Cost</p>
                      <p className="font-medium text-gray-900">
                        {formatMoney(selectedRecord.cost)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-gray-500">Admin Notes</p>
                    <p className="whitespace-pre-wrap text-gray-800">
                      {selectedRecord.adminNotes || "No admin notes."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">
                  Record Information
                </h3>

                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-gray-500">Created By</p>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.createdBy?.name || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Completed By</p>
                    <p className="font-medium text-gray-900">
                      {selectedRecord.completedBy?.name || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {selectedRecord.status === "in_progress" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                  {!showCompleteForm ? (
                    <>
                      <h3 className="font-semibold text-gray-900">
                        Complete Maintenance
                      </h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Once the repair is finished, record the repair details
                        and cost. The asset will become available again.
                      </p>

                      <button
                        onClick={openCompleteForm}
                        className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                      >
                        Complete Maintenance
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">
                        Complete Maintenance Record
                      </h3>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Repair Details
                        </label>
                        <textarea
                          rows={3}
                          value={completeForm.repairDetails}
                          onChange={(event) =>
                            updateCompleteField(
                              "repairDetails",
                              event.target.value,
                            )
                          }
                          placeholder="Describe the repair work completed..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Repair Cost
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          required
                          value={completeForm.cost}
                          onChange={(event) =>
                            updateCompleteField("cost", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Service Provider
                        </label>
                        <input
                          type="text"
                          maxLength={150}
                          value={completeForm.serviceProvider}
                          onChange={(event) =>
                            updateCompleteField(
                              "serviceProvider",
                              event.target.value,
                            )
                          }
                          placeholder="Service provider"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          Admin Notes
                        </label>
                        <textarea
                          rows={3}
                          value={completeForm.adminNotes}
                          onChange={(event) =>
                            updateCompleteField(
                              "adminNotes",
                              event.target.value,
                            )
                          }
                          placeholder="Additional completion notes..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          onClick={() => setShowCompleteForm(false)}
                          disabled={saving}
                          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-50"
                        >
                          Cancel
                        </button>

                        <button
                          onClick={() => void completeMaintenance()}
                          disabled={saving}
                          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Confirm Completion"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedRecord.status === "completed" && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                  This maintenance record is completed. The asset has been
                  released back to available inventory.
                </div>
              )}

              <div className="flex justify-end border-t pt-4">
                <button
                  onClick={closeDetails}
                  disabled={saving}
                  className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
