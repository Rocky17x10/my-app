
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import AdminNavigation from "../components/AdminNavigation";
import NotificationBell from "../components/NotificationBell";

const API_URL = "http://localhost:3001";

type ReportType =
  | "assets"
  | "employees"
  | "departments"
  | "assigned"
  | "available"
  | "maintenance"
  | "history";

type AssetStatus = "available" | "assigned" | "maintenance" | "retired";

type Asset = {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serialNumber?: string | null;
  status: AssetStatus;
  department: string | null;
  location: string | null;
  purchaseDate?: string | null;
  createdAt?: string;
  assignedTo?: {
    id: number;
    name: string;
    email?: string;
  } | null;
};

type EmployeeReport = {
  id: number;
  name: string;
  email: string;
  department: string | null;
  designation: string | null;
  assignedAssetCount: number;
  assignedAssets: Asset[];
};

type DepartmentReport = {
  department: string;
  totalAssets: number;
  assignedAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
  retiredAssets: number;
  totalEmployees: number;
};

type MaintenanceRecord = {
  id: number;
  asset: Asset;
  createdBy: { id: number; name: string } | null;
  completedBy: { id: number; name: string } | null;
  maintenanceType: string;
  problemDescription: string;
  repairDetails: string | null;
  startDate: string;
  completionDate: string | null;
  cost: string | number;
  serviceProvider: string | null;
  status: "in_progress" | "completed";
  createdAt: string;
};

type AssignmentHistory = {
  id: number;
  asset: Asset;
  assignedTo: { id: number; name: string; email?: string };
  assignedBy: { id: number; name: string } | null;
  assignedAt: string;
  returnedAt: string | null;
};

type Profile = {
  userId?: number;
  id?: number;
  name: string;
  email: string;
  role: string;
};

type ReportData = {
  assets: Asset[];
  employees: EmployeeReport[];
  departments: DepartmentReport[];
  assigned: Asset[];
  available: Asset[];
  maintenance: MaintenanceRecord[];
  history: AssignmentHistory[];
};

const emptyReports: ReportData = {
  assets: [],
  employees: [],
  departments: [],
  assigned: [],
  available: [],
  maintenance: [],
  history: [],
};

