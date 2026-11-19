
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AdminNavigation from "../components/AdminNavigation";

const API_URL = "http://localhost:3001";

export default function ChangePasswordPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must contain at least 8 characters.");
      return;
    }

    if (newPassword.length > 72) {
      setError("New password cannot exceed 72 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different from current password.");
      return;
    }

    const token = sessionStorage.getItem("access_token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/change-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        sessionStorage.removeItem("access_token");
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          Array.isArray(result?.message)
            ? result.message.join(", ")
            : result?.message || "Password change failed."
        );
      }

      setMessage(
        result?.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 sm:p-8">
      <div className="mx-auto max-w-7xl">

        <div className="mb-8 rounded-xl bg-white p-4 shadow-sm">
          <h1 className="mb-4 text-xl font-bold">
            IT Inventory System
          </h1>

          <AdminNavigation activeTab="change-password" />
        </div>

        <header className="mb-6">
          <h2 className="text-3xl font-bold">
            Change Password
          </h2>

          <p className="mt-2 text-gray-600">
            Update your account password securely.
          </p>
        </header>

        <section className="max-w-2xl rounded-xl bg-white p-6 shadow-sm">

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            <div>
              <label
                htmlFor="currentPassword"
                className="mb-2 block text-sm font-semibold"
              >
                Current Password
              </label>

              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(event) =>
                  setCurrentPassword(event.target.value)
                }
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="Enter your current password"
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="mb-2 block text-sm font-semibold"
              >
                New Password
              </label>

              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) =>
                  setNewPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="Enter your new password"
              />

              <p className="mt-1 text-xs text-gray-500">
                Password must contain at least 8 characters.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-2 block text-sm font-semibold"
              >
                Confirm New Password
              </label>

              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                autoComplete="new-password"
                minLength={8}
                maxLength={72}
                required
                className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
                placeholder="Confirm your new password"
              />
            </div>

            {message && (
              <div className="rounded-lg bg-green-100 p-3 text-sm text-green-800">
                {message}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-100 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Changing Password..." : "Change Password"}
              </button>

              <Link
                href="/dashboard"
                className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </Link>

            </div>

          </form>
        </section>

        <p className="mt-6 text-center text-xs text-gray-400">
          IT Inventory Management System
        </p>

      </div>
    </main>
  );
}
