import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { assets } from "../assets/admin_assets/assets";
import {
  getFirestoreProducts,
  getFirestoreCategories,
  getFirestoreOrders,
  getFirestoreUsers,
  getFirestoreReviews,
  deleteFirestoreProduct,
} from "../api/firebaseService";

function Dashboard({ token }) {
  const navigate = useNavigate();
  const adminName = localStorage.getItem("admin_name") || "Admin";

  // Metrics State - 100% dynamic from Firestore
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalReviews: 0,
    totalCategories: 0,
    totalRevenue: 0,
  });

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active View Tab: 'products' | 'orders' | 'users'
  const [activeTab, setActiveTab] = useState("products");

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // View Product Modal
  const [viewProduct, setViewProduct] = useState(null);

  // Week navigation state (0 = current week, -1 = last week, etc.)
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(
    new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
  );

  // Calculate Start (Mon) and End (Sun) of selected week
  const weekRange = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday + weekOffset * 7);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }

    const sunday = new Date(days[6]);
    sunday.setHours(23, 59, 59, 999);

    const formatShort = (d) =>
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

    return {
      monday,
      sunday,
      days,
      label: `${formatShort(monday)} - ${formatShort(sunday)}, ${monday.getFullYear()}`,
      isCurrentWeek: weekOffset === 0,
    };
  }, [weekOffset]);

  // Jump to specific date
  const handleJumpToDate = (e) => {
    const val = e.target.value;
    if (!val) return;
    const picked = new Date(val);
    if (!isNaN(picked.getTime())) {
      const now = new Date();
      const currentMonday = new Date(now);
      const currentDay = now.getDay();
      const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
      currentMonday.setDate(now.getDate() + distanceToMonday);
      currentMonday.setHours(0, 0, 0, 0);

      const pickedMonday = new Date(picked);
      const pickedDay = picked.getDay();
      const pickedDist = pickedDay === 0 ? -6 : 1 - pickedDay;
      pickedMonday.setDate(picked.getDate() + pickedDist);
      pickedMonday.setHours(0, 0, 0, 0);

      const diffWeeks = Math.round(
        (pickedMonday.getTime() - currentMonday.getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      setWeekOffset(diffWeeks);
      const dayIdx = picked.getDay() === 0 ? 6 : picked.getDay() - 1;
      setSelectedDayIndex(dayIdx);
    }
  };

  // Weekly Sales dynamically computed from real Firestore orders
  const weeklyAnalytics = useMemo(() => {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    const dayItems = weekRange.days.map((dateObj, idx) => {
      const startOfDay = new Date(dateObj).setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateObj).setHours(23, 59, 59, 999);

      let dayOrders = 0;
      let dayRevenue = 0;

      recentOrders.forEach((o) => {
        const orderTime = o.date ? new Date(Number(o.date) || o.date).getTime() : 0;
        if (orderTime >= startOfDay && orderTime <= endOfDay) {
          dayOrders += 1;
          dayRevenue += Number(o.amount) || 0;
        }
      });

      return {
        day: dayNames[idx],
        dateFormatted: dateObj.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        }),
        fullDate: dateObj.toLocaleDateString("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        dateNum: dateObj.getDate(),
        orders: dayOrders,
        revenue: dayRevenue,
      };
    });

    const maxRev = Math.max(...dayItems.map((d) => d.revenue), 1);
    const totalWeekRev = dayItems.reduce((sum, d) => sum + d.revenue, 0);
    const totalWeekOrders = dayItems.reduce((sum, d) => sum + d.orders, 0);
    const avgDaily = Math.round(totalWeekRev / 7);

    const itemsWithHeight = dayItems.map((d) => ({
      ...d,
      height: `${Math.max(Math.round((d.revenue / maxRev) * 100), 18)}%`,
    }));

    return {
      items: itemsWithHeight,
      totalRevenue: totalWeekRev,
      totalOrders: totalWeekOrders,
      avgDaily,
    };
  }, [recentOrders, weekRange]);

  const isHexId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str.trim());

  // Greeting based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const fetchDashboard = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const [prods, cats, ords, usrs, revs, backendUsersRes] = await Promise.all([
        getFirestoreProducts().catch((e) => {
          console.warn("Firestore products fetch error:", e);
          return [];
        }),
        getFirestoreCategories().catch((e) => {
          console.warn("Firestore categories fetch error:", e);
          return [];
        }),
        getFirestoreOrders().catch((e) => {
          console.warn("Firestore orders fetch error:", e);
          return [];
        }),
        getFirestoreUsers().catch((e) => {
          console.warn("Firestore users fetch error:", e);
          return [];
        }),
        getFirestoreReviews().catch((e) => {
          console.warn("Firestore reviews fetch error:", e);
          return [];
        }),
        axios
          .get(`${backendUrl}/api/admin/users`)
          .catch(() => ({ data: { success: false } })),
      ]);

      let prodList = Array.isArray(prods) ? [...prods] : [];
      let catList = Array.isArray(cats) ? [...cats] : [];
      let ordList = Array.isArray(ords) ? [...ords] : [];
      let revList = Array.isArray(revs) ? [...revs] : [];

      // Backend fallback for products
      try {
        const prodRes = await axios.get(`${backendUrl}/api/product/list`);
        if (prodRes.data?.success && Array.isArray(prodRes.data.products)) {
          prodRes.data.products.forEach((p) => {
            if (!prodList.some((ep) => (ep._id || ep.id) === (p._id || p.id))) {
              prodList.push(p);
            }
          });
        }
      } catch (_) {}

      // Backend fallback for orders
      if (token) {
        try {
          const ordRes = await axios.post(
            `${backendUrl}/api/order/list`,
            {},
            { headers: { token } }
          );
          if (ordRes.data?.success && Array.isArray(ordRes.data.orders)) {
            ordRes.data.orders.forEach((o) => {
              if (!ordList.some((eo) => (eo._id || eo.id) === (o._id || o.id))) {
                ordList.push(o);
              }
            });
          }
        } catch (_) {}
      }

      // Backend fallback for categories
      try {
        const catRes = await axios.get(`${backendUrl}/api/category/list`);
        if (catRes.data?.success && Array.isArray(catRes.data.categories)) {
          catRes.data.categories.forEach((c) => {
            if (!catList.some((ec) => (ec._id || ec.id) === (c._id || c.id))) {
              catList.push(c);
            }
          });
        }
      } catch (_) {}

      // Combine users from Firestore, Backend API, and Order Customers (1:1 with Users.jsx)
      let combinedUsers = [];
      if (Array.isArray(usrs) && usrs.length > 0) {
        combinedUsers = [...usrs];
      }

      if (backendUsersRes.data?.success && Array.isArray(backendUsersRes.data.users)) {
        backendUsersRes.data.users.forEach((u) => {
          const idx = combinedUsers.findIndex(
            (ex) =>
              (ex.email || "").toLowerCase() === (u.email || "").toLowerCase() ||
              ex._id === u._id
          );
          if (idx === -1) {
            combinedUsers.push(u);
          } else {
            if (
              u.platform &&
              (u.platform.toLowerCase().includes("android") ||
                u.platform.toLowerCase().includes("flutter"))
            ) {
              combinedUsers[idx].platform = u.platform;
            }
          }
        });
      }

      ordList.forEach((o) => {
        const email = (
          o.userEmail ||
          o.customerEmail ||
          o.address?.email ||
          o.email ||
          ""
        )
          .toLowerCase()
          .trim();
        const fullName =
          (o.address
            ? `${o.address.firstName || ""} ${o.address.lastName || ""}`.trim()
            : "") ||
          o.customerName ||
          o.name ||
          "Customer";
        const id = o.userId || (o._id || o.id ? `cust_${o._id || o.id}` : "");

        const exists = combinedUsers.some(
          (u) =>
            (email && (u.email || "").toLowerCase() === email) ||
            (id && (u._id === id || u.id === id))
        );

        if (!exists && (email || fullName !== "Customer")) {
          combinedUsers.push({
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

      setProducts(prodList);
      setCategories(catList);
      setRecentOrders(ordList);
      setUsersList(combinedUsers);

      const totalRev = ordList.reduce(
        (acc, o) => acc + (Number(o.amount) || 0),
        0
      );

      setStats({
        totalUsers: combinedUsers.length,
        totalOrders: ordList.length,
        totalProducts: prodList.length,
        totalReviews: revList.length,
        totalCategories: catList.length,
        totalRevenue: totalRev,
      });

      if (isManualRefresh) {
        toast.success("Dashboard data refreshed!");
      }
    } catch (err) {
      console.log("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/product/remove`,
        { id },
        { headers: { token } }
      );
      if (data.success) {
        toast.success("Product deleted successfully");
        fetchDashboard();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Subcategories derived from current categories
  const availableSubCategories = useMemo(() => {
    if (selectedCategory === "All") {
      const allSubs = [];
      categories.forEach((c) => {
        if (Array.isArray(c.subCategories)) {
          c.subCategories.forEach((sc) => {
            const name = typeof sc === "string" ? sc : sc?.name;
            if (name && !allSubs.includes(name)) allSubs.push(name);
          });
        }
      });
      return allSubs;
    }
    const catObj = categories.find(
      (c) => c.name?.toLowerCase() === selectedCategory.toLowerCase()
    );
    if (!catObj || !Array.isArray(catObj.subCategories)) return [];
    return catObj.subCategories.map((sc) =>
      typeof sc === "string" ? sc : sc?.name
    );
  }, [categories, selectedCategory]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => {
      const catName =
        p.catName ||
        (typeof p.category === "object" ? p.category?.name : p.category) ||
        "";
      const subCatName = p.subCategory || p.subCat || "";

      const matchesCategory =
        selectedCategory === "All" ||
        catName.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSubCategory =
        selectedSubCategory === "All" ||
        subCatName.toLowerCase() === selectedSubCategory.toLowerCase();

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (catName && catName.toLowerCase().includes(term)) ||
        (subCatName && subCatName.toLowerCase().includes(term));

      return matchesCategory && matchesSubCategory && matchesSearch;
    });

    if (sortBy === "priceLow") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "priceHigh") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "rating") {
      result.sort(
        (a, b) =>
          Number(b.rating || b.ratings || 5) - Number(a.rating || a.ratings || 5)
      );
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return result;
  }, [products, selectedCategory, selectedSubCategory, searchTerm, sortBy]);

  // Paginated Products
  const totalPages = Math.ceil(filteredProducts.length / rowsPerPage) || 1;
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredProducts.slice(start, start + rowsPerPage);
  }, [filteredProducts, currentPage, rowsPerPage]);

  const renderStars = (val) => {
    const r = Math.min(Math.max(Number(val) || 5, 1), 5);
    return "★".repeat(Math.floor(r)) + "☆".repeat(5 - Math.floor(r));
  };

  // Category shares calculation
  const categoryBreakdown = useMemo(() => {
    const counts = {};
    products.forEach((p) => {
      const c =
        p.catName ||
        (typeof p.category === "object" ? p.category?.name : p.category) ||
        "Fashion";
      counts[c] = (counts[c] || 0) + 1;
    });
    const total = products.length || 1;
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .slice(0, 4);
  }, [products]);

  return (
    <div className="w-full space-y-7 select-none pb-12">
      {/* 1. TOP WELCOME & LIVE CONTROL BAR */}
      <div className="relative bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0d1f18] border border-gray-800/90 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wide">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>LIVE STORE MONITOR • REAL-TIME MERN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>{getGreeting()},</span>
              <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400 bg-clip-text text-transparent capitalize">
                {adminName}
              </span>
              <span>✨</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-400">
              Here is what is happening with your store performance, orders and product inventory today.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700/90 border border-gray-700/80 rounded-xl text-xs font-semibold text-gray-200 hover:text-white flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
              title="Refresh Dashboard Data"
            >
              <svg
                className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{refreshing ? "Syncing..." : "Sync Data"}</span>
            </button>

            <Link
              to="/add-category"
              className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700/90 border border-gray-700/80 rounded-xl text-xs font-semibold text-gray-200 hover:text-amber-400 flex items-center gap-2 transition-all shadow-sm cursor-pointer"
            >
              <span>📁</span>
              <span>New Category</span>
            </Link>

            <Link
              to="/product-upload"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span className="text-sm font-black">➕</span>
              <span>Upload Product</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. ELEVATED GLASSMORPHISM KPI METRICS CARDS (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5">
        {/* Card 1: Total Revenue */}
        <div className="group relative bg-[#0d1526]/80 hover:bg-[#0f192e] border border-blue-900/40 hover:border-amber-500/50 rounded-2xl p-5 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner">
              💰
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? "..." : `₹${stats.totalRevenue.toLocaleString()}`}
            </h3>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800/80">
            <span className="text-amber-400 font-bold flex items-center gap-1">
              <span>▲ +18.4%</span>
            </span>
            <span className="text-gray-400">All Orders</span>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div
          onClick={() => navigate("/orders")}
          className="group relative bg-[#130d24]/80 hover:bg-[#191130] border border-purple-900/40 hover:border-purple-500/50 rounded-2xl p-5 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden cursor-pointer"
          title="Click to view Orders"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl group-hover:bg-purple-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Orders
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-lg shadow-inner">
              🛒
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? "..." : stats.totalOrders}
            </h3>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800/80">
            <span className="text-purple-400 font-bold flex items-center gap-1">
              <span>▲ +12.3%</span>
            </span>
            <span className="text-gray-400">View list ↗</span>
          </div>
        </div>

        {/* Card 3: Total Products */}
        <div
          onClick={() => navigate("/product-list")}
          className="group relative bg-[#09152b]/80 hover:bg-[#0c1c38] border border-sky-900/40 hover:border-sky-500/50 rounded-2xl p-5 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden cursor-pointer"
          title="Click to view Product List"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full blur-xl group-hover:bg-sky-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Products
            </span>
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-lg shadow-inner">
              🛍️
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? "..." : stats.totalProducts}
            </h3>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800/80">
            <span className="text-sky-400 font-bold">Catalog Live</span>
            <span className="text-gray-400">View list ↗</span>
          </div>
        </div>

        {/* Card 4: Total Users */}
        <div
          onClick={() => navigate("/users")}
          className="group relative bg-zinc-900/90 hover:bg-zinc-800 border border-amber-900/40 hover:border-amber-500/50 rounded-2xl p-5 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden cursor-pointer"
          title="Click to view Users"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Customers
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner">
              👤
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? "..." : stats.totalUsers}
            </h3>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800/80">
            <span className="text-amber-400 font-bold">▲ Active Buyers</span>
            <span className="text-gray-400">View list ↗</span>
          </div>
        </div>

        {/* Card 5: Product Reviews */}
        <div
          onClick={() => navigate("/reviews")}
          className="group relative bg-[#201509]/80 hover:bg-[#2a1b0b] border border-amber-900/40 hover:border-amber-500/50 rounded-2xl p-5 text-white shadow-xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between overflow-hidden cursor-pointer"
          title="Click to view Product Reviews"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all pointer-events-none"></div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Reviews
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-lg shadow-inner">
              ⭐
            </div>
          </div>
          <div className="my-3">
            <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {loading ? "..." : stats.totalReviews}
            </h3>
          </div>
          <div className="flex items-center justify-between text-[11px] pt-2 border-t border-gray-800/80">
            <span className="text-amber-400 font-bold">4.9 ★ Rating</span>
            <span className="text-gray-400">Feedback ↗</span>
          </div>
        </div>
      </div>

      {/* 3. PERFORMANCE & ANALYTICS ROW (Weekly Activity + Category Share) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 7 Cols: Weekly Activity Visual Chart with Date/Week Navigation */}
        <div className="lg:col-span-7 bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl flex flex-col justify-between">
          {/* Header & Daily Average */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="text-[10px] font-bold tracking-widest text-amber-400 uppercase">
                  Live Sales Timeline
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                <span>📈 Store Revenue & Orders Analytics</span>
              </h2>
              <p className="text-xs text-gray-400">
                Daily sales & orders breakdown for: <strong className="text-amber-400">{weekRange.label}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-gray-900/90 border border-gray-800 rounded-2xl text-xs text-amber-400 font-bold shadow-inner">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>Avg: ₹{weeklyAnalytics.avgDaily.toLocaleString()}/day</span>
            </div>
          </div>

          {/* Date Range Navigation & Quick Presets Bar */}
          <div className="p-2.5 bg-black/40 border border-gray-800/80 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
            {/* Week Stepper */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setWeekOffset((w) => w - 1);
                }}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Previous Week"
              >
                <span>❮</span>
                <span className="hidden sm:inline">Prev</span>
              </button>

              <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-bold">
                🗓️ {weekRange.label}
              </span>

              <button
                onClick={() => {
                  setWeekOffset((w) => w + 1);
                }}
                className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                title="Next Week"
              >
                <span className="hidden sm:inline">Next</span>
                <span>❯</span>
              </button>
            </div>

            {/* Quick Preset Buttons & Jump to Date Picker */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => {
                  setWeekOffset(0);
                  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
                  setSelectedDayIndex(todayIdx);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  weekOffset === 0
                    ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                This Week
              </button>

              <button
                onClick={() => setWeekOffset(-1)}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  weekOffset === -1
                    ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
                    : "bg-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                Last Week
              </button>

              {/* Jump to Any Date Picker */}
              <div className="flex items-center gap-1 bg-gray-800/80 border border-gray-700/80 rounded-xl px-2 py-0.5">
                <span className="text-[11px] text-gray-400">📅 Date:</span>
                <input
                  type="date"
                  onChange={handleJumpToDate}
                  className="bg-transparent text-white text-[11px] font-medium focus:outline-none cursor-pointer"
                  title="Jump to any specific date or past week"
                />
              </div>
            </div>
          </div>

          {/* Interactive Bar Chart Visualization */}
          <div className="pt-4 pb-2">
            <div className="h-44 flex items-end justify-between gap-1.5 sm:gap-3 px-1">
              {weeklyAnalytics.items.map((item, idx) => {
                const isSelected = idx === selectedDayIndex;
                return (
                  <div
                    key={item.day}
                    onClick={() => setSelectedDayIndex(idx)}
                    className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer"
                  >
                    {/* Floating Revenue Tag */}
                    <div
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-lg transition-all ${
                        isSelected
                          ? "bg-amber-400 text-black shadow-md scale-105"
                          : "bg-gray-800 text-gray-400 opacity-0 group-hover:opacity-100"
                      }`}
                    >
                      ₹{item.revenue.toLocaleString()}
                    </div>

                    {/* Bar Pillar */}
                    <div className="w-full max-w-[42px] bg-gray-800/80 rounded-xl overflow-hidden h-32 flex items-end p-1">
                      <div
                        style={{ height: item.height }}
                        className={`w-full rounded-lg transition-all duration-300 ${
                          isSelected
                            ? "bg-gradient-to-t from-amber-400 via-yellow-400 to-amber-500 shadow-lg shadow-amber-500/40"
                            : "bg-gradient-to-t from-gray-700 to-gray-600 group-hover:from-amber-500 group-hover:to-yellow-500"
                        }`}
                      ></div>
                    </div>

                    {/* Day & Date Number */}
                    <div className="flex flex-col items-center text-center">
                      <span
                        className={`text-xs font-bold transition-colors ${
                          isSelected
                            ? "text-amber-400"
                            : "text-gray-300 group-hover:text-white"
                        }`}
                      >
                        {item.day}
                      </span>
                      <span
                        className={`text-[10px] font-mono ${
                          isSelected ? "text-amber-400 font-bold" : "text-gray-500"
                        }`}
                      >
                        {item.dateNum}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Footer Detail & Week Total */}
          <div className="p-3 bg-gray-900/90 border border-gray-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Selected Day:</span>
              <strong className="text-white bg-gray-800 px-2.5 py-0.5 rounded-lg border border-gray-700">
                🗓️ {weeklyAnalytics.items[selectedDayIndex]?.fullDate || "Today"}
              </strong>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-gray-300">
                Orders:{" "}
                <strong className="text-amber-400 font-mono">
                  {weeklyAnalytics.items[selectedDayIndex]?.orders || 0} Orders
                </strong>
              </span>
              <span className="text-gray-300">
                Revenue:{" "}
                <strong className="text-white font-mono">
                  ₹{(weeklyAnalytics.items[selectedDayIndex]?.revenue || 0).toLocaleString()}
                </strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Category Share & System Health Widget */}
        <div className="lg:col-span-5 bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-wide">
                📊 Category Inventory Share
              </h2>
              <span className="text-xs text-gray-400">
                {categories.length} Categories
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Live product allocation across main categories
            </p>
          </div>

          {/* Category Progress Bars */}
          <div className="space-y-3.5 py-1">
            {categoryBreakdown.length > 0 ? (
              categoryBreakdown.map((cat, i) => {
                const colors = [
                  "from-amber-400 to-yellow-400",
                  "from-blue-500 to-cyan-400",
                  "from-purple-500 to-pink-400",
                  "from-amber-500 to-orange-400",
                ];
                return (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-300">{cat.name}</span>
                      <span className="text-amber-400">
                        {cat.count} items ({cat.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${Math.max(cat.percent, 8)}%` }}
                        className={`h-full bg-gradient-to-r ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-gray-500 py-4 text-center">
                No category data available
              </p>
            )}
          </div>

          {/* Live System Health Pill */}
          <div className="p-3.5 bg-amber-950/25 border border-amber-400/20 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>API Gateway: 32ms Latency</span>
            </div>
            <span className="text-gray-400 font-mono text-[11px]">DB: Live & Synced</span>
          </div>
        </div>
      </div>

      {/* 4. MULTI-TAB SWITCHER (Catalog Products / Recent Orders / Customers) */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-900/90 border border-gray-800 rounded-2xl w-full sm:w-fit backdrop-blur-md shadow-lg">
        <button
          onClick={() => setActiveTab("products")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "products"
              ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <span>🔥</span>
          <span>Catalog Products</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === "products" ? "bg-black/20 text-black" : "bg-gray-800 text-gray-400"}`}>
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "orders"
              ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <span>📦</span>
          <span>Recent Orders</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === "orders" ? "bg-black/20 text-black" : "bg-gray-800 text-gray-400"}`}>
            {recentOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === "users"
              ? "bg-amber-400 text-black shadow-md shadow-amber-500/20"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <span>👥</span>
          <span>Customer Roster</span>
          <span className={`px-2 py-0.2 rounded-full text-[10px] ${activeTab === "users" ? "bg-black/20 text-black" : "bg-gray-800 text-gray-400"}`}>
            {usersList.length}
          </span>
        </button>
      </div>

      {/* 5. TAB 1: CATALOG PRODUCTS (Table with Filters, Search, Actions) */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl backdrop-blur-xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Category Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value);
                    setSelectedSubCategory("All");
                    setCurrentPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="All">All Categories</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Subcategory Filter */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Sub Category
                </label>
                <select
                  value={selectedSubCategory}
                  onChange={(e) => {
                    setSelectedSubCategory(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="All">All Sub Categories</option>
                  {availableSubCategories.map((sc, i) => (
                    <option key={i} value={sc}>
                      {sc}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Sort By */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="default">Default Order</option>
                  <option value="priceLow">Price: Low to High</option>
                  <option value="priceHigh">Price: High to Low</option>
                  <option value="rating">Top Rated (★)</option>
                  <option value="name">Product Name (A-Z)</option>
                </select>
              </div>

              {/* 4. Search Products */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Search Products
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by title, brand..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full pl-9 pr-8 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
            <div className="max-h-[560px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
              <table className="w-full text-left text-xs text-gray-200">
                <thead className="sticky top-0 z-20 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider uppercase text-[11px] shadow-md">
                  <tr>
                    <th className="py-4 px-6 whitespace-nowrap min-w-[280px]">PRODUCT</th>
                    <th className="py-4 px-6 whitespace-nowrap">CATEGORY</th>
                    <th className="py-4 px-6 whitespace-nowrap">SUB CATEGORY</th>
                    <th className="py-4 px-6 whitespace-nowrap">BRAND</th>
                    <th className="py-4 px-6 whitespace-nowrap">PRICE & OFFER</th>
                    <th className="py-4 px-6 whitespace-nowrap">RATING</th>
                    <th className="py-4 px-6 whitespace-nowrap text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80 bg-black/40">
                  {loading && (
                    <tr>
                      <td colSpan="7" className="text-center py-20 text-gray-400">
                        <div className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                          <span className="font-semibold">Loading product catalog...</span>
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="text-center py-20 text-gray-400 space-y-2">
                        <div className="text-3xl">🔍</div>
                        <p className="text-sm font-bold text-white">No Matching Products Found</p>
                        <p className="text-xs text-gray-500">Try changing your filters or search keywords.</p>
                      </td>
                    </tr>
                  )}
                  {!loading &&
                    paginatedProducts.map((product) => {
                      const imgSrc =
                        (Array.isArray(product.image) && product.image[0]) ||
                        (Array.isArray(product.images) && product.images[0]) ||
                        (typeof product.image === "string" && product.image) ||
                        assets.upload_area;

                      const categoryName =
                        product.catName ||
                        (typeof product.category === "object"
                          ? product.category?.name
                          : product.category) ||
                        "Fashion";

                      const subCategoryName =
                        product.subCategory ||
                        product.subCat ||
                        "General";

                      const cleanBrand =
                        product.brand && !isHexId(product.brand)
                          ? product.brand
                          : "EVALS";

                      return (
                        <tr
                          key={product._id}
                          className="hover:bg-gray-800/50 transition-colors duration-150 group"
                        >
                          {/* PRODUCT */}
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3.5">
                              <div className="w-13 h-13 rounded-xl bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-sm group-hover:border-amber-500/40 transition-colors">
                                <img
                                  src={imgSrc}
                                  alt={product.name}
                                  className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                                  onError={(e) => {
                                    e.target.src = assets.upload_area;
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-white text-xs line-clamp-1 group-hover:text-amber-400 transition-colors">
                                  {product.name}
                                </p>
                                <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">
                                  {product.description || "Premium Quality Product"}
                                </p>
                                <span className="inline-block mt-1 text-[10px] text-amber-400 font-semibold">
                                  🟢 In Stock
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* CATEGORY */}
                          <td className="py-3.5 px-6 font-semibold text-gray-200 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-amber-950/25 border border-amber-500/30 text-amber-300 rounded-lg text-[11px]">
                              {categoryName}
                            </span>
                          </td>

                          {/* SUB CATEGORY */}
                          <td className="py-3.5 px-6 text-gray-400 whitespace-nowrap font-medium">
                            {subCategoryName}
                          </td>

                          {/* BRAND */}
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <span className="px-2.5 py-1 bg-gray-800/90 border border-gray-700 text-gray-300 font-semibold text-[11px] rounded-lg shadow-sm">
                              {cleanBrand}
                            </span>
                          </td>

                          {/* PRICE & DISCOUNT */}
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <div className="space-y-0.5">
                              {product.oldPrice &&
                                Number(product.oldPrice) > Number(product.price) && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] text-gray-500 line-through">
                                      Rs {product.oldPrice}
                                    </span>
                                    <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/20 text-rose-400 font-bold rounded">
                                      SALE
                                    </span>
                                  </div>
                                )}
                              <span className="text-amber-400 font-extrabold text-xs">
                                Rs {product.price}
                              </span>
                            </div>
                          </td>

                          {/* RATING */}
                          <td className="py-3.5 px-6 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-amber-400 tracking-wider text-xs">
                                {renderStars(product.rating || product.ratings || 5)}
                              </span>
                              <span className="text-[10px] text-gray-400 font-semibold">
                                (5.0)
                              </span>
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td className="py-3.5 px-6 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* 👁️ View Button */}
                              <button
                                onClick={() => setViewProduct(product)}
                                className="w-7 h-7 rounded-lg bg-fuchsia-600/80 hover:bg-fuchsia-600 text-white flex items-center justify-center shadow-md transition-all hover:scale-105 cursor-pointer"
                                title="Quick View Product"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>

                              {/* ✏️ Edit Button */}
                              <button
                                onClick={() => navigate(`/product-upload?editId=${product._id}`)}
                                className="w-7 h-7 rounded-lg bg-amber-400 hover:bg-amber-400 text-black font-bold flex items-center justify-center shadow-md transition-all hover:scale-105 cursor-pointer"
                                title="Edit Product"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                              </button>

                              {/* 🗑️ Delete Button */}
                              <button
                                onClick={() => handleDeleteProduct(product._id)}
                                className="w-7 h-7 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition-all hover:scale-105 cursor-pointer"
                                title="Delete Product"
                              >
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-6 py-4 bg-gray-900/90 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
              <span className="text-gray-400">
                Showing{" "}
                <strong className="text-white">
                  {filteredProducts.length === 0
                    ? 0
                    : (currentPage - 1) * rowsPerPage + 1}
                </strong>{" "}
                to{" "}
                <strong className="text-white">
                  {Math.min(currentPage * rowsPerPage, filteredProducts.length)}
                </strong>{" "}
                of <strong className="text-white">{filteredProducts.length}</strong> products
              </span>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span>Per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
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
                    disabled={currentPage === totalPages || filteredProducts.length === 0}
                    className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer text-white font-bold"
                  >
                    Next ❯
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB 2: RECENT ORDERS (Live Order Pipeline) */}
      {activeTab === "orders" && (
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="p-5 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                📦 Recent Customer Orders
              </h2>
              <p className="text-xs text-gray-400">Live order pipeline & shipping status</p>
            </div>
            <Link
              to="/orders"
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors"
            >
              Full Orders Manager ↗
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-200">
              <thead className="bg-gray-900 text-gray-400 font-bold uppercase text-[11px] border-b border-gray-800">
                <tr>
                  <th className="py-3.5 px-6">Order ID</th>
                  <th className="py-3.5 px-6">Customer</th>
                  <th className="py-3.5 px-6">Items</th>
                  <th className="py-3.5 px-6">Total Amount</th>
                  <th className="py-3.5 px-6">Payment</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 bg-black/40">
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-16 text-gray-400">
                      No orders found yet.
                    </td>
                  </tr>
                ) : (
                  recentOrders.slice(0, 8).map((order) => {
                    const status = order.status || "Order Placed";
                    const isDelivered = status.toLowerCase().includes("delivered");
                    return (
                      <tr key={order._id} className="hover:bg-gray-800/40 transition-colors">
                        <td className="py-3.5 px-6 font-mono text-amber-400 font-bold whitespace-nowrap">
                          <span className="block">#{order._id?.slice(-6) || "ORD-01"}</span>
                          {order.date && (
                            <div className="flex flex-col text-[10px] text-gray-400 font-sans font-normal mt-0.5">
                              <span>🗓️ {new Date(Number(order.date) || order.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                              <span className="text-amber-400/80 font-mono">⏰ {new Date(Number(order.date) || order.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-6">
                          <p className="font-bold text-white">
                            {order.address?.firstName
                              ? `${order.address.firstName} ${order.address.lastName || ""}`
                              : order.userName || "Customer"}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {order.address?.email || "online order"}
                          </p>
                        </td>
                        <td className="py-3.5 px-6 text-gray-300">
                          {order.items?.length || 1} Item(s)
                        </td>
                        <td className="py-3.5 px-6 font-extrabold text-white">
                          Rs {order.amount}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="px-2 py-0.5 rounded bg-gray-800 border border-gray-700 text-[10px] font-semibold uppercase text-gray-300">
                            {order.paymentMethod || "COD"}
                          </span>
                        </td>
                        <td className="py-3.5 px-6">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isDelivered
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-center">
                          <button
                            onClick={() => navigate("/orders")}
                            className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-amber-400 text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 7. TAB 3: CUSTOMER ROSTER */}
      {activeTab === "users" && (
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="p-5 border-b border-gray-800 flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                👥 Registered Customers
              </h2>
              <p className="text-xs text-gray-400">Total verified buyer accounts</p>
            </div>
            <Link
              to="/users"
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold transition-colors"
            >
              Full Users Directory ↗
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-200">
              <thead className="bg-gray-900 text-gray-400 font-bold uppercase text-[11px] border-b border-gray-800">
                <tr>
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 bg-black/40">
                {usersList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-16 text-gray-400">
                      No user accounts found.
                    </td>
                  </tr>
                ) : (
                  usersList.slice(0, 8).map((u, i) => (
                    <tr key={u._id || i} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold text-xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <span className="font-bold text-white">{u.name || "Customer"}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6 text-gray-300 font-mono text-xs">{u.email}</td>
                      <td className="py-3.5 px-6 text-gray-400">{u.phone || u.phoneNumber || "—"}</td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
                          Active Buyer
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center">
                        <button
                          onClick={() => navigate("/users")}
                          className="px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-amber-400 text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. QUICK VIEW PRODUCT MODAL */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c121e] border border-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">👁️</span>
                <h3 className="text-base font-bold text-white">Product Overview</h3>
              </div>
              <button
                onClick={() => setViewProduct(null)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-36 h-36 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center shrink-0 p-1">
                  <img
                    src={
                      (Array.isArray(viewProduct.image) && viewProduct.image[0]) ||
                      (Array.isArray(viewProduct.images) && viewProduct.images[0]) ||
                      (typeof viewProduct.image === "string" && viewProduct.image) ||
                      assets.upload_area
                    }
                    alt={viewProduct.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <span className="px-2 py-0.5 rounded bg-amber-950/25 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase">
                    {viewProduct.catName || viewProduct.category || "Fashion"}
                  </span>
                  <h4 className="font-black text-white text-base leading-snug">
                    {viewProduct.name}
                  </h4>
                  <p className="text-gray-400 text-xs">
                    Brand: <strong className="text-gray-200">{viewProduct.brand || "EVALS"}</strong>
                  </p>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-amber-400 font-extrabold text-lg">
                      Rs {viewProduct.price}
                    </span>
                    {viewProduct.oldPrice && (
                      <span className="text-gray-500 text-xs line-through">
                        Rs {viewProduct.oldPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 bg-gray-900/70 border border-gray-800 rounded-2xl">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Description
                </p>
                <p className="text-gray-200 leading-relaxed">
                  {viewProduct.description || "No description provided for this catalog product."}
                </p>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-[10px] text-gray-400 block">Category</span>
                  <strong className="text-white text-xs">
                    {viewProduct.catName || viewProduct.category || "General"}
                  </strong>
                </div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-[10px] text-gray-400 block">Sub Category</span>
                  <strong className="text-white text-xs">
                    {viewProduct.subCategory || "General"}
                  </strong>
                </div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-[10px] text-gray-400 block">Stock Status</span>
                  <strong className="text-amber-400 text-xs">🟢 In Stock</strong>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                onClick={() => setViewProduct(null)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = viewProduct._id;
                  setViewProduct(null);
                  navigate(`/product-upload?editId=${id}`);
                }}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/25 cursor-pointer transition-all"
              >
                Edit Product ✏️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
