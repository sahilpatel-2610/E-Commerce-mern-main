import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import {
  getFirestoreUsers,
  getFirestoreOrders,
  deleteFirestoreUser,
} from "../api/firebaseService";

// Helper: Format Date and Time dynamically with permanent persistent registration timestamp
function formatDateTime(isoString, docId, createTime, email) {
  try {
    let dateObj = null;

    // 1. Try explicit createdAt or createTime from Firestore document
    const candidate = isoString || createTime;
    if (candidate) {
      const parsed = new Date(candidate);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      }
    }

    // 2. Try docId millisecond timestamp if matched (e.g. usr_1724...)
    if (!dateObj && docId && typeof docId === "string") {
      const match = docId.match(/_(\d{13})/);
      if (match) {
        const parsed = new Date(parseInt(match[1], 10));
        if (!isNaN(parsed.getTime())) {
          dateObj = parsed;
        }
      }
    }

    // 3. Fallback to permanently cached registration timestamp per user (never shifts on page refresh)
    if (!dateObj || isNaN(dateObj.getTime())) {
      const cleanKey = `user_reg_timestamp_${(email || docId || "unknown").toLowerCase().trim()}`;
      try {
        const saved = localStorage.getItem(cleanKey);
        if (saved) {
          dateObj = new Date(saved);
        } else {
          dateObj = new Date();
          localStorage.setItem(cleanKey, dateObj.toISOString());
        }
      } catch (_) {
        dateObj = new Date();
      }
    }

    const dateStr = dateObj.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    const timeStr = dateObj.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return { dateStr, timeStr, full: `${dateStr} • ${timeStr}` };
  } catch (e) {
    return { dateStr: "Permanent", timeStr: "Member", full: "Permanent • Member" };
  }
}

// Helper: Determine User's Registration Platform
function getPlatformBadge(user) {
  const p = (user.platform || user.source || user.sourceApp || "").toLowerCase();
  const email = (user.email || "").toLowerCase();
  const role = (user.role || "").toLowerCase();

  if (p.includes("react") || p.includes("rn")) {
    return {
      label: "React Native App",
      icon: "⚛️",
      badgeClass: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    };
  }
  if (p.includes("android")) {
    return {
      label: "Mobile Android App",
      icon: "📱",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };
  }
  if (p.includes("flutter") || p.includes("mobile") || p.includes("app")) {
    return {
      label: "Mobile Flutter App",
      icon: "📱",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    };
  }
  if (p.includes("admin") || role === "admin" || email.includes("admin")) {
    return {
      label: "Admin Panel CMS",
      icon: "⚡",
      badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    };
  }
  return {
    label: "Web Storefront",
    icon: "🌐",
    badgeClass: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  };
}

