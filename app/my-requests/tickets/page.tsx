
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TicketDetailsModal from "../../components/TicketDetailsModal";
import NotificationBell from "../../components/NotificationBell";

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
  createdAt: string;
  sender: {
    id: number;
    name: string;
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
  createdBy: {
    id: number;
    name: string;
    email: string;
  };
  messages?: TicketMessage[];
};

type Profile = {
  userId: number;
  name: string;
  email: string;
  role: string;
};

const categories = [
  "Hardware",
  "Software",
  "Network",
  "Internet",
  "Email",
  "Printer",
  "Account Access",
  "Other",
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

export default function MySupportTicketsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showCreateForm, setShowCreateForm] = useState(false);

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Hardware");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [description, setDescription] = useState("");
  const [reply, setReply] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const getToken = () => sessionStorage.getItem("access_token");

  const loadMyTickets = useCallback(async () => {
    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    setTicketsLoading(true);

    try {
      const response = await fetch(`${API_URL}/support-tickets/my`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load your support tickets.");
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
          currentUser.role === "admin" ||
          currentUser.role === "super_admin"
        ) {
          router.replace("/asset-requests");
          return;
        }

        setProfile(currentUser);
        await loadMyTickets();
      } catch (err) {
        console.error("Profile loading error:", err);
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [router, loadMyTickets]);

  const createTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const token = getToken();

    if (!token) {
      router.replace("/login");
      return;
    }

    if (description.trim().length < 10) {
      setError("Description must contain at least 10 characters.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/support-tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          priority,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to submit support ticket."
        );
      }

      setSubject("");
      setCategory("Hardware");
      setPriority("medium");
      setDescription("");
      setShowCreateForm(false);

      setSuccess(
        `Ticket ${data.ticketNumber} submitted successfully.`
      );

      await loadMyTickets();
      await openTicket(data.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to submit ticket."
      );
    } finally {
      setSaving(false);
    }
  };

  const openTicket = useCallback(async (ticketId: number) => {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Unable to load ticket details.");
      }

      setSelectedTicket(data);
      setReply("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load ticket."
      );
    } finally {
      setDetailsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const handleNotificationTicket = (event: Event) => {
      const customEvent = event as CustomEvent<{ ticketId: number }>;
      const ticketId = Number(customEvent.detail?.ticketId);

      if (Number.isInteger(ticketId) && ticketId > 0) {
        openTicket(ticketId);
      }
    };

    window.addEventListener(
      "open-support-ticket",
      handleNotificationTicket
    );

    const params = new URLSearchParams(window.location.search);
    const ticketId = Number(params.get("ticketId"));

    if (Number.isInteger(ticketId) && ticketId > 0) {
      openTicket(ticketId);
    }

    return () => {
      window.removeEventListener(
        "open-support-ticket",
        handleNotificationTicket
      );
    };
  }, [openTicket]);

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
      setSuccess("Your reply was sent successfully.");

      await loadMyTickets();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to send reply."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading your Support Center...</p>
      </main>
    );
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Header and navigation */}
        <header className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Support Center
            </h1>

            <p className="mt-1 text-sm text-gray-600">
              Submit IT problems and communicate with the IT Admin team.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Logged in as: {profile.name}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/my-assets"
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              My Assets
            </Link>

            <Link
              href="/my-requests"
              className="rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
            >
              Asset Requests
            </Link>

            <Link
              href="/my-requests/tickets"
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              IT Support Tickets
            </Link>

            <NotificationBell ticketHref="/my-requests/tickets" />

            <button
              onClick={handleLogout}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

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

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">My Total Tickets</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {tickets.length}
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Open / In Progress</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {
                tickets.filter(
                  (ticket) =>
                    ticket.status === "open" ||
                    ticket.status === "in_progress" ||
                    ticket.status === "reopened" ||
                    ticket.status === "waiting_for_employee"
                ).length
              }
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Resolved / Closed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {
                tickets.filter(
                  (ticket) =>
                    ticket.status === "resolved" ||
                    ticket.status === "closed"
                ).length
              }
            </p>
          </div>
        </section>

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                My IT Support Tickets
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                View and track all your submitted IT problems.
              </p>
            </div>

            <button
              onClick={() => {
                setShowCreateForm(!showCreateForm);
                setError("");
                setSuccess("");
              }}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {showCreateForm ? "Cancel" : "+ Create New Ticket"}
            </button>
          </div>

          {showCreateForm && (
            <form
              onSubmit={createTicket}
              className="mt-6 space-y-5 rounded-lg border border-gray-200 bg-gray-50 p-5"
            >
              <h3 className="text-lg font-bold text-gray-900">
                Submit New IT Support Ticket
              </h3>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Subject
                </label>

                <input
                  type="text"
                  required
                  maxLength={200}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Example: My computer is not starting"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  >
                    {categories.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Priority
                  </label>

                  <select
                    value={priority}
                    onChange={(e) =>
                      setPriority(e.target.value as TicketPriority)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-800">
                  Problem Description
                </label>

                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain your IT problem in detail..."
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <p className="mt-1 text-xs text-gray-500">
                  {description.length}/5000 characters (minimum 10)
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={
                    saving ||
                    !subject.trim() ||
                    description.trim().length < 10
                  }
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Submitting..." : "Submit Ticket"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            {ticketsLoading ? (
              <p className="py-10 text-center text-gray-500">
                Loading your tickets...
              </p>
            ) : tickets.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
                <p className="font-semibold text-gray-700">
                  You haven't submitted any IT support tickets yet.
                </p>

                <p className="mt-2 text-sm text-gray-500">
                  Click Create New Ticket when you need IT assistance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] text-left text-sm">
                  <thead className="border-b bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Ticket Number</th>
                      <th className="px-4 py-3">Subject</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Created</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {tickets.map((ticket) => (
                      <tr key={ticket.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-semibold text-blue-700">
                          {ticket.ticketNumber}
                        </td>

                        <td className="px-4 py-4 font-medium text-gray-900">
                          {ticket.subject}
                        </td>

                        <td className="px-4 py-4 text-gray-700">
                          {ticket.category}
                        </td>

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
                            {statusLabels[ticket.status]}
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
          </div>
        </section>

        {detailsLoading && (
          <div className="rounded-xl bg-white p-6 text-center text-gray-500 shadow-sm">
            Loading ticket details...
          </div>
        )}

        {selectedTicket && !detailsLoading && (
          <TicketDetailsModal
            ticketNumber={selectedTicket.ticketNumber}
            subject={selectedTicket.subject}
            createdAt={selectedTicket.createdAt}
            onClose={() => setSelectedTicket(null)}
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Category
                </p>
                <p className="mt-1 font-medium text-gray-900">
                  {selectedTicket.category}
                </p>
              </div>

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
                  {statusLabels[selectedTicket.status]}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-5">
              <h3 className="font-bold text-gray-900">
                Your Problem Description
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
                          <span className="ml-2 text-xs font-normal capitalize text-gray-500">
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
                  No replies yet. The IT Admin team will respond here.
                </p>
              )}
            </div>

            <div className="border-t pt-5">
              <h3 className="mb-3 font-bold text-gray-900">
                Reply to IT Admin
              </h3>

              <textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Write additional information or reply to Admin..."
                className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-black placeholder:text-gray-500 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
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

              {(selectedTicket.status === "resolved" ||
                selectedTicket.status === "closed") && (
                <p className="mt-3 text-sm text-orange-700">
                  Replying to this ticket will reopen it for IT Admin review.
                </p>
              )}
            </div>
          </TicketDetailsModal>
        )}
      </div>
    </main>
  );
}
