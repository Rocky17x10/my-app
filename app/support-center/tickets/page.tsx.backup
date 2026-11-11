
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminNavigation from "../../components/AdminNavigation";

const API_URL = "http://localhost:3001";

type TicketStatus =
  | "open"
  | "in_progress"
  | "waiting_for_employee"
  | "resolved"
  | "closed"
  | "reopened";

type TicketPriority = "low" | "medium" | "high" | "urgent";

type TicketMessage = {
  id: number;
  message: string;
  isInternalNote: boolean;
  createdAt: string;
  sender: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

type Ticket = {
  id: number;
  ticketNumber: string;
  subject: string;
  category: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdBy: {
    id: number;
    name: string;
    email: string;
    department?: string;
  };
  assignedTo?: {
    id: number;
    name: string;
  } | null;
  messages?: TicketMessage[];
};

type Profile = {
  userId: number;
  name: string;
  email: string;
  role: string;
};

const statusOptions: TicketStatus[] = [
  "open",
  "in_progress",
  "waiting_for_employee",
  "resolved",
  "closed",
  "reopened",
];

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_for_employee: "Waiting for Employee",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};

const statusColors: Record<TicketStatus, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  waiting_for_employee: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-200 text-gray-700",
  reopened: "bg-purple-100 text-purple-700",
};

const priorityColors: Record<TicketPriority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function displayStatus(status: TicketStatus) {
  return statusLabels[status] ?? status;
}

