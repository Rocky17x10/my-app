
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNavigation from "../components/AdminNavigation";

const API_URL = "http://localhost:3001";

type RequestStatus = "pending" | "approved" | "rejected";

type AssetRequest = {
  id: number;
  itemName: string;
  category: string;
  reason: string;
  status: RequestStatus;
  adminNote: string | null;
  createdAt: string;
  requestedBy?: {
    id: number;
    name: string;
    email: string;
  };
  reviewedBy?: {
    id: number;
    name: string;
  } | null;
};

type UserProfile = {
  userId: number;
  name: string;
  email: string;
  role: string;
  department?: string | null;
};

type StatusFilter = "all" | RequestStatus;

export default function AssetRequestsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const [selectedRequest, setSelectedRequest] =
    useState<AssetRequest | null>(null);

  const [adminNote, setAdminNote] = useState("");
  const [reviewingId, setReviewingId] = useState<number | null>(null);

  const getToken = () => sessionStorage.getItem("access_token");

  const loadRequests = useCallback(
    async (token: string) => {
      const response = await fetch(`${API_URL}/asset-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        sessionStorage.removeItem("access_token");
        router.push("/login");
        return;
      }

      if (response.status === 403) {
        router.push("/my-assets");
        return;
      }

      if (!response.ok) {
        throw new Error("Could not load asset requests.");
      }

      const data = await response.json();
      setRequests(data);
    },
    [router]
  );

  useEffect(() => {
    const loadPage = async () => {
      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const profileResponse = await fetch(
          `${API_URL}/auth/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            cache: "no-store",
          }
        );

        if (!profileResponse.ok) {
          sessionStorage.removeItem("access_token");
          router.push("/login");
          return;
        }

        const profileData = await profileResponse.json();
        const currentUser = profileData.user as UserProfile;

        if (
          currentUser.role !== "admin" &&
          currentUser.role !== "super_admin"
        ) {
          router.push("/my-assets");
          return;
        }

        setProfile(currentUser);
        await loadRequests(token);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading requests."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [router, loadRequests]);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus =
        filter === "all" || request.status === filter;

      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        !searchText ||
        request.itemName.toLowerCase().includes(searchText) ||
        request.category.toLowerCase().includes(searchText) ||
        (request.requestedBy?.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (request.requestedBy?.email || "")
          .toLowerCase()
          .includes(searchText) ||
        String(request.id).includes(searchText);

      return matchesStatus && matchesSearch;
    });
  }, [requests, filter, search]);

  const counts = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
    }),
    [requests]
  );

  // Open details for pending, approved, and rejected requests.
  const openReview = (request: AssetRequest) => {
    setSelectedRequest(request);
    setAdminNote("");
    setError("");
    setSuccess("");
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedRequest || selectedRequest.status !== "pending") return;

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setError("");
    setSuccess("");
    setReviewingId(selectedRequest.id);

    try {
      const response = await fetch(
        `${API_URL}/asset-requests/${selectedRequest.id}/review`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            adminNote: adminNote.trim(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        sessionStorage.removeItem("access_token");
        router.push("/login");
        return;
      }

      if (response.status === 403) {
        throw new Error("You are not authorized to review requests.");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to review this request."
        );
      }

      setRequests((previous) =>
        previous.map((request) =>
          request.id === selectedRequest.id ? data : request
        )
      );

      setSelectedRequest(null);
      setAdminNote("");

      setSuccess(
        `Request #${selectedRequest.id} has been ${status}.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while reviewing the request."
      );
    } finally {
      setReviewingId(null);
    }
  };

  const getStatusStyle = (status: RequestStatus) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const closeModal = () => {
    if (reviewingId !== null) return;
    setSelectedRequest(null);
    setAdminNote("");
  };

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading asset requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Asset Request Management
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Review and manage employee equipment requests.
            </p>
          </div>

          {/* Shared five-tab navigation */}
          <AdminNavigation activeTab="asset-requests" />

          {/* Logout remains separate from navigation */}
          <div className="flex justify-end">
            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Admin Profile */}
        {profile && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">
              Administrator Information
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">{profile.name}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{profile.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Role</p>
                <p className="font-medium text-gray-900 capitalize">
                  {profile.role.replace("_", " ")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Summary Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Total Requests</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {counts.total}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {counts.pending}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {counts.approved}
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">Rejected</p>
            <p className="text-3xl font-bold text-red-600 mt-2">
              {counts.rejected}
            </p>
          </div>
        </section>

        {/* Request List */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Employee Requests
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Review employee requests and track their status.
              </p>
            </div>

            <button
              onClick={() => {
                const token = getToken();

                if (token) {
                  setError("");
                  setSuccess("");
                  loadRequests(token).catch((err) =>
                    setError(err.message || "Refresh failed.")
                  );
                }
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Refresh Requests
            </button>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search employee, email, equipment or request ID..."
              className="w-full lg:flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            />

            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as StatusFilter)
              }
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Requests</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            Showing {filteredRequests.length} of {requests.length} requests
          </div>

          {filteredRequests.length === 0 ? (
            <div className="text-center py-12">
              <p className="font-medium text-gray-600">
                No asset requests found.
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Try changing your search or status filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-gray-600">
                    <th className="px-4 py-3 font-semibold">Request</th>
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 font-semibold">Equipment</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-4 font-medium text-gray-900">
                        #{request.id}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {request.requestedBy?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {request.requestedBy?.email || "No email"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {request.itemName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {request.category}
                        </p>
                      </td>

                      <td className="px-4 py-4 text-gray-600 whitespace-nowrap">
                        {formatDate(request.createdAt)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <button
                          type="button"
                          onClick={() => openReview(request)}
                          className={`font-medium ${
                            request.status === "pending"
                              ? "text-blue-600 hover:text-blue-800"
                              : "text-gray-600 hover:text-gray-900"
                          }`}
                        >
                          {request.status === "pending"
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
      </main>

      {/* Request Details and Review Modal */}
      {selectedRequest && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Request #{selectedRequest.id}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Employee equipment request details
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={reviewingId !== null}
                className="text-2xl text-gray-400 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {/* Requester Details */}
            <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">
                Employee Information
              </h3>

              <p className="text-sm text-gray-700">
                <span className="text-gray-500">Name: </span>
                {selectedRequest.requestedBy?.name || "Unknown"}
              </p>

              <p className="text-sm text-gray-700 mt-2">
                <span className="text-gray-500">Email: </span>
                {selectedRequest.requestedBy?.email || "No email"}
              </p>
            </div>

            {/* Equipment Details */}
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Equipment
                </p>
                <p className="font-medium text-gray-900 mt-1">
                  {selectedRequest.itemName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Category
                </p>
                <p className="text-gray-900 mt-1">
                  {selectedRequest.category}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Employee Reason
                </p>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                  {selectedRequest.reason}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Submission Date
                </p>
                <p className="text-gray-700 mt-1">
                  {formatDate(selectedRequest.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Current Status
                </p>
                <span
                  className={`inline-flex mt-2 rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                    selectedRequest.status
                  )}`}
                >
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            {/* Previous Review Information */}
            {selectedRequest.status !== "pending" && (
              <div className="mt-5 rounded-lg border border-gray-200 p-4">
                <h3 className="font-semibold text-gray-900">
                  Review Information
                </h3>

                <p className="text-sm text-gray-700 mt-3">
                  Reviewed by:{" "}
                  <span className="font-medium">
                    {selectedRequest.reviewedBy?.name || "Unknown"}
                  </span>
                </p>

                <p className="text-xs font-semibold uppercase text-gray-500 mt-4">
                  Admin Note
                </p>

                <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                  {selectedRequest.adminNote || "No admin note provided."}
                </p>
              </div>
            )}

            {/* Review Form - Pending Requests Only */}
            {selectedRequest.status === "pending" && (
              <div className="mt-6 border-t border-gray-200 pt-5">
                <label
                  htmlFor="adminNote"
                  className="block text-sm font-semibold text-gray-700 mb-2"
                >
                  Admin Note (Optional)
                </label>

                <textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Write a note for the employee..."
                  rows={4}
                  maxLength={2000}
                  disabled={reviewingId !== null}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />

                <p className="text-xs text-gray-400 mt-1">
                  {adminNote.length}/2000 characters
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-5">
                  <button
                    type="button"
                    onClick={() => handleReview("approved")}
                    disabled={reviewingId !== null}
                    className="flex-1 rounded-lg bg-green-600 px-5 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {reviewingId === selectedRequest.id
                      ? "Processing..."
                      : "Approve Request"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReview("rejected")}
                    disabled={reviewingId !== null}
                    className="flex-1 rounded-lg bg-red-600 px-5 py-3 font-medium text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {reviewingId === selectedRequest.id
                      ? "Processing..."
                      : "Reject Request"}
                  </button>

                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={reviewingId !== null}
                    className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Already Reviewed: Details Only */}
            {selectedRequest.status !== "pending" && (
              <div className="mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
