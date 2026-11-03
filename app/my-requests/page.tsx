
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:3001";

type AssetRequest = {
  id: number;
  itemName: string;
  category: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  adminNote: string | null;
  createdAt: string;
  reviewedBy?: {
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

export default function MyRequestsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<AssetRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState("Computer");
  const [reason, setReason] = useState("");

  const getToken = () => sessionStorage.getItem("access_token");

  const loadRequests = useCallback(async (token: string) => {
    const response = await fetch(`${API_URL}/asset-requests/my`, {
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

    if (!response.ok) {
      throw new Error("Could not load your asset requests.");
    }

    const data = await response.json();
    setRequests(data);
  }, [router]);

  useEffect(() => {
    const loadPage = async () => {
      const token = getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const profileResponse = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!profileResponse.ok) {
          sessionStorage.removeItem("access_token");
          router.push("/login");
          return;
        }

        const profileData = await profileResponse.json();
        const currentUser = profileData.user;

        if (
          currentUser.role === "admin" ||
          currentUser.role === "super_admin"
        ) {
          router.push("/asset-requests");
          return;
        }

        setProfile(currentUser);
        await loadRequests(token);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while loading the page."
        );
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [router, loadRequests]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!itemName.trim() || !category || !reason.trim()) {
      setError("Please complete all fields.");
      return;
    }

    const token = getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/asset-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          itemName: itemName.trim(),
          category,
          reason: reason.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        sessionStorage.removeItem("access_token");
        router.push("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to submit your request."
        );
      }

      setItemName("");
      setCategory("Computer");
      setReason("");
      setSuccess("Your asset request was submitted successfully.");

      await loadRequests(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting your request."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-700";
      case "rejected":
        return "bg-red-100 text-red-700";
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading your requests...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Asset Requests
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Request equipment and track your request status.
            </p>
          </div>

          <nav className="flex flex-wrap gap-4 text-sm font-medium">
            <Link
              href="/my-assets"
              className="text-gray-600 hover:text-blue-600"
            >
              My Assets
            </Link>
            <Link
              href="/my-requests"
              className="text-blue-600"
            >
              My Requests
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {profile && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
            <h2 className="text-lg font-semibold text-gray-900">
              Employee Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium text-gray-900">
                  {profile.name}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium text-gray-900">
                  {profile.email}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium text-gray-900">
                  {profile.department || "Not assigned"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Request Equipment
              </h2>
              <p className="text-sm text-gray-500 mt-1 mb-6">
                Tell your IT department what equipment you need.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="itemName"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Equipment Name
                  </label>
                  <input
                    id="itemName"
                    type="text"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    placeholder="e.g. Dell Laptop"
                    maxLength={150}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Computer">Computer</option>
                    <option value="Network Device">Network Device</option>
                    <option value="Server">Server</option>
                    <option value="Printer">Printer</option>
                    <option value="Accessories">Accessories</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="reason"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Reason for Request
                  </label>
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Explain why you need this equipment..."
                    rows={5}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg">
                    {success}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-blue-600 text-white font-medium py-3 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </button>
              </form>
            </div>
          </section>

          <section className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Request History
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Track the progress of your equipment requests.
                  </p>
                </div>
                <span className="text-sm text-gray-500">
                  Total requests: {requests.length}
                </span>
              </div>

              {requests.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 font-medium">
                    You haven't submitted any requests yet.
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Your submitted requests will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-200 rounded-lg p-5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {request.itemName}
                          </h3>
                          <p className="text-sm text-gray-500 mt-1">
                            {request.category} · Request #{request.id}
                          </p>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold capitalize ${getStatusStyle(
                            request.status
                          )}`}
                        >
                          {request.status}
                        </span>
                      </div>

                      <div className="mt-4">
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Reason
                        </p>
                        <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                          {request.reason}
                        </p>
                      </div>

                      <div className="mt-4 text-xs text-gray-500">
                        Submitted:{" "}
                        {new Date(request.createdAt).toLocaleString()}
                      </div>

                      {request.reviewedBy && (
                        <div className="mt-3 text-sm text-gray-600">
                          Reviewed by:{" "}
                          <span className="font-medium">
                            {request.reviewedBy.name}
                          </span>
                        </div>
                      )}

                      {request.adminNote && (
                        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
                          <p className="text-xs font-semibold text-gray-500 uppercase">
                            IT Department Note
                          </p>
                          <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                            {request.adminNote}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