export default function SupportTicketsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [reply, setReply] = useState("");
  const [newStatus, setNewStatus] = useState<TicketStatus>("open");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => sessionStorage.getItem("access_token");

  const loadTickets = useCallback(async () => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setTicketsLoading(true);

    try {
      const response = await fetch(`${API_URL}/support-tickets`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401 || response.status === 403) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load support tickets.");
      }

      const data: Ticket[] = await response.json();
      setTickets(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setTicketsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const initialize = async () => {
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
        });

        if (!response.ok) {
          sessionStorage.removeItem("access_token");
          router.replace("/login");
          return;
        }

        const profileData = await response.json();
        const currentUser: Profile = profileData.user ?? profileData;

        if (
          currentUser.role !== "admin" &&
          currentUser.role !== "super_admin"
        ) {
          router.replace("/my-requests");
          return;
        }

        setProfile(currentUser);
        await loadTickets();
      } catch (err) {
        console.error("Initialization error:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router, loadTickets]);

  const openTicket = async (ticketId: number) => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setDetailsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/support-tickets/${ticketId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to load ticket details.");
      }

      const data: Ticket = await response.json();

      setSelectedTicket(data);
      setNewStatus(data.status);
      setReply("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load ticket."
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/support-tickets/${selectedTicket.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            message: reply.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to send reply.");
      }

      setSelectedTicket(data);
      setReply("");
      setSuccess("Reply sent successfully.");

      await loadTickets();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send reply."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateTicketStatus = async () => {
    if (!selectedTicket) return;

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/support-tickets/${selectedTicket.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to update status.");
      }

      setSelectedTicket(data);
      setNewStatus(data.status);
      setSuccess("Ticket status updated successfully.");

      await loadTickets();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update status."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        ticket.ticketNumber.toLowerCase().includes(searchText) ||
        ticket.subject.toLowerCase().includes(searchText) ||
        ticket.createdBy.name.toLowerCase().includes(searchText) ||
        ticket.createdBy.email.toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || ticket.priority === priorityFilter;

      const matchesCategory =
        categoryFilter === "all" || ticket.category === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesCategory
      );
    });
  }, [tickets, search, statusFilter, priorityFilter, categoryFilter]);

  const categories = Array.from(
    new Set(tickets.map((ticket) => ticket.category))
  );

  const countByStatus = (status: TicketStatus) =>
    tickets.filter((ticket) => ticket.status === status).length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading Support Tickets...</p>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col justify-between gap-4 rounded-xl bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              IT Support Tickets
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Manage employee IT problems and support requests.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Logged in as: {profile.name} ({profile.role})
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
          >
            Logout
          </button>
        </header>

        <AdminNavigation activeTab="asset-requests" />

        <div>
          <Link
            href="/support-center"
            className="text-sm font-semibold text-blue-600 hover:underline"
          >
            ← Back to Support Center
          </Link>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-3 font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Tickets</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {tickets.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Open</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {countByStatus("open") + countByStatus("reopened")}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="mt-2 text-3xl font-bold text-yellow-600">
              {countByStatus("in_progress")}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Resolved / Closed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {countByStatus("resolved") + countByStatus("closed")}
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                All Support Tickets
              </h2>
              <p className="text-sm text-gray-500">
                {filteredTickets.length} ticket(s) found
              </p>
            </div>

            <button
              onClick={loadTickets}
              disabled={ticketsLoading}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {ticketsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ticket, employee or subject..."
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {displayStatus(status)}
                </option>
              ))}
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
            >
              <option value="all">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {ticketsLoading ? (
            <p className="py-10 text-center text-gray-500">
              Loading tickets...
            </p>
          ) : filteredTickets.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
              <p className="font-semibold text-gray-700">
                No support tickets found.
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="border-b bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 font-semibold text-blue-700">
                        {ticket.ticketNumber}
                      </td>

                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900">
                          {ticket.createdBy.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {ticket.createdBy.email}
                        </p>
                      </td>

                      <td className="max-w-[220px] px-4 py-4 font-medium text-gray-800">
                        {ticket.subject}
                      </td>

                      <td className="px-4 py-4">{ticket.category}</td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorityColors[ticket.priority]}`}
                        >
                          {ticket.priority}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[ticket.status]}`}
                        >
                          {displayStatus(ticket.status)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-gray-500">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-4 py-4">
                        <button
                          onClick={() => openTicket(ticket.id)}
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

        {detailsLoading && (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
            Loading ticket details...
          </div>
        )}

        {selectedTicket && !detailsLoading && (
          <section className="space-y-5 rounded-xl bg-white p-5 shadow-sm md:p-7">
            <div className="flex flex-col justify-between gap-3 border-b pb-5 md:flex-row md:items-start">
              <div>
                <p className="text-sm font-semibold text-blue-700">
                  {selectedTicket.ticketNumber}
                </p>

                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {selectedTicket.subject}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Created {formatDate(selectedTicket.createdAt)}
                </p>
              </div>

              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close Details
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Employee
                  </p>
                  <p className="mt-1 font-semibold text-gray-900">
                    {selectedTicket.createdBy.name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedTicket.createdBy.email}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedTicket.createdBy.department || "No department"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Category
                  </p>
                  <p className="mt-1 text-gray-900">
                    {selectedTicket.category}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Priority
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${priorityColors[selectedTicket.priority]}`}
                  >
                    {selectedTicket.priority}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    Current Status
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusColors[selectedTicket.status]}`}
                  >
                    {displayStatus(selectedTicket.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-5">
              <h3 className="font-bold text-gray-900">
                Employee Description
              </h3>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-gray-700">
                {selectedTicket.description}
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-lg font-bold text-gray-900">
                Conversation History
              </h3>

              {selectedTicket.messages &&
              selectedTicket.messages.length > 0 ? (
                <div className="space-y-4">
                  {selectedTicket.messages.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex flex-col justify-between gap-1 sm:flex-row">
                        <p className="font-semibold text-gray-900">
                          {message.sender.name}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            {message.sender.role}
                          </span>
                        </p>

                        <p className="text-xs text-gray-500">
                          {formatDate(message.createdAt)}
                        </p>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                        {message.message}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-gray-50 p-5 text-sm text-gray-500">
                  No replies yet.
                </p>
              )}
            </div>

            <div className="grid gap-5 border-t pt-5 lg:grid-cols-2">
              <div>
                <h3 className="mb-3 font-bold text-gray-900">
                  Update Ticket Status
                </h3>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <select
                    value={newStatus}
                    onChange={(e) =>
                      setNewStatus(e.target.value as TicketStatus)
                    }
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {displayStatus(status)}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={updateTicketStatus}
                    disabled={saving || newStatus === selectedTicket.status}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Update Status
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-bold text-gray-900">
                  Reply to Employee
                </h3>

                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  maxLength={5000}
                  placeholder="Write your reply to the employee..."
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-gray-500">
                    {reply.length}/5000 characters
                  </p>

                  <button
                    onClick={sendReply}
                    disabled={saving || !reply.trim()}
                    className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? "Please wait..." : "Send Reply"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