const reportOptions: { id: ReportType; label: string }[] = [
  { id: "assets", label: "All Assets" },
  { id: "employees", label: "Employee-wise" },
  { id: "departments", label: "Department-wise" },
  { id: "assigned", label: "Assigned Assets" },
  { id: "available", label: "Available Assets" },
  { id: "maintenance", label: "Maintenance" },
  { id: "history", label: "Assignment History" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString();
}

function formatMoney(value: string | number | null | undefined) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function dateMatches(
  value: string | null | undefined,
  fromDate: string,
  toDate: string,
) {
  if (!fromDate && !toDate) return true;
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  const dateString = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

  if (fromDate && dateString < fromDate) return false;
  if (toDate && dateString > toDate) return false;

  return true;
}

function matchesSearch(search: string, values: unknown[]) {
  const term = search.trim().toLowerCase();

  if (!term) return true;

  return values.some((value) =>
    String(value ?? "").toLowerCase().includes(term),
  );
}

export default function ReportsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [reports, setReports] = useState<ReportData>(emptyReports);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [activeReport, setActiveReport] =
    useState<ReportType>("assets");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const getToken = () => {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("access_token");
  };

  const handleUnauthorized = useCallback(() => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }, [router]);

  const loadReports = useCallback(async (token: string) => {
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    const endpoints = [
      "assets",
      "employees",
      "departments",
      "assigned-assets",
      "available-assets",
      "maintenance",
      "assignment-history",
    ];

    const responses = await Promise.all(
      endpoints.map((endpoint) =>
        fetch(`${API_URL}/reports/${endpoint}`, {
          headers,
          cache: "no-store",
        }),
      ),
    );

    for (const response of responses) {
      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Your session has expired. Please log in again.");
      }

      if (response.status === 403) {
        throw new Error("You do not have permission to view reports.");
      }

      if (!response.ok) {
        throw new Error(
          `Could not load reports. HTTP ${response.status}`,
        );
      }
    }

    const data = await Promise.all(
      responses.map((response) => response.json()),
    );

    setReports({
      assets: Array.isArray(data[0]) ? data[0] : [],
      employees: Array.isArray(data[1]) ? data[1] : [],
      departments: Array.isArray(data[2]) ? data[2] : [],
      assigned: Array.isArray(data[3]) ? data[3] : [],
      available: Array.isArray(data[4]) ? data[4] : [],
      maintenance: Array.isArray(data[5]) ? data[5] : [],
      history: Array.isArray(data[6]) ? data[6] : [],
    });
  }, [handleUnauthorized]);

  const refreshReports = useCallback(async () => {
    const token = getToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    setRefreshing(true);
    setError("");

    try {
      await loadReports(token);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not refresh reports.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [handleUnauthorized, loadReports]);

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
        await loadReports(token);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : "Could not load reports.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void initializePage();

    return () => {
      active = false;
    };
  }, [router, handleUnauthorized, loadReports]);

  const departments = useMemo(() => {
    const names = new Set<string>();

    reports.assets.forEach((asset) => {
      if (asset.department) names.add(asset.department);
    });

    reports.employees.forEach((employee) => {
      if (employee.department) names.add(employee.department);
    });

    return Array.from(names).sort();
  }, [reports]);

  // Filter asset reports
  const filteredAssets = useMemo(() => {
    const source =
      activeReport === "assigned"
        ? reports.assigned
        : activeReport === "available"
          ? reports.available
          : reports.assets;

    return source.filter((asset) => {
      const matchesStatus =
        statusFilter === "all" || asset.status === statusFilter;

      const matchesDepartment =
        departmentFilter === "all" ||
        asset.department === departmentFilter;

      return (
        matchesStatus &&
        matchesDepartment &&
        dateMatches(asset.createdAt, fromDate, toDate) &&
        matchesSearch(search, [
          asset.assetTag,
          asset.name,
          asset.category,
          asset.brand,
          asset.model,
          asset.assignedTo?.name,
          asset.department,
          asset.location,
        ])
      );
    });
  }, [
    activeReport,
    reports,
    search,
    statusFilter,
    departmentFilter,
    fromDate,
    toDate,
  ]);

  // Filter employee reports
  const filteredEmployees = useMemo(
    () =>
      reports.employees.filter((employee) => {
        const matchesDepartment =
          departmentFilter === "all" ||
          employee.department === departmentFilter;

        return (
          matchesDepartment &&
          matchesSearch(search, [
            employee.name,
            employee.email,
            employee.department,
            employee.designation,
            ...employee.assignedAssets.map((asset) => asset.name),
          ])
        );
      }),
    [reports.employees, search, departmentFilter],
  );

  // Filter department reports
  const filteredDepartments = useMemo(
    () =>
      reports.departments.filter((department) =>
        matchesSearch(search, [department.department]),
      ),
    [reports.departments, search],
  );

  // Filter maintenance reports
  const filteredMaintenance = useMemo(
    () =>
      reports.maintenance.filter((record) => {
        const matchesStatus =
          statusFilter === "all" || record.status === statusFilter;

        const matchesDepartment =
          departmentFilter === "all" ||
          record.asset?.department === departmentFilter;

        return (
          matchesStatus &&
          matchesDepartment &&
          dateMatches(record.startDate, fromDate, toDate) &&
          matchesSearch(search, [
            record.id,
            record.asset?.assetTag,
            record.asset?.name,
            record.asset?.department,
            record.maintenanceType,
            record.problemDescription,
            record.serviceProvider,
            record.createdBy?.name,
          ])
        );
      }),
    [
      reports.maintenance,
      search,
      statusFilter,
      departmentFilter,
      fromDate,
      toDate,
    ],
  );

  // Filter assignment history
  const filteredHistory = useMemo(
    () =>
      reports.history.filter((record) => {
        const recordStatus = record.returnedAt ? "returned" : "active";

        const matchesStatus =
          statusFilter === "all" || recordStatus === statusFilter;

        const matchesDepartment =
          departmentFilter === "all" ||
          record.asset?.department === departmentFilter;

        return (
          matchesStatus &&
          matchesDepartment &&
          dateMatches(record.assignedAt, fromDate, toDate) &&
          matchesSearch(search, [
            record.asset?.assetTag,
            record.asset?.name,
            record.asset?.department,
            record.assignedTo?.name,
            record.assignedTo?.email,
            record.assignedBy?.name,
          ])
        );
      }),
    [
      reports.history,
      search,
      statusFilter,
      departmentFilter,
      fromDate,
      toDate,
    ],
  );

  const summary = useMemo(
    () => ({
      totalAssets: reports.assets.length,
      assigned: reports.assigned.length,
      available: reports.available.length,
      maintenance: reports.assets.filter(
        (asset) => asset.status === "maintenance",
      ).length,
      employees: reports.employees.length,
    }),
    [reports],
  );

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setDepartmentFilter("all");
    setFromDate("");
    setToDate("");
  }

  function logout() {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  }

  const activeLabel =
    reportOptions.find((option) => option.id === activeReport)?.label ??
    "Reports";

  // Excel export for all report categories
  function exportToExcel() {
    let rows: Record<string, string | number>[] = [];

    switch (activeReport) {
      case "assets":
      case "assigned":
      case "available":
        rows = filteredAssets.map((asset) => ({
          "Asset Tag": asset.assetTag,
          "Asset Name": asset.name,
          Category: asset.category,
          Brand: asset.brand || "—",
          Model: asset.model || "—",
          "Serial Number": asset.serialNumber || "—",
          "Assigned To": asset.assignedTo?.name || "—",
          Department: asset.department || "—",
          Location: asset.location || "—",
          Status: asset.status,
          "Purchase Date": formatDate(asset.purchaseDate),
          "Created Date": formatDate(asset.createdAt),
        }));
        break;

      case "employees":
        rows = filteredEmployees.map((employee) => ({
          Employee: employee.name,
          Email: employee.email,
          Department: employee.department || "—",
          Designation: employee.designation || "—",
          "Assigned Asset Count": employee.assignedAssetCount,
          "Assigned Asset Names":
            employee.assignedAssets.map((asset) => asset.name).join(", ") ||
            "None",
          "Assigned Asset Tags":
            employee.assignedAssets.map((asset) => asset.assetTag).join(", ") ||
            "None",
        }));
        break;

      case "departments":
        rows = filteredDepartments.map((department) => ({
          Department: department.department,
          Employees: department.totalEmployees,
          "Total Assets": department.totalAssets,
          Assigned: department.assignedAssets,
          Available: department.availableAssets,
          Maintenance: department.maintenanceAssets,
          Retired: department.retiredAssets,
        }));
        break;

      case "maintenance":
        rows = filteredMaintenance.map((record) => ({
          "Record ID": record.id,
          "Asset Tag": record.asset?.assetTag || "—",
          "Asset Name": record.asset?.name || "—",
          Department: record.asset?.department || "—",
          "Maintenance Type": record.maintenanceType,
          Problem: record.problemDescription,
          "Repair Details": record.repairDetails || "—",
          "Start Date": formatDate(record.startDate),
          "Completion Date": formatDate(record.completionDate),
          Cost: Number(record.cost || 0),
          "Service Provider": record.serviceProvider || "—",
          Status: record.status === "completed" ? "Completed" : "In Progress",
          "Created By": record.createdBy?.name || "—",
          "Completed By": record.completedBy?.name || "—",
        }));
        break;

      case "history":
        rows = filteredHistory.map((record) => ({
          "Asset Name": record.asset?.name || "—",
          "Asset Tag": record.asset?.assetTag || "—",
          Department: record.asset?.department || "—",
          "Assigned To": record.assignedTo?.name || "—",
          "Employee Email": record.assignedTo?.email || "—",
          "Assigned By": record.assignedBy?.name || "—",
          "Assigned Date": formatDate(record.assignedAt),
          "Returned Date": formatDate(record.returnedAt),
          Status: record.returnedAt ? "Returned" : "Active",
        }));
        break;
    }

    if (rows.length === 0) {
      setError("There are no records to export.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      activeLabel.slice(0, 31),
    );

    const fileName = activeLabel
      .replace(/[^a-z0-9]+/gi, "_")
      .replace(/^_+|_+$/g, "");

    XLSX.writeFile(workbook, `${fileName}_Report.xlsx`);
  }

  // PDF export for all report categories
  function exportToPDF() {
    let columns: string[] = [];
    let rows: (string | number)[][] = [];

    switch (activeReport) {
      case "assets":
      case "assigned":
      case "available":
        columns = [
          "Asset Tag",
          "Asset Name",
          "Category",
          "Brand / Model",
          "Assigned To",
          "Department",
          "Location",
          "Status",
        ];

        rows = filteredAssets.map((asset) => [
          asset.assetTag,
          asset.name,
          asset.category,
          [asset.brand, asset.model].filter(Boolean).join(" / ") || "—",
          asset.assignedTo?.name || "—",
          asset.department || "—",
          asset.location || "—",
          asset.status,
        ]);
        break;

      case "employees":
        columns = [
          "Employee",
          "Email",
          "Department",
          "Designation",
          "Assigned Count",
          "Assigned Assets",
        ];

        rows = filteredEmployees.map((employee) => [
          employee.name,
          employee.email,
          employee.department || "—",
          employee.designation || "—",
          employee.assignedAssetCount,
          employee.assignedAssets.map((asset) => asset.name).join(", ") || "None",
        ]);
        break;

      case "departments":
        columns = [
          "Department",
          "Employees",
          "Total Assets",
          "Assigned",
          "Available",
          "Maintenance",
          "Retired",
        ];

        rows = filteredDepartments.map((department) => [
          department.department,
          department.totalEmployees,
          department.totalAssets,
          department.assignedAssets,
          department.availableAssets,
          department.maintenanceAssets,
          department.retiredAssets,
        ]);
        break;

      case "maintenance":
        columns = [
          "Record ID",
          "Asset Tag",
          "Asset Name",
          "Department",
          "Maintenance Type",
          "Problem",
          "Start Date",
          "Completion Date",
          "Cost",
          "Provider",
          "Status",
        ];

        rows = filteredMaintenance.map((record) => [
          record.id,
          record.asset?.assetTag || "—",
          record.asset?.name || "—",
          record.asset?.department || "—",
          record.maintenanceType,
          record.problemDescription,
          formatDate(record.startDate),
          formatDate(record.completionDate),
          formatMoney(record.cost),
          record.serviceProvider || "—",
          record.status === "completed" ? "Completed" : "In Progress",
        ]);
        break;

      case "history":
        columns = [
          "Asset Name",
          "Asset Tag",
          "Department",
          "Assigned To",
          "Employee Email",
          "Assigned By",
          "Assigned Date",
          "Returned Date",
          "Status",
        ];

        rows = filteredHistory.map((record) => [
          record.asset?.name || "—",
          record.asset?.assetTag || "—",
          record.asset?.department || "—",
          record.assignedTo?.name || "—",
          record.assignedTo?.email || "—",
          record.assignedBy?.name || "—",
          formatDate(record.assignedAt),
          formatDate(record.returnedAt),
          record.returnedAt ? "Returned" : "Active",
        ]);
        break;
    }

    if (rows.length === 0) {
      setError("There are no records to export.");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const generatedAt = new Date().toLocaleString();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.text(
        "IT INVENTORY MANAGEMENT",
        pageWidth / 2,
        16,
        { align: "center" },
      );

      doc.setFontSize(13);
      doc.text(
        `${activeLabel.toUpperCase()} REPORT`,
        pageWidth / 2,
        24,
        { align: "center" },
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Generated: ${generatedAt}`, 14, 33);
      doc.text(`Total Records: ${rows.length}`, pageWidth - 14, 33, {
        align: "right",
      });

      autoTable(doc, {
        startY: 39,
        head: [columns],
        body: rows,
        theme: "grid",
        margin: {
          top: 15,
          right: 10,
          bottom: 18,
          left: 10,
        },
        styles: {
          font: "helvetica",
          fontSize: 7,
          cellPadding: 2,
          overflow: "linebreak",
          valign: "middle",
        },
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setFont("helvetica", "normal");

          doc.text(
            "IT Inventory Management Software",
            10,
            pageHeight - 8,
          );

          doc.text(
            `Page ${data.pageNumber}`,
            pageWidth - 10,
            pageHeight - 8,
            { align: "right" },
          );
        },
      });

      const fileName = activeLabel
        .replace(/[^a-z0-9]+/gi, "_")
        .replace(/^_+|_+$/g, "");

      doc.save(`${fileName}_Report.pdf`);
      setError("");
    } catch (err) {
      console.error("PDF export error:", err);
      setError("Could not generate PDF report.");
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading reports...</p>
      </main>
    );
  }

  const showAssetFilters =
    activeReport === "assets" ||
    activeReport === "assigned" ||
    activeReport === "available";

  const showDepartmentFilter =
    activeReport === "assets" ||
    activeReport === "assigned" ||
    activeReport === "available" ||
    activeReport === "employees" ||
    activeReport === "maintenance" ||
    activeReport === "history";

  const showStatusFilter =
    showAssetFilters ||
    activeReport === "maintenance" ||
    activeReport === "history";

  const showDateFilter =
    showAssetFilters ||
    activeReport === "maintenance" ||
    activeReport === "history";

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Reports & Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              View inventory, employee, department and maintenance reports.
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

          <AdminNavigation activeTab="reports" />
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

        {/* Summary cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Total Assets",
              value: summary.totalAssets,
              color: "text-blue-700",
            },
            {
              label: "Assigned Assets",
              value: summary.assigned,
              color: "text-purple-700",
            },
            {
              label: "Available Assets",
              value: summary.available,
              color: "text-green-700",
            },
            {
              label: "Under Maintenance",
              value: summary.maintenance,
              color: "text-orange-700",
            },
            {
              label: "Employees",
              value: summary.employees,
              color: "text-indigo-700",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className={`mt-2 text-3xl font-bold ${item.color}`}>
                {item.value}
              </p>
            </div>
          ))}
        </section>

        {/* Report categories */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Report Categories
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Select a report to view its records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {reportOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setActiveReport(option.id);
                  setStatusFilter("all");
                }}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  activeReport === option.id
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        {/* Filters */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-gray-900">
                Report Filters
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Filter {activeLabel.toLowerCase()} records.
              </p>
            </div>

            <button
              onClick={clearFilters}
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              Clear Filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search records..."
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            />

            {showStatusFilter && (
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>

                {activeReport === "maintenance" ? (
                  <>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </>
                ) : activeReport === "history" ? (
                  <>
                    <option value="active">Active</option>
                    <option value="returned">Returned</option>
                  </>
                ) : (
                  <>
                    <option value="available">Available</option>
                    <option value="assigned">Assigned</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="retired">Retired</option>
                  </>
                )}
              </select>
            )}

            {showDepartmentFilter && (
              <select
                value={departmentFilter}
                onChange={(event) =>
                  setDepartmentFilter(event.target.value)
                }
                className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            )}

            {showDateFilter && (
              <>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  aria-label="From date"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />

                <input
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => setToDate(event.target.value)}
                  aria-label="To date"
                  className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </>
            )}
          </div>
        </section>

        {/* Report results */}
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {activeLabel}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Report results from your inventory database.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportToExcel}
                className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                Export Excel
              </button>

              <button
                onClick={exportToPDF}
                className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                Export PDF
              </button>

              <button
                onClick={() => void refreshReports()}
                disabled={refreshing}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh Reports"}
              </button>
            </div>
          </div>

          {/* Asset reports */}
          {(activeReport === "assets" ||
            activeReport === "assigned" ||
            activeReport === "available") && (
            <>
              <div className="px-5 py-3 text-sm text-gray-500">
                Showing {filteredAssets.length} records
              </div>

              {filteredAssets.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No asset records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Asset Tag</th>
                        <th className="px-4 py-3">Asset Name</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Brand / Model</th>
                        <th className="px-4 py-3">Assigned To</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {asset.assetTag}
                          </td>
                          <td className="px-4 py-3 text-gray-900">
                            {asset.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {asset.category}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {[asset.brand, asset.model]
                              .filter(Boolean)
                              .join(" / ") || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {asset.assignedTo?.name || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {asset.department || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {asset.location || "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold capitalize text-gray-700">
                              {asset.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Employee report */}
          {activeReport === "employees" && (
            <>
              <div className="px-5 py-3 text-sm text-gray-500">
                Showing {filteredEmployees.length} employees
              </div>

              {filteredEmployees.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No employee records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Employee</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Designation</th>
                        <th className="px-4 py-3">Assigned Assets</th>
                        <th className="px-4 py-3">Asset Names</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {employee.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {employee.email}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {employee.department || "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {employee.designation || "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-blue-700">
                            {employee.assignedAssetCount}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {employee.assignedAssets
                              .map((asset) => asset.name)
                              .join(", ") || "None"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Department report */}
          {activeReport === "departments" && (
            <>
              <div className="px-5 py-3 text-sm text-gray-500">
                Showing {filteredDepartments.length} departments
              </div>

              {filteredDepartments.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No department records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Department</th>
                        <th className="px-4 py-3">Employees</th>
                        <th className="px-4 py-3">Total Assets</th>
                        <th className="px-4 py-3">Assigned</th>
                        <th className="px-4 py-3">Available</th>
                        <th className="px-4 py-3">Maintenance</th>
                        <th className="px-4 py-3">Retired</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredDepartments.map((department) => (
                        <tr
                          key={department.department}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-4 py-3 font-semibold text-gray-900">
                            {department.department}
                          </td>
                          <td className="px-4 py-3">
                            {department.totalEmployees}
                          </td>
                          <td className="px-4 py-3 font-semibold">
                            {department.totalAssets}
                          </td>
                          <td className="px-4 py-3 text-purple-700">
                            {department.assignedAssets}
                          </td>
                          <td className="px-4 py-3 text-green-700">
                            {department.availableAssets}
                          </td>
                          <td className="px-4 py-3 text-orange-700">
                            {department.maintenanceAssets}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {department.retiredAssets}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Maintenance report */}
          {activeReport === "maintenance" && (
            <>
              <div className="px-5 py-3 text-sm text-gray-500">
                Showing {filteredMaintenance.length} maintenance records
              </div>

              {filteredMaintenance.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No maintenance records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px] text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Record</th>
                        <th className="px-4 py-3">Asset</th>
                        <th className="px-4 py-3">Maintenance Type</th>
                        <th className="px-4 py-3">Problem</th>
                        <th className="px-4 py-3">Started</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Cost</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredMaintenance.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold">
                            #{record.id}
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {record.asset?.name || "—"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {record.asset?.assetTag || "—"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {record.maintenanceType}
                          </td>
                          <td className="max-w-xs px-4 py-3 text-gray-600">
                            <span className="line-clamp-2">
                              {record.problemDescription}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(record.startDate)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(record.completionDate)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatMoney(record.cost)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                record.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {record.status === "completed"
                                ? "Completed"
                                : "In Progress"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Assignment history report */}
          {activeReport === "history" && (
            <>
              <div className="px-5 py-3 text-sm text-gray-500">
                Showing {filteredHistory.length} assignment records
              </div>

              {filteredHistory.length === 0 ? (
                <div className="p-10 text-center text-gray-500">
                  No assignment history found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3">Asset</th>
                        <th className="px-4 py-3">Asset Tag</th>
                        <th className="px-4 py-3">Assigned To</th>
                        <th className="px-4 py-3">Assigned By</th>
                        <th className="px-4 py-3">Assigned Date</th>
                        <th className="px-4 py-3">Returned Date</th>
                        <th className="px-4 py-3">Record Status</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {filteredHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {record.asset?.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {record.asset?.assetTag || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {record.assignedTo?.name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {record.assignedBy?.name || "—"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(record.assignedAt)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3">
                            {formatDate(record.returnedAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                record.returnedAt
                                  ? "bg-gray-100 text-gray-700"
                                  : "bg-green-100 text-green-700"
                              }`}
                            >
                              {record.returnedAt ? "Returned" : "Active"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </section>

        <p className="mt-4 text-xs text-gray-400">
          Date filters use asset creation dates, maintenance start dates or
          assignment dates depending on the selected report. Employee and
          department reports currently use their available records without
          date filtering.
        </p>
      </div>
    </main>
  );
}
