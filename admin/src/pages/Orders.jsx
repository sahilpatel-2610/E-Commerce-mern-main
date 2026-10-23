import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import { assets } from "../assets/admin_assets/assets";
import {
  getFirestoreOrders,
  updateFirestoreOrderStatus,
  deleteFirestoreOrder,
  broadcastAdminNotification,
  getPlatformBadge,
  formatDateTime,
  getOrderCustomerName,
} from "../api/firebaseService";

function Orders({ token }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // View Ordered Products Modal / Invoice Modal
  const [viewOrderModal, setViewOrderModal] = useState(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getFirestoreOrders();
      if (Array.isArray(data)) {
        setOrders(data);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.warn("Firestore orders fetch failed:", err.message);
      try {
        if (token) {
          const res = await axios.post(
            `${backendUrl}/api/order/list`,
            {},
            { headers: { token } }
          );
          if (res.data?.success && Array.isArray(res.data.orders)) {
            setOrders(res.data.orders);
          } else {
            setOrders([]);
          }
        }
      } catch (backendErr) {
        toast.error("Failed to load orders: " + backendErr.message);
        setOrders([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllOrders = fetchOrders;

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await updateFirestoreOrderStatus(orderId, newStatus);
      try {
        if (token) {
          await axios.post(
            `${backendUrl}/api/order/status`,
            { orderId, status: newStatus },
            { headers: { token } }
          );
        }
      } catch (e) {}

      // Auto-broadcast live notification to mobile app
      if (typeof broadcastAdminNotification === "function") {
        broadcastAdminNotification(
          `🚚 ORDER STATUS: ${newStatus.toUpperCase()}`,
          `Order #${String(orderId).slice(0, 10)} status is now "${newStatus}".`,
          "order",
          { orderId, status: newStatus }
        ).catch(() => {});
      }

      toast.success(`Order status updated to ${newStatus} in Firebase`);
      setOrders((prev) =>
        (Array.isArray(prev) ? prev : []).map((o) =>
          o._id === orderId ? { ...o, status: newStatus } : o
        )
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      await deleteFirestoreOrder(orderId);
      try {
        if (token) {
          await axios.post(
            `${backendUrl}/api/admin/order/delete`,
            { orderId },
            { headers: { token } }
          );
        }
      } catch (e) {}

      toast.success("Order deleted successfully from Firebase");
      setOrders((prev) =>
        (Array.isArray(prev) ? prev : []).filter((o) => o._id !== orderId)
      );
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Status Metrics Breakdown
  const orderStats = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    let pending = 0;
    let shipped = 0;
    let delivered = 0;
    let revenue = 0;

    list.forEach((o) => {
      revenue += Number(o.amount || 0);
      const s = (o.status || "").toLowerCase();
      if (s.includes("deliver")) delivered++;
      else if (s.includes("ship") || s.includes("out")) shipped++;
      else pending++;
    });

    return { total: list.length, pending, shipped, delivered, revenue };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    const list = Array.isArray(orders) ? orders : [];
    return list.filter((order) => {
      const s = (order.status || "").toLowerCase();
      const matchesStatus =
        statusFilter === "All" ||
        s === statusFilter.toLowerCase() ||
        (statusFilter === "Pending" && (s.includes("place") || s.includes("pack"))) ||
        (statusFilter === "Shipped" && (s.includes("ship") || s.includes("out"))) ||
        (statusFilter === "Delivered" && s.includes("deliver"));

      const plat = getPlatformBadge(order).label.toLowerCase();
      const matchesPlatform =
        platformFilter === "All" ||
        (platformFilter === "Web" && plat.includes("web")) ||
        (platformFilter === "Android" && plat.includes("android")) ||
        (platformFilter === "Flutter" && plat.includes("flutter")) ||
        (platformFilter === "React Native" && (plat.includes("react") || plat.includes("rn")));

      const term = searchTerm.toLowerCase().trim();
      const addr = order.address || {};
      const fullName = getOrderCustomerName(order).toLowerCase();
      const orderIdStr = String(order._id || order.orderId || order.id || "").toLowerCase();
      const city = String(addr.city || order.city || "").toLowerCase();
      const phone = String(addr.phone || order.phone || "").toLowerCase();
      const email = String(addr.email || order.customerEmail || order.userEmail || "").toLowerCase();

      const matchesSearch =
        !term ||
        orderIdStr.includes(term) ||
        fullName.includes(term) ||
        city.includes(term) ||
        phone.includes(term) ||
        email.includes(term) ||
        plat.includes(term);

      return matchesStatus && matchesPlatform && matchesSearch;
    });
  }, [orders, statusFilter, platformFilter, searchTerm]);

  // Paginated Orders
  const totalPages = Math.ceil(filteredOrders.length / rowsPerPage) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredOrders.slice(start, start + rowsPerPage);
  }, [filteredOrders, currentPage, rowsPerPage]);

  const getStatusColor = (st) => {
    const s = (st || "").toLowerCase();
    if (s.includes("deliver")) {
      return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    }
    if (s.includes("ship") || s.includes("out")) {
      return "bg-blue-500/20 text-blue-300 border-blue-500/40";
    }
    if (s.includes("pack")) {
      return "bg-amber-500/20 text-amber-300 border-amber-500/40";
    }
    if (s.includes("cancel")) {
      return "bg-rose-500/20 text-rose-300 border-rose-500/40";
    }
    return "bg-purple-500/20 text-purple-300 border-purple-500/40";
  };

  return (
    <div className="w-full space-y-6 select-none pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>4-PROJECT LIVE ORDER FULFILLMENT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📦 Multi-App Customer Orders Pipeline</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Track orders across Web Storefront, Android, Flutter & React Native apps in real-time.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-200 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span>🔄</span>
          <span>Refresh Orders</span>
        </button>
      </div>

      {/* 2. Top 4 Order KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Orders
            </p>
            <h3 className="text-3xl font-black text-white mt-1">
              {loading ? "..." : orderStats.total}
            </h3>
            <span className="text-[10px] text-gray-400">Lifetime Orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-xl">
            📦
          </div>
        </div>

        {/* Pending / Packing */}
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Pending / Packing
            </p>
            <h3 className="text-3xl font-black text-amber-400 mt-1">
              {loading ? "..." : orderStats.pending}
            </h3>
            <span className="text-[10px] text-gray-400">Needs Dispatch</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            ⏳
          </div>
        </div>

        {/* Shipped / In Transit */}
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              In Transit / Shipped
            </p>
            <h3 className="text-3xl font-black text-blue-400 mt-1">
              {loading ? "..." : orderStats.shipped}
            </h3>
            <span className="text-[10px] text-gray-400">On the Way</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-xl">
            🚚
          </div>
        </div>

        {/* Delivered */}
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              Delivered
            </p>
            <h3 className="text-3xl font-black text-amber-400 mt-1">
              {loading ? "..." : orderStats.delivered}
            </h3>
            <span className="text-[10px] text-amber-400">Completed Orders</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            ✅
          </div>
        </div>
      </div>

      {/* 3. Filters Bar & Search */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          {/* Status Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Status:</span>
            {["All", "Pending", "Shipped", "Delivered"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setStatusFilter(st);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-amber-400 text-black shadow-md shadow-amber-500/25"
                    : "bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700"
                }`}
              >
                {st === "All" ? `All Orders (${orders.length})` : st}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-80">
            <input
              type="text"
              placeholder="Search by Order ID, Customer, App..."
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

        {/* Platform Origin Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-800/80">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">App Source:</span>
          {[
            { id: "All", label: "All 4 Platforms", icon: "📱" },
            { id: "Web", label: "Web Storefront", icon: "🌐" },
            { id: "Android", label: "Mobile Android", icon: "🤖" },
            { id: "Flutter", label: "Mobile Flutter", icon: "💙" },
            { id: "React Native", label: "Mobile React Native", icon: "⚛️" },
          ].map((pf) => (
            <button
              key={pf.id}
              onClick={() => {
                setPlatformFilter(pf.id);
                setCurrentPage(1);
              }}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                platformFilter === pf.id
                  ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md"
                  : "bg-gray-900/90 text-gray-400 hover:text-white border border-gray-800"
              }`}
            >
              <span>{pf.icon}</span>
              <span>{pf.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Orders Data Table */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-200">
            <thead className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider uppercase text-[11px] shadow-md">
              <tr>
                <th className="py-4 px-6">ORDER ID & APP SOURCE</th>
                <th className="py-4 px-6 min-w-[220px]">CUSTOMER & DELIVERY</th>
                <th className="py-4 px-6">ITEMS</th>
                <th className="py-4 px-6">AMOUNT & PAYMENT</th>
                <th className="py-4 px-6">PARCEL STATUS</th>
                <th className="py-4 px-6 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 bg-black/40">
              {loading && (
                <tr>
                  <td colSpan="6" className="text-center py-20 text-gray-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold">Loading orders pipeline...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-gray-400 space-y-2">
                    <div className="text-3xl">📦</div>
                    <p className="text-sm font-bold text-white">No Orders Found</p>
                    <p className="text-xs text-gray-500">No customer orders matching this filter.</p>
                  </td>
                </tr>
              )}
              {!loading &&
                paginatedOrders.map((order) => {
                  const addr = order.address || {};
                  const fullName = getOrderCustomerName(order);
                  const dateObj = formatDateTime(order.date || order.createdAt);
                  const platBadge = getPlatformBadge(order);
                  const displayCity = addr.city || order.city || "";
                  const displayStreet = addr.street || addr.address || order.address || "";
                  const displayState = addr.state || order.state || "";
                  const displayZip = addr.zipcode || addr.pincode || order.pincode || "";
                  const displayPhone = addr.phone || order.phone || "No phone";

                  return (
                    <tr
                      key={order._id || order.id || order.orderId}
                      className="hover:bg-gray-800/50 transition-colors duration-150 group"
                    >
                      {/* ORDER ID & APP SOURCE & DATE / TIME */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold text-xs">
                              #{String(order._id || order.orderId || order.id).slice(-8).toUpperCase()}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 ${platBadge.badgeClass}`}>
                              <span>{platBadge.icon}</span>
                              <span>{platBadge.label}</span>
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 text-[11px]">
                            <span className="text-gray-200 font-medium">🗓️ {dateObj.date}</span>
                            {dateObj.time && (
                              <span className="text-[10px] text-amber-400 font-mono">
                                ⏰ {dateObj.time}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CUSTOMER & DELIVERY */}
                      <td className="py-4 px-6">
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">
                            {fullName}
                          </h4>
                          <p className="text-[11px] text-gray-400 line-clamp-1">
                            📍 {displayStreet ? `${displayStreet}, ` : ""}{displayCity}{displayState ? `, ${displayState}` : ""} {displayZip}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            📞 {displayPhone}
                          </p>
                        </div>
                      </td>

                      {/* ITEMS */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <button
                          onClick={() => setViewOrderModal(order)}
                          className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 hover:text-amber-300 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <span>🛍️</span>
                          <span>{order.items?.length || 1} Item(s)</span>
                          <span className="text-gray-500">↗</span>
                        </button>
                      </td>

                      {/* AMOUNT & PAYMENT */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="text-amber-400 font-extrabold text-sm block">
                            Rs {order.amount}
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                String(order.paymentMethod || "").toLowerCase().includes("stripe") || order.payment
                                  ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                  : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                              }`}
                            >
                              {String(order.paymentMethod || "").toLowerCase().includes("stripe") || order.payment
                                ? "💳 Stripe Card"
                                : "💵 COD"}
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                order.payment ? "text-emerald-400" : "text-amber-400"
                              }`}
                            >
                              {order.payment ? "✓ Paid" : "Pending"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* PARCEL STATUS SELECTOR */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <select
                          value={order.status || "Order Placed"}
                          onChange={(e) => handleStatusChange(order._id, e.target.value)}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-extrabold focus:outline-none cursor-pointer transition-colors ${getStatusColor(
                            order.status
                          )}`}
                        >
                          <option value="Order Placed" className="bg-gray-900 text-white">
                            📦 Order Placed
                          </option>
                          <option value="Packing" className="bg-gray-900 text-white">
                            ⚙️ Packing
                          </option>
                          <option value="Shipped" className="bg-gray-900 text-white">
                            🚚 Shipped
                          </option>
                          <option value="Out for delivery" className="bg-gray-900 text-white">
                            🛵 Out for Delivery
                          </option>
                          <option value="Delivered" className="bg-gray-900 text-white">
                            ✅ Delivered
                          </option>
                          <option value="Cancelled" className="bg-gray-900 text-white">
                            ❌ Cancelled
                          </option>
                        </select>
                      </td>

                      {/* ACTION */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewOrderModal(order)}
                            className="px-2.5 py-1.5 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="View Receipt & Address"
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order._id)}
                            className="px-2.5 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Delete Order Record"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-900/90 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
          <span>
            Showing{" "}
            <strong className="text-white">
              {filteredOrders.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
            </strong>{" "}
            to{" "}
            <strong className="text-white">
              {Math.min(currentPage * rowsPerPage, filteredOrders.length)}
            </strong>{" "}
            of <strong className="text-white">{filteredOrders.length}</strong> orders
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
              disabled={currentPage === totalPages || filteredOrders.length === 0}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer text-white font-bold"
            >
              Next ❯
            </button>
          </div>
        </div>
      </div>

      {/* 5. View Order Details Modal */}
      {viewOrderModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c121e] border border-gray-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            {(() => {
              const modalDate = formatDateTime(viewOrderModal.date || viewOrderModal.createdAt);
              const modalPlat = getPlatformBadge(viewOrderModal);
              return (
                <div className="flex justify-between items-center pb-3 border-b border-gray-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>📦</span>
                        <span>Order Invoice Details</span>
                      </h3>
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 ${modalPlat.badgeClass}`}>
                        <span>{modalPlat.icon}</span>
                        <span>{modalPlat.label}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-amber-400 text-xs font-bold">
                        #{String(viewOrderModal._id || viewOrderModal.orderId || viewOrderModal.id)}
                      </span>
                      <span className="text-[11px] text-gray-400">
                        • 🗓️ {modalDate.date} {modalDate.time && `⏰ ${modalDate.time}`}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewOrderModal(null)}
                    className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                  >
                    ✕
                  </button>
                </div>
              );
            })()}

            {/* Customer & Address Details */}
            {(() => {
              const modalAddr = viewOrderModal.address || {};
              const modalFullName = getOrderCustomerName(viewOrderModal);
              const modalEmail =
                viewOrderModal.customerEmail ||
                viewOrderModal.userEmail ||
                viewOrderModal.userId ||
                modalAddr.email ||
                "No email";
              const modalPhone =
                viewOrderModal.phone ||
                modalAddr.phone ||
                "No phone";
              const modalStreet =
                modalAddr.street ||
                modalAddr.address ||
                viewOrderModal.address ||
                "";
              const modalCity = modalAddr.city || viewOrderModal.city || "";
              const modalState = modalAddr.state || viewOrderModal.state || "";
              const modalZip = modalAddr.zipcode || modalAddr.pincode || viewOrderModal.pincode || "";
              const modalPlat = getPlatformBadge(viewOrderModal);

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                        Customer Profile
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Origin: {modalPlat.label}
                      </span>
                    </div>
                    <p className="text-white font-bold text-sm text-amber-400">
                      {modalFullName}
                    </p>
                    <p className="text-gray-300">📧 {modalEmail}</p>
                    <p className="text-gray-400">📞 {modalPhone}</p>
                  </div>

                  <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl space-y-1 text-xs">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Delivery Destination
                    </span>
                    <p className="text-gray-200">{modalStreet || "No street address"}</p>
                    <p className="text-gray-300 font-semibold">
                      {modalCity}{modalState ? `, ${modalState}` : ""} {modalZip ? `- ${modalZip}` : ""}
                    </p>
                    <p className="text-gray-400">Country: {modalAddr.country || "India"}</p>
                  </div>
                </div>
              );
            })()}

            {/* Ordered Items List */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                Ordered Products ({viewOrderModal.items?.length || 0})
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {viewOrderModal.items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={
                            (Array.isArray(item.image) && item.image[0]) ||
                            (typeof item.image === "string" ? item.image : assets.upload_area)
                          }
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h5 className="font-bold text-white">{item.name}</h5>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                          <span>Qty: {item.quantity || 1}</span>
                          {item.size && <span>• Size: {item.size}</span>}
                        </div>
                      </div>
                    </div>
                    <span className="text-amber-400 font-extrabold text-sm">
                      Rs {item.price}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="p-4 bg-amber-950/25 border border-amber-500/30 rounded-2xl flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-400 block">Total Amount Payable</span>
                <span className="text-xs font-bold text-gray-300">
                  Payment: {viewOrderModal.paymentMethod || "COD"} ({viewOrderModal.payment ? "Paid" : "Pending"})
                </span>
              </div>
              <span className="text-2xl font-black text-amber-400">
                Rs {viewOrderModal.amount}
              </span>
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewOrderModal(null)}
                className="px-6 py-2.5 bg-amber-400 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl shadow-lg cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