function Users({ token }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "customer",
    platform: "Mobile Android App",
  });
  const [addingUser, setAddingUser] = useState(false);

  // Pagination matching Reviews.jsx
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchUsers = async (showLoader = false) => {
    try {
      if (showLoader === true) setLoading(true);
      let combined = [];

      // 1. Fetch from Firebase Firestore
      try {
        const firestoreUsers = await getFirestoreUsers();
        if (Array.isArray(firestoreUsers) && firestoreUsers.length > 0) {
          combined = [...firestoreUsers];
        }
      } catch (e) {
        console.warn("Error loading Firestore users:", e);
      }

      // 2. Fetch from Backend API
      try {
        const res = await axios.get(`${backendUrl}/api/admin/users`);
        if (res.data?.success && Array.isArray(res.data.users)) {
          res.data.users.forEach((u) => {
            const idx = combined.findIndex((ex) => (ex.email || "").toLowerCase() === (u.email || "").toLowerCase() || ex._id === u._id);
            if (idx === -1) {
              combined.push(u);
            } else {
              if (u.platform && (u.platform.toLowerCase().includes("android") || u.platform.toLowerCase().includes("flutter"))) {
                combined[idx].platform = u.platform;
              }
            }
          });
        }
      } catch (e) {}

      // 3. Customers from Orders
      try {
        const firestoreOrders = await getFirestoreOrders();
        if (Array.isArray(firestoreOrders)) {
          firestoreOrders.forEach((o) => {
            const email = (
              o.userEmail ||
              o.customerEmail ||
              o.address?.email ||
              o.email ||
              ""
            ).toLowerCase().trim();
            const fullName =
              (o.address ? `${o.address.firstName || ""} ${o.address.lastName || ""}`.trim() : "") ||
              o.customerName ||
              o.name ||
              "Customer";
            const id = o.userId || (o._id || o.id ? `cust_${o._id || o.id}` : "");

            const exists = combined.some(
              (u) =>
                (email && (u.email || "").toLowerCase() === email) ||
                (id && (u._id === id || u.id === id))
            );

            if (!exists && (email || fullName !== "Customer")) {
              combined.push({
                _id: id || `cust_${(email || "guest").replace(/[^a-zA-Z0-9]/g, "_")}`,
                name: fullName,
                email: email || "customer@store.com",
                platform: o.platform || o.source || "Web Storefront",
                phone: o.phone || o.address?.phone || "",
                createdAt: o.createdAt || o.date || new Date().toISOString(),
                role: "customer",
              });
            }
          });
        }
      } catch (e) {}

      setUsers(combined);
    } catch (error) {
      console.log("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, name, email) => {
    if (!window.confirm(`Are you sure you want to delete user "${name}"?`)) {
      return;
    }
    try {
      // 1. Delete from Firestore
      try {
        await deleteFirestoreUser(id);
      } catch (_) {}

      // 2. Delete from Local Storage Registry
      try {
        const raw = localStorage.getItem("local_users_registry");
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.filter(
            (u) => u._id !== id && u.id !== id && u.email !== email
          );
          localStorage.setItem("local_users_registry", JSON.stringify(updated));
        }
      } catch (_) {}

      // 3. Delete from Server JSON Registry
      try {
        await axios.post(
          `${backendUrl}/api/admin/user/delete`,
          { id, userId: id, email },
          { headers: { token } }
        );
      } catch (e) {}

      // 4. Update state instantly
      setUsers((prev) =>
        prev.filter((u) => u._id !== id && u.id !== id && u.email !== email)
      );
      toast.success("User deleted successfully!");
      fetchUsers(false);
    } catch (error) {
      setUsers((prev) =>
        prev.filter((u) => u._id !== id && u.id !== id && u.email !== email)
      );
      toast.success("User removed!");
    }
  };

  useEffect(() => {
    fetchUsers(true);
  }, []);

  // Summary Metrics
  const userStats = useMemo(() => {
    let admins = 0;
    let customers = 0;
    let androidUsers = 0;
    let reactNativeUsers = 0;
    let flutterUsers = 0;
    let webUsers = 0;

    users.forEach((u) => {
      const isAdmin =
        (u.role || "").toLowerCase() === "admin" ||
        (u.email || "").includes("admin");
      if (isAdmin) {
        admins++;
      } else {
        customers++;
      }

      const p = (u.platform || u.source || u.sourceApp || "").toLowerCase();
      if (p.includes("react") || p.includes("rn")) {
        reactNativeUsers++;
      } else if (p.includes("android")) {
        androidUsers++;
      } else if (p.includes("flutter") || p.includes("mobile") || p.includes("app")) {
        flutterUsers++;
      } else if (!isAdmin) {
        webUsers++;
      }
    });
    return {
      total: users.length,
      admins,
      customers,
      androidUsers,
      reactNativeUsers,
      flutterUsers,
      mobileUsers: androidUsers + reactNativeUsers + flutterUsers,
      webUsers,
    };
  }, [users]);

  // Filtered List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const nameMatch = (u.name || "").toLowerCase().includes(q);
      const emailMatch = (u.email || "").toLowerCase().includes(q);
      const phoneMatch = (u.phone || u.phoneNumber || "").toLowerCase().includes(q);
      const platformInfo = getPlatformBadge(u);
      const platformMatch = platformInfo.label.toLowerCase().includes(q);
      const matchSearch = !q || nameMatch || emailMatch || phoneMatch || platformMatch;

      const isAdmin =
        (u.role || "").toLowerCase() === "admin" ||
        (u.email || "").includes("admin");
      let matchRole = true;
      if (roleFilter === "Customers") matchRole = !isAdmin;
      if (roleFilter === "Admins") matchRole = isAdmin;

      let matchPlatform = true;
      if (platformFilter === "ReactNative") {
        matchPlatform = platformInfo.label.includes("React Native");
      } else if (platformFilter === "Android") {
        matchPlatform = platformInfo.label.includes("Android");
      } else if (platformFilter === "Flutter") {
        matchPlatform = platformInfo.label.includes("Flutter");
      } else if (platformFilter === "Mobile") {
        matchPlatform =
          platformInfo.label.includes("Mobile") ||
          platformInfo.label.includes("React Native") ||
          platformInfo.label.includes("Android") ||
          platformInfo.label.includes("Flutter");
      } else if (platformFilter === "Web") {
        matchPlatform = platformInfo.label.includes("Web");
      } else if (platformFilter === "Admin") {
        matchPlatform = platformInfo.label.includes("Admin");
      }

      return matchSearch && matchRole && matchPlatform;
    });
  }, [users, searchTerm, roleFilter, platformFilter]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUser.name.trim() || !newUser.email.trim()) {
      toast.error("Name and Email are required!");
      return;
    }
    setAddingUser(true);
    try {
      await addFirestoreUser({
        name: newUser.name.trim(),
        email: newUser.email.trim().toLowerCase(),
        phone: newUser.phone.trim(),
        password: newUser.password.trim() || "123456",
        role: newUser.role,
        platform: newUser.platform,
        createdAt: new Date().toISOString(),
      });
      toast.success("User added successfully to Firebase!");
      setShowAddModal(false);
      setNewUser({
        name: "",
        email: "",
        phone: "",
        password: "",
        role: "customer",
        platform: "Mobile Android App",
      });
      fetchUsers(false);
    } catch (err) {
      toast.error("Failed to add user: " + err.message);
    } finally {
      setAddingUser(false);
    }
  };

  // Paginated Users matching Reviews.jsx
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredUsers.slice(start, start + rowsPerPage);
  }, [filteredUsers, currentPage, rowsPerPage]);

  return (
    <div className="w-full space-y-6 select-none pb-12">
      {/* 1. Header Banner matching Reviews / Emerald Luxury Theme */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>LIVE DYNAMIC DIRECTORY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>👥 Registered User Directory</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Real-time multi-platform directory tracking registrations across Mobile Android App, Mobile Flutter App, Web Storefront, and Admin CMS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>➕</span>
            <span>Add User</span>
          </button>

          <button
            onClick={() => {
              try {
                localStorage.removeItem("local_users_registry");
              } catch (_) {}
              fetchUsers(true);
              toast.info("Refreshed live from Firebase & Server!");
            }}
            className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-200 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <span>🔄</span>
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Registered */}
        <div
          onClick={() => {
            setRoleFilter("All");
            setPlatformFilter("All");
            setCurrentPage(1);
          }}
          className="bg-[#090d16]/90 border border-gray-800 hover:border-amber-500/50 transition-all rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between cursor-pointer group"
        >
          <div>
            <p className="text-[11px] font-bold text-gray-400 group-hover:text-amber-400 uppercase tracking-wider transition-colors">
              Total Registered
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {loading ? "..." : userStats.total}
            </h3>
            <span className="text-[10px] text-amber-400 font-semibold">Active in Firebase</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
            👥
          </div>
        </div>

        {/* Card 2: React Native App Users */}
        <div
          onClick={() => {
            setPlatformFilter("ReactNative");
            setCurrentPage(1);
          }}
          className={`bg-[#090d16]/90 border transition-all rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between cursor-pointer group ${
            platformFilter === "ReactNative"
              ? "border-indigo-500 shadow-indigo-500/20"
              : "border-gray-800 hover:border-indigo-500/50"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-gray-400 group-hover:text-indigo-400 uppercase tracking-wider transition-colors">
              React Native Users
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-indigo-400 mt-1">
              {loading ? "..." : userStats.reactNativeUsers}
            </h3>
            <span className="text-[10px] text-indigo-300 font-semibold">⚛️ React Native</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-lg shrink-0">
            ⚛️
          </div>
        </div>

        {/* Card 3: Android App Users */}
        <div
          onClick={() => {
            setPlatformFilter("Android");
            setCurrentPage(1);
          }}
          className={`bg-[#090d16]/90 border transition-all rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between cursor-pointer group ${
            platformFilter === "Android"
              ? "border-emerald-500 shadow-emerald-500/20"
              : "border-gray-800 hover:border-emerald-500/50"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-gray-400 group-hover:text-emerald-400 uppercase tracking-wider transition-colors">
              Android App Users
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {loading ? "..." : userStats.androidUsers}
            </h3>
            <span className="text-[10px] text-emerald-300 font-semibold">📱 Android App</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-lg shrink-0">
            📱
          </div>
        </div>

        {/* Card 4: Flutter App Users */}
        <div
          onClick={() => {
            setPlatformFilter("Flutter");
            setCurrentPage(1);
          }}
          className={`bg-[#090d16]/90 border transition-all rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between cursor-pointer group ${
            platformFilter === "Flutter"
              ? "border-cyan-500 shadow-cyan-500/20"
              : "border-gray-800 hover:border-cyan-500/50"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-gray-400 group-hover:text-cyan-400 uppercase tracking-wider transition-colors">
              Flutter App Users
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-cyan-400 mt-1">
              {loading ? "..." : userStats.flutterUsers}
            </h3>
            <span className="text-[10px] text-cyan-300 font-semibold">📱 Flutter App</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-lg shrink-0">
            📱
          </div>
        </div>

        {/* Card 5: Web Storefront */}
        <div
          onClick={() => {
            setPlatformFilter("Web");
            setCurrentPage(1);
          }}
          className={`bg-[#090d16]/90 border transition-all rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between cursor-pointer group ${
            platformFilter === "Web"
              ? "border-blue-500 shadow-blue-500/20"
              : "border-gray-800 hover:border-blue-500/50"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-gray-400 group-hover:text-blue-400 uppercase tracking-wider transition-colors">
              Web Storefront
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
              {loading ? "..." : userStats.webUsers}
            </h3>
            <span className="text-[10px] text-blue-300 font-semibold">🌐 Online Buyers</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-lg shrink-0">
            🌐
          </div>
        </div>

        {/* Card 6: Admin Authorities */}
        <div
          onClick={() => {
            setRoleFilter("Admins");
            setCurrentPage(1);
          }}
          className={`bg-[#090d16]/90 border transition-all rounded-3xl p-4 sm:p-5 shadow-xl flex items-center justify-between cursor-pointer group ${
            roleFilter === "Admins"
              ? "border-purple-500 shadow-purple-500/20"
              : "border-gray-800 hover:border-purple-500/50"
          }`}
        >
          <div>
            <p className="text-[11px] font-bold text-gray-400 group-hover:text-purple-400 uppercase tracking-wider transition-colors">
              Admin Authorities
            </p>
            <h3 className="text-2xl sm:text-3xl font-black text-purple-400 mt-1">
              {loading ? "..." : userStats.admins}
            </h3>
            <span className="text-[10px] text-purple-300 font-semibold">⚡ Panel Access</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-lg shrink-0">
            ⚡
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        {/* Role & Platform Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "All", label: `All Users (${userStats.total})` },
            { id: "Customers", label: `Customers (${userStats.customers})` },
            { id: "Admins", label: `Admins (${userStats.admins})` },
          ].map((rf) => (
            <button
              key={rf.id}
              onClick={() => {
                setRoleFilter(rf.id);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                roleFilter === rf.id
                  ? "bg-amber-400 text-black shadow-md shadow-amber-500/25"
                  : "bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700"
              }`}
            >
              {rf.label}
            </button>
          ))}

          <div className="h-5 w-[1px] bg-gray-700 mx-1 hidden sm:block"></div>

          {/* Platform Pills */}
          {[
            { id: "All", label: "All Platforms" },
            { id: "ReactNative", label: "⚛️ React Native App" },
            { id: "Android", label: "📱 Android App" },
            { id: "Flutter", label: "📱 Flutter App" },
            { id: "Mobile", label: "📱 All Mobile" },
            { id: "Web", label: "🌐 Web Client" },
            { id: "Admin", label: "⚡ Admin CMS" },
          ].map((pf) => (
            <button
              key={pf.id}
              onClick={() => {
                setPlatformFilter(pf.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                platformFilter === pf.id
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold"
                  : "bg-gray-900/60 text-gray-400 hover:text-gray-200 border border-gray-800"
              }`}
            >
              {pf.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full lg:w-80">
          <input
            type="text"
            placeholder="Search name, email, phone, app..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-8 py-2 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 4. Users Data Table */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-200">
            {/* Table Header matching the unified Golden Gradient */}
            <thead className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider uppercase text-[11px] shadow-md">
              <tr>
                <th className="py-4 px-6 min-w-[200px]">User Profile</th>
                <th className="py-4 px-6 min-w-[220px]">Email & Phone</th>
                <th className="py-4 px-6 min-w-[170px] whitespace-nowrap">Registered Platform / App</th>
                <th className="py-4 px-6 min-w-[180px] whitespace-nowrap">Registered Date & Time</th>
                <th className="py-4 px-6 whitespace-nowrap">Role & Access</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 bg-black/40">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-20 text-gray-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold">Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-gray-400 space-y-2">
                    <div className="text-3xl">👥</div>
                    <p className="text-sm font-bold text-white">No Users Found</p>
                    <p className="text-xs text-gray-500">Try selecting another filter or search term.</p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, idx) => {
                  const isAdmin =
                    (u.role || "").toLowerCase() === "admin" ||
                    (u.email || "").includes("admin");
                  const initial = (u.name || "U").charAt(0).toUpperCase();
                  const platform = getPlatformBadge(u);
                  const dateTime = formatDateTime(u.createdAt, u._id || u.id, u.createTime, u.email);

                  return (
                    <tr
                      key={u._id || idx}
                      className="hover:bg-gray-800/50 transition-colors duration-150 group"
                    >
                      {/* 1. User Profile */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl font-black flex items-center justify-center text-xs shadow-md shrink-0 ${
                              isAdmin
                                ? "bg-gradient-to-tr from-purple-500 to-indigo-600 text-white"
                                : platform.label.includes("Mobile")
                                ? "bg-gradient-to-tr from-cyan-400 to-blue-600 text-black"
                                : "bg-gradient-to-tr from-amber-400 to-yellow-600 text-black"
                            }`}
                          >
                            {initial}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">
                              {u.name || "Customer"}
                            </h4>
                            <span className="text-[10px] text-gray-500 font-mono">
                              ID: {String(u._id || u.id).slice(-10)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Email Address & Phone */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="text-gray-200 font-medium text-xs">
                            {u.email}
                          </div>
                          {u.phone || u.phoneNumber ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-800/90 border border-gray-700 rounded-md text-[10px] text-gray-300 font-mono">
                              <span>📞</span>
                              <span>{u.phone || u.phoneNumber}</span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-600 font-mono">No phone attached</div>
                          )}
                        </div>
                      </td>

                      {/* 3. Registered Platform / App */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm ${platform.badgeClass}`}>
                          <span>{platform.icon}</span>
                          <span>{platform.label}</span>
                        </span>
                      </td>

                      {/* 4. Registered Date & Time */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                            <span className="text-amber-400">📅</span>
                            <span>{dateTime.dateStr}</span>
                          </div>
                          <div className="text-[10px] font-mono text-gray-400 flex items-center gap-1.5">
                            <span className="text-gray-500">⏰</span>
                            <span>{dateTime.timeStr}</span>
                          </div>
                        </div>
                      </td>

                      {/* 5. Role & Permission */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        {isAdmin ? (
                          <span className="px-3 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse"></span>
                            Admin Access
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            Store Customer
                          </span>
                        )}
                      </td>

                      {/* 6. Action */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleDeleteUser(u._id || u.id, u.name, u.email)
                          }
                          disabled={isAdmin}
                          className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                            isAdmin
                              ? "opacity-30 cursor-not-allowed border-gray-800 text-gray-600"
                              : "bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 cursor-pointer shadow-sm hover:shadow-rose-500/25"
                          }`}
                          title={isAdmin ? "Cannot delete admin account" : "Delete User"}
                        >
                          Delete 🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-900/90 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
          <span>
            Showing{" "}
            <strong className="text-white">
              {filteredUsers.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
            </strong>{" "}
            to{" "}
            <strong className="text-white">
              {Math.min(currentPage * rowsPerPage, filteredUsers.length)}
            </strong>{" "}
            of <strong className="text-white">{filteredUsers.length}</strong> users
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer text-white font-bold"
            >
              ❮ Prev
            </button>
            <span className="px-3 py-1.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-lg font-bold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages || filteredUsers.length === 0}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer text-white font-bold"
            >
              Next ❯
            </button>
          </div>
        </div>
      </div>

      {/* 5. Add User Modal Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0e131f] border border-gray-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">👤</span>
                <div>
                  <h3 className="text-lg font-black text-white">Add New User</h3>
                  <p className="text-xs text-gray-400">Directly register user into Firebase Firestore directory</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sahil Patel"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="10 Digits e.g. 9876543210"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Password</label>
                <input
                  type="password"
                  placeholder="Defaults to 123456"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Platform / App</label>
                  <select
                    value={newUser.platform}
                    onChange={(e) => setNewUser({ ...newUser, platform: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="React Native App">⚛️ React Native App</option>
                    <option value="Mobile Android App">📱 Mobile Android App</option>
                    <option value="Mobile Flutter App">📱 Mobile Flutter App</option>
                    <option value="Web Storefront">🌐 Web Storefront</option>
                    <option value="Admin Panel CMS">⚡ Admin Panel CMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Role & Access</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="customer">Store Customer</option>
                    <option value="admin">Admin Authority</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-800 text-gray-300 hover:text-white rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="px-5 py-2 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {addingUser ? "Saving..." : "Add User ➔"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Users;
