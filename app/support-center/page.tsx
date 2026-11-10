
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminNavigation from "../components/AdminNavigation";
import NotificationBell from "../components/NotificationBell";

const API_URL = "http://localhost:3001";

type Profile = {
  userId: number;
  name: string;
  email: string;
  role: string;
  department?: string;
};

export default function SupportCenterPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          sessionStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }

        const profileData = await response.json();
        const data: Profile = profileData.user ?? profileData;

        if (data.role !== "admin" && data.role !== "super_admin") {
          router.replace("/my-requests");
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error("Unable to load profile:", error);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading Support Center...</p>
      </main>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Support Center
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage employee asset requests and IT support tickets.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Logged in as: {profile.name} ({profile.role})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell ticketHref="/support-center/tickets" />

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

        <AdminNavigation activeTab="asset-requests" />

        <section>
          <h2 className="text-xl font-bold text-gray-900">
            Support Services
          </h2>

          <p className="mt-1 text-sm text-gray-600">
            Select a service to continue.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">
              💻
            </div>

            <h3 className="text-lg font-bold text-gray-900">
              Asset Requests
            </h3>

            <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">
              Review employee requests for laptops, computers, accessories,
              and other IT equipment. Approve or reject requests and add
              Admin notes.
            </p>

            <Link
              href="/asset-requests"
              className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open Asset Requests
            </Link>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">
              🎫
            </div>

            <h3 className="text-lg font-bold text-gray-900">
              IT Support Tickets
            </h3>

            <p className="mt-2 min-h-12 text-sm leading-6 text-gray-600">
              Handle employee IT problems, track ticket priorities, communicate
              with employees, and manage ticket status and resolution.
            </p>

            <Link
              href="/support-center/tickets"
              className="mt-6 inline-flex rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Open IT Support Tickets
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
