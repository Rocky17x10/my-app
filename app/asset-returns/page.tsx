
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavigation from "../components/AdminNavigation";

const API_URL = "http://localhost:3001";

type ReturnStatus = "pending" | "approved" | "rejected";
type ReturnCondition = "good" | "damaged" | "needs_maintenance";

type UserInfo = {
  id: number;
  name: string;
  email: string;
  department?: string | null;
};

type AssetInfo = {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand?: string | null;
  model?: string | null;
  status: string;
};

type AssignmentHistory = {
  id: number;
  assignedAt: string;
  returnedAt: string | null;
};

type AssetReturn = {
  id: number;
  status: ReturnStatus;
  condition: ReturnCondition | null;
  employeeNote: string | null;
  adminNote: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  confirmedAt: string | null;
  asset?: AssetInfo;
  assignmentHistory?: AssignmentHistory;
  requestedBy?: UserInfo;
  reviewedBy?: UserInfo | null;
};

type UserProfile = {
  userId?: number;
  id?: number;
  name: string;
  email: string;
  role: string;
  department?: string | null;
};

export default function AssetReturnsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [returns, setReturns] = useState<AssetReturn[]>([]);
  const [selectedReturn, setSelectedReturn] =
    useState<AssetReturn | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [condition, setCondition] = useState<ReturnCondition>("good");
  const [adminNote, setAdminNote] = useState("");

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("access_token");
  };

  const handleUnauthorized = useCallback(() => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }, [router]);

  const loadReturns = useCallback(async (token: string) => {
    const response = await fetch(`${API_URL}/asset-returns`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (response.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(
        data.message || "Failed to load asset return requests.",
      );
    }

    const data = await response.json();
    setReturns(Array.isArray(data) ? data : []);
  }, []);

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

        if (response.status === 401) {
          handleUnauthorized();
          return;
        }

        if (!response.ok) {
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
        await loadReturns(token);
      } catch (error) {
        if (!active) return;

        const message =
          error instanceof Error ? error.message : "Something went wrong.";

        if (message.toLowerCase().includes("session has expired")) {
          handleUnauthorized();
          return;
        }

        setPageError(message);
      } finally {
        if (active) setLoading(false);
      }
    }

    initializePage();

    return () => {
      active = false;
    };
  }, [router, loadReturns, handleUnauthorized]);

  const counts = useMemo(() => {
    return {
      total: returns.length,
      pending: returns.filter((item) => item.status === "pending").length,
      approved: returns.filter((item) => item.status === "approved").length,
      rejected: returns.filter((item) => item.status === "rejected").length,
    };
  }, [returns]);

  const filteredReturns = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return returns.filter((item) => {
      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesSearch =
        !searchText ||
        String(item.id).includes(searchText) ||
        item.asset?.assetTag?.toLowerCase().includes(searchText) ||
        item.asset?.name?.toLowerCase().includes(searchText) ||
        item.asset?.category?.toLowerCase().includes(searchText) ||
        item.requestedBy?.name?.toLowerCase().includes(searchText) ||
        item.requestedBy?.email?.toLowerCase().includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [returns, search, statusFilter]);

  function formatDate(value?: string | null) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString();
  }

  function statusClass(status: ReturnStatus) {
    if (status === "approved") {
      return "bg-green-100 text-green-700";
    }

    if (status === "rejected") {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-800";
  }

  function conditionLabel(value?: ReturnCondition | null) {
    if (value === "good") return "Good";
    if (value === "damaged") return "Damaged";
    if (value === "needs_maintenance") return "Needs Maintenance";
    return "Not recorded";
  }

  function openDetails(item: AssetReturn) {
    setSelectedReturn(item);
    setCondition(item.condition || "good");
    setAdminNote(item.adminNote || "");
    setPageError("");
    setSuccessMessage("");
  }

  function closeDetails() {
    if (submitting) return;

    setSelectedReturn(null);
    setAdminNote("");
    setCondition("good");
    setPageError("");
  }

  async function reviewReturn(status: "approved" | "rejected") {
    if (!selectedReturn) return;

    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    const confirmed = window.confirm(
      status === "approved"
        ? "Are you sure you want to approve this return request? The asset will be released from the employee."
        : "Are you sure you want to reject this return request?",
    );

    if (!confirmed) return;

    setSubmitting(true);
    setPageError("");
    setSuccessMessage("");

    try {
      const body: {
        status: "approved" | "rejected";
        condition?: ReturnCondition;
        adminNote?: string;
      } = {
        status,
        adminNote: adminNote.trim(),
      };

      if (status === "approved") {
        body.condition = condition;
      }

      const response = await fetch(
        `${API_URL}/asset-returns/${selectedReturn.id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(", ")
            : data.message || "Unable to review this return request.",
        );
      }

      setReturns((previous) =>
        previous.map((item) => (item.id === data.id ? data : item)),
      );

      setSelectedReturn(null);
      setAdminNote("");
      setCondition("good");

      setSuccessMessage(
        status === "approved"
          ? `Return request #${data.id} approved successfully.`
          : `Return request #${data.id} rejected successfully.`,
      );
    } catch (error) {
      setPageError(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <p className="text-gray-600">Loading asset return requests...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Asset Return Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review employee asset return requests.
            </p>
          </div>

          {/* Shared five-tab navigation */}
          <AdminNavigation activeTab="asset-returns" />

          {/* Logout remains separate */}
          <div className="flex justify-end">
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-5">
          <p className="text-gray-700">
            Welcome,{" "}
            <span className="font-semibold">
              {profile?.name || profile?.email}
            </span>
          </p>
          <p className="text-sm text-gray-500 capitalize">
            Role: {profile?.role?.replace("_", " ")}
          </p>
        </div>

        {pageError && !selectedReturn && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {pageError}
            <button
              onClick={() => setPageError("")}
              className="ml-3 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {successMessage}
            <button
              onClick={() => setSuccessMessage("")}
              className="ml-3 font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {counts.total}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {counts.pending}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {counts.approved}
            </p>
          </div>

          <div className="bg-white rounded-xl border p-5 shadow-sm">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {counts.rejected}
            </p>
          </div>
        </section>

        <section className="bg-white rounded-xl border shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by request ID, employee, email, asset tag or name..."
              className="w-full md:flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full md:w-48 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>

            <button
              onClick={() => {
                const token = getToken();

                if (!token) {
                  handleUnauthorized();
                  return;
                }

                setPageError("");

                loadReturns(token).catch((error) => {
                  setPageError(
                    error instanceof Error
                      ? error.message
                      : "Failed to refresh requests.",
                  );
                });
              }}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Refresh
            </button>
          </div>
        </section>

        <section className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-800">
              Return Requests ({filteredReturns.length})
            </h2>
          </div>

          {filteredReturns.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-gray-600 font-medium">
                No asset return requests found.
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Requests will appear here when employees submit them.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Request</th>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Asset</th>
                    <th className="px-4 py-3 font-semibold">Requested At</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredReturns.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-semibold text-gray-800">
                        #{item.id}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">
                          {item.requestedBy?.name || "Unknown employee"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.requestedBy?.email || "—"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-800">
                          {item.asset?.name || "Unknown asset"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.asset?.assetTag || "No asset tag"}
                          {item.asset?.category
                            ? ` • ${item.asset.category}`
                            : ""}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(item.requestedAt)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                            item.status,
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openDetails(item)}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                        >
                          {item.status === "pending"
                            ? "Review"
                            : "View Details"}
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

      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Return Request #{selectedReturn.id}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Review the employee's asset return request.
                </p>
              </div>

              <button
                onClick={closeDetails}
                disabled={submitting}
                className="rounded-lg px-3 py-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {pageError && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {pageError}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm font-medium text-gray-600">
                  Request status
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(
                    selectedReturn.status,
                  )}`}
                >
                  {selectedReturn.status}
                </span>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Employee Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium text-gray-800">
                      {selectedReturn.requestedBy?.name || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium text-gray-800 break-all">
                      {selectedReturn.requestedBy?.email || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Department</p>
                    <p className="font-medium text-gray-800">
                      {selectedReturn.requestedBy?.department || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Requested At</p>
                    <p className="font-medium text-gray-800">
                      {formatDate(selectedReturn.requestedAt)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="font-semibold text-gray-800 mb-3">
                  Asset Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Asset Name</p>
                    <p className="font-medium text-gray-800">
                      {selectedReturn.asset?.name || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Asset Tag</p>
                    <p className="font-medium text-gray-800">
                      {selectedReturn.asset?.assetTag || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Category</p>
                    <p className="font-medium text-gray-800">
                      {selectedReturn.asset?.category || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Brand / Model</p>
                    <p className="font-medium text-gray-800">
                      {[
                        selectedReturn.asset?.brand,
                        selectedReturn.asset?.model,
                      ]
                        .filter(Boolean)
                        .join(" / ") || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Assignment Date</p>
                    <p className="font-medium text-gray-800">
                      {formatDate(
                        selectedReturn.assignmentHistory?.assignedAt,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Assignment History ID</p>
                    <p className="font-medium text-gray-800">
                      {selectedReturn.assignmentHistory?.id ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <h3 className="font-semibold text-gray-800 mb-2">
                  Employee Note
                </h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {selectedReturn.employeeNote || "No note provided."}
                </p>
              </div>

              {selectedReturn.status !== "pending" && (
                <div className="rounded-xl border p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800">
                    Review Information
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Asset Condition</p>
                      <p className="font-medium text-gray-800">
                        {conditionLabel(selectedReturn.condition)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Reviewed By</p>
                      <p className="font-medium text-gray-800">
                        {selectedReturn.reviewedBy?.name || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Reviewed At</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(selectedReturn.reviewedAt)}
                      </p>
                    </div>

                    <div>
                      <p className="text-gray-500">Confirmed At</p>
                      <p className="font-medium text-gray-800">
                        {formatDate(selectedReturn.confirmedAt)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Admin Note</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {selectedReturn.adminNote || "No admin note provided."}
                    </p>
                  </div>
                </div>
              )}

              {selectedReturn.status === "pending" && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      Review This Request
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the condition after physically receiving and
                      inspecting the asset.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Returned Asset Condition
                    </label>

                    <select
                      value={condition}
                      onChange={(event) =>
                        setCondition(event.target.value as ReturnCondition)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="good">Good</option>
                      <option value="damaged">Damaged</option>
                      <option value="needs_maintenance">
                        Needs Maintenance
                      </option>
                    </select>

                    <p className="text-xs text-gray-500 mt-1">
                      Good makes the asset available. Damaged or Needs
                      Maintenance moves it to maintenance.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Note
                    </label>

                    <textarea
                      value={adminNote}
                      onChange={(event) => setAdminNote(event.target.value)}
                      rows={3}
                      placeholder="Write inspection details or reason for rejection..."
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      onClick={() => reviewReturn("approved")}
                      disabled={submitting}
                      className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Processing..." : "Approve Return"}
                    </button>

                    <button
                      onClick={() => reviewReturn("rejected")}
                      disabled={submitting}
                      className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting ? "Processing..." : "Reject Request"}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end border-t pt-4">
                <button
                  onClick={closeDetails}
                  disabled={submitting}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
