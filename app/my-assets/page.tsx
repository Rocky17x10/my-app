
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:3001";

interface Asset {
  id: number;
  assetTag: string;
  name: string;
  category: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  department?: string;
  location?: string;
  purchaseDate?: string;
  notes?: string;
}

interface Profile {
  userId: number;
  name: string;
  email: string;
  role: string;
  department?: string;
  designation?: string;
}

export default function MyAssetsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadMyAssets = async () => {
      const token = sessionStorage.getItem("access_token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const profileResponse = await fetch(
          `${API_URL}/auth/profile`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!profileResponse.ok) {
          if (profileResponse.status === 401) {
            sessionStorage.removeItem("access_token");
            router.replace("/login");
            return;
          }

          throw new Error("Unable to load your profile.");
        }

        const profileData = await profileResponse.json();
        const currentUser = profileData.user as Profile;

        if (
          currentUser.role === "admin" ||
          currentUser.role === "super_admin"
        ) {
          router.replace("/dashboard");
          return;
        }

        setProfile(currentUser);

        const assetsResponse = await fetch(
          `${API_URL}/assets`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!assetsResponse.ok) {
          if (assetsResponse.status === 401) {
            sessionStorage.removeItem("access_token");
            router.replace("/login");
            return;
          }

          throw new Error("Unable to load your assigned assets.");
        }

        const assetsData = await assetsResponse.json();
        setAssets(assetsData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setLoading(false);
      }
    };

    loadMyAssets();
  }, [router]);

  const filteredAssets = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) return assets;

    return assets.filter((asset) =>
      [
        asset.assetTag,
        asset.name,
        asset.category,
        asset.brand,
        asset.model,
        asset.serialNumber,
        asset.status,
        asset.department,
        asset.location,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        )
    );
  }, [assets, search]);

  const availableCount = assets.filter(
    (asset) => asset.status === "available"
  ).length;

  const assignedCount = assets.filter(
    (asset) => asset.status === "assigned"
  ).length;

  const maintenanceCount = assets.filter(
    (asset) => asset.status === "maintenance"
  ).length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "assigned":
        return "bg-blue-100 text-blue-700";
      case "available":
        return "bg-green-100 text-green-700";
      case "maintenance":
        return "bg-yellow-100 text-yellow-700";
      case "retired":
        return "bg-gray-200 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const logout = () => {
    sessionStorage.removeItem("access_token");
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Loading your assets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              My Assets
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Your assigned IT equipment
            </p>
          </div>

          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {profile && (
          <div className="bg-white rounded-xl shadow-sm border p-5 mb-8">
            <h2 className="text-lg font-semibold text-gray-800">
              Welcome, {profile.name}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {profile.email}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Department: {profile.department || "Not specified"}
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Total Assets</p>
            <p className="text-3xl font-bold text-gray-800 mt-2">
              {assets.length}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Assigned</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">
              {assignedCount}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Available</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {availableCount}
            </p>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border">
            <p className="text-sm text-gray-500">Maintenance</p>
            <p className="text-3xl font-bold text-yellow-600 mt-2">
              {maintenanceCount}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              My Assigned Equipment
            </h2>

            <input
              type="text"
              placeholder="Search my assets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-4 py-2 w-full sm:w-80 text-gray-800"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-3">Asset Tag</th>
                  <th className="p-3">Asset Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Brand / Model</th>
                  <th className="p-3">Serial Number</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Location</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredAssets.map((asset) => (
                  <tr
                    key={asset.id}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="p-3 font-medium text-gray-800">
                      {asset.assetTag}
                    </td>
                    <td className="p-3 text-gray-800">
                      {asset.name}
                    </td>
                    <td className="p-3 text-gray-600">
                      {asset.category}
                    </td>
                    <td className="p-3 text-gray-600">
                      {[asset.brand, asset.model]
                        .filter(Boolean)
                        .join(" / ") || "-"}
                    </td>
                    <td className="p-3 text-gray-600">
                      {asset.serialNumber || "-"}
                    </td>
                    <td className="p-3 text-gray-600">
                      {asset.department || "-"}
                    </td>
                    <td className="p-3 text-gray-600">
                      {asset.location || "-"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(
                          asset.status
                        )}`}
                      >
                        {asset.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredAssets.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-8 text-center text-gray-500"
                    >
                      {search
                        ? "No matching assets found."
                        : "No assets are currently assigned to you."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
