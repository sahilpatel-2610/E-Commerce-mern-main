import React, { useEffect, useState, useMemo } from "react";
import { useShopContext } from "../context/ShopContext";
import Title from "../components/Title";
import { toast } from "react-toastify";
import api from "../api/api";
import { getFirestoreOrders } from "../api/firebaseService";
import { Link } from "react-router-dom";
import {
  HiOutlineShoppingBag,
  HiOutlineTruck,
  HiOutlineDocumentText,
  HiOutlineArrowPath,
  HiOutlineClipboardDocumentCheck,
  HiOutlineSparkles,
  HiCheck,
  HiOutlineClock,
  HiMagnifyingGlass,
  HiOutlineShieldCheck,
  HiXMark,
} from "react-icons/hi2";
import { RiTruckLine, RiSecurePaymentLine, RiFileDownloadLine, RiPrinterLine } from "react-icons/ri";

function Orders() {
  const [orderData, setOrderData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderForTrack, setSelectedOrderForTrack] = useState(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const { token, currency, navigate, addToCart } = useShopContext();

  const loadOrderData = async () => {
    try {
      setLoading(true);
      let localUser = {};
      try {
        localUser = JSON.parse(localStorage.getItem("user") || "{}");
      } catch (e) {}

      const userEmail = (localUser.email || "").toLowerCase().trim();
      const userId = localUser.id || localUser._id || "";
      const lastOrderEmail = (localStorage.getItem("last_order_email") || "").toLowerCase().trim();

      // Read local client orders placed in this browser
      let localPlacedOrders = [];
      try {
        const raw = localStorage.getItem("vraj_client_user_orders");
        if (raw) localPlacedOrders = JSON.parse(raw);
      } catch (_) {}
      const localPlacedIds = new Set(localPlacedOrders.map((o) => o._id || o.id || o.orderId).filter(Boolean));

      // 1. Primary: Fetch from Firebase Firestore
      const firestoreOrders = await getFirestoreOrders();
      const combinedOrders = Array.isArray(firestoreOrders) ? firestoreOrders : [];

      if (combinedOrders.length > 0 || localPlacedOrders.length > 0) {
        // Strict user filtering: Only show orders placed by this user or in this browser session
        const userOrders = combinedOrders.filter((order) => {
          const ordId = order._id || order.id || order.orderId;
          const isLocallyPlaced = ordId && localPlacedIds.has(ordId);

          const ordEmail = (
            order.userEmail ||
            order.customerEmail ||
            order.address?.email ||
            order.email ||
            ""
          )
            .toLowerCase()
            .trim();
          const ordUserId = order.userId || "";

          const matchesUser =
            (userEmail && ordEmail === userEmail) ||
            (lastOrderEmail && ordEmail === lastOrderEmail) ||
            (userId && ordUserId === userId);

          return isLocallyPlaced || matchesUser;
        });

        let matchingOrders = userOrders;
        if (matchingOrders.length === 0 && localPlacedOrders.length > 0) {
          matchingOrders = localPlacedOrders;
        }

        let allOrderItem = [];
        matchingOrders.forEach((order) => {
          const rawItems = Array.isArray(order.items)
            ? order.items
            : typeof order.items === "object" && order.items !== null
            ? Object.values(order.items)
            : [];

          rawItems.forEach((item, itemIdx) => {
            const rawImg = item.image || item.images?.[0] || (Array.isArray(item.image) ? item.image[0] : "") || "";
            allOrderItem.push({
              ...item,
              name: item.name || item.title || "Luxury Atelier Apparel",
              image: rawImg,
              price: Number(item.price || order.amount || 0),
              quantity: Number(item.quantity || 1),
              size: item.size || "M",
              itemKey: `${order._id || order.id || "ord"}_${item._id || item.id || itemIdx}`,
              status: order.status || "Order Placed",
              payment: order.payment === true || String(order.paymentMethod || "").toLowerCase().includes("stripe"),
              paymentMethod: order.paymentMethod || order.payment_method || (order.payment ? "STRIPE (CARD)" : "COD"),
              date: order.date || order.createdAt,
              orderId: order._id || order.id || order.orderId,
              address: order.address,
              orderTotal: Number(order.amount || (item.price * (item.quantity || 1))),
            });
          });
        });
        setOrderData(allOrderItem.reverse());
        return;
      }

      // 2. Fallback: Backend API
      if (token) {
        const { data } = await api.post(
          "/api/order/userOrders",
          {},
          { headers: { token } }
        );

        if (data.success && Array.isArray(data.orders)) {
          let allOrderItem = [];
          data.orders.forEach((order) => {
            (order.items || []).forEach((item, itemIdx) => {
              allOrderItem.push({
                ...item,
                itemKey: `${order._id}_${item._id || item.id || itemIdx}`,
                status: order.status || "Order Placed",
                payment: order.payment,
                paymentMethod: order.paymentMethod || "COD",
                date: order.date,
                orderId: order._id,
                address: order.address,
                orderTotal: order.amount || (item.price * item.quantity),
              });
            });
          });
          setOrderData(allOrderItem.reverse());
        }
      }
    } catch (error) {
      console.log("Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrderData();

    const handleFocus = () => loadOrderData();
    const handleStorage = (e) => {
      if (e.key === "vraj_client_user_orders" || e.key === "last_placed_order_id") {
        loadOrderData();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorage);
    };
  }, [token]);

  const copyOrderId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Order ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getStatusCategory = (status) => {
    const s = String(status || "").toLowerCase().trim();
    if (s.includes("deliver")) return "delivered";
    if (s.includes("ship") || s.includes("transit") || s.includes("way") || s.includes("out") || s.includes("dispatch")) return "shipped";
    if (s.includes("pack") || s.includes("process")) return "packing";
    if (s.includes("cancel")) return "cancelled";
    return "placed";
  };

  const getStatusLevel = (status) => {
    const cat = getStatusCategory(status);
    if (cat === "delivered") return 4;
    if (cat === "shipped") return 3;
    if (cat === "packing") return 2;
    if (cat === "cancelled") return 0;
    return 1; // placed
  };

  const getStatusBadge = (status) => {
    const cat = getStatusCategory(status);
    if (cat === "delivered") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          Delivered
        </span>
      );
    }
    if (cat === "shipped") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          Shipped / In Transit
        </span>
      );
    }
    if (cat === "packing") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
          Packed & Processing
        </span>
      );
    }
    if (cat === "cancelled") {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <span className="w-2 h-2 rounded-full bg-rose-400"></span>
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
        Order Placed
      </span>
    );
  };

  const getPaymentBadge = (method, isPaid) => {
    const m = String(method || "").trim().toLowerCase();
    if (m.includes("stripe") || m.includes("card") || m.includes("credit") || m.includes("debit") || isPaid === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
          <span>💳</span>
          <span>Stripe (Card)</span>
        </span>
      );
    }
    if (m.includes("razor") || m.includes("upi")) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
          <span>⚡</span>
          <span>Razorpay / UPI</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
        <span>💵</span>
        <span>Cash on Delivery (COD)</span>
      </span>
    );
  };

  // Filter Orders using useMemo
  const filteredOrders = useMemo(() => {
    return orderData.filter((item) => {
      const cat = getStatusCategory(item.status);

      let statusMatch = false;
      if (activeTab === "all") {
        statusMatch = true;
      } else if (activeTab === "placed") {
        statusMatch = cat === "placed";
      } else if (activeTab === "packing" || activeTab === "processing") {
        statusMatch = cat === "packing";
      } else if (activeTab === "shipped") {
        statusMatch = cat === "shipped";
      } else if (activeTab === "delivered") {
        statusMatch = cat === "delivered";
      } else if (activeTab === "cancelled") {
        statusMatch = cat === "cancelled";
      }

      const q = searchQuery.toLowerCase().trim();
      const queryMatch =
        !q ||
        String(item.name || "").toLowerCase().includes(q) ||
        String(item.orderId || "").toLowerCase().includes(q) ||
        String(item.paymentMethod || "").toLowerCase().includes(q) ||
        String(item.status || "").toLowerCase().includes(q);

      return statusMatch && queryMatch;
    });
  }, [orderData, activeTab, searchQuery]);

  const tabs = useMemo(() => [
    { id: "all", label: "All Orders", count: orderData.length },
    {
      id: "placed",
      label: "🟡 Placed",
      count: orderData.filter((o) => getStatusCategory(o.status) === "placed").length,
    },
    {
      id: "packing",
      label: "📦 Packed",
      count: orderData.filter((o) => getStatusCategory(o.status) === "packing").length,
    },
    {
      id: "shipped",
      label: "🚚 In Transit",
      count: orderData.filter((o) => getStatusCategory(o.status) === "shipped").length,
    },
    {
      id: "delivered",
      label: "🟢 Delivered",
      count: orderData.filter((o) => getStatusCategory(o.status) === "delivered").length,
    },
  ], [orderData]);

  return (
    <div className="min-h-screen text-gray-200 py-10 px-4 sm:px-6 lg:px-12 select-none max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6 mb-8">
        <div>
          <div className="text-2xl sm:text-3xl font-bold">
            <Title text1={"MY"} text2={"ORDERS"} />
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Track your bespoke apparel shipments, view itemized receipts, and monitor delivery status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadOrderData}
            disabled={loading}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-gray-300 hover:text-white rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <HiOutlineArrowPath className={`text-sm ${loading ? "animate-spin text-amber-400" : ""}`} />
            <span>Sync Live Status</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        {/* Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-950/40"
                  : "bg-zinc-900/60 text-gray-400 border border-zinc-800 hover:bg-zinc-800 hover:text-gray-200"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === tab.id ? "bg-amber-400 text-black font-extrabold" : "bg-zinc-800 text-gray-400"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <HiMagnifyingGlass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm" />
          <input
            type="text"
            placeholder="Search by name or Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-amber-400 rounded-xl py-2 pl-9 pr-3.5 text-xs text-white placeholder-gray-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-gray-400 gap-3">
          <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs tracking-wider uppercase font-semibold">Loading orders from Firestore...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl shadow-2xl backdrop-blur-xl max-w-xl mx-auto my-6 space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl shadow-inner shadow-amber-500/10">
            <HiOutlineShoppingBag />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-extrabold text-white">
              {activeTab === "all" ? "No Orders Found" : `No "${activeTab.toUpperCase()}" Orders`}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mx-auto">
              {searchQuery
                ? "No orders match your search criteria. Try a different query."
                : activeTab !== "all"
                ? `You have no orders currently in "${activeTab}" status.`
                : "You haven't placed any bespoke fashion orders yet."}
            </p>
          </div>
          {activeTab !== "all" ? (
            <button
              type="button"
              onClick={() => setActiveTab("all")}
              className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-amber-400 text-amber-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Show All Orders
            </button>
          ) : (
            <Link
              to="/collection"
              className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 transition-all"
            >
              Explore Collections
            </Link>
          )}
        </div>
      ) : (
        /* Orders List - Luxury Styled Cards */
        <div className="space-y-6">
          {filteredOrders.map((item, index) => {
            const imgSrc =
              (Array.isArray(item.image) && item.image[0]) ||
              (Array.isArray(item.images) && item.images[0]) ||
              (typeof item.image === "string" && item.image) ||
              "";

            const statusLevel = getStatusLevel(item.status);
            const itemTotal = (item.price || 0) * (item.quantity || 1);

            return (
              <div
                key={item.itemKey || index}
                className="bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700/90 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl transition-all duration-300 space-y-6 group"
              >
                {/* 1. Top Meta Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 text-xs">
                  <div className="flex items-center gap-3 flex-wrap text-gray-400">
                    {/* Order ID with Copy */}
                    <div
                      onClick={() => copyOrderId(item.orderId || `VC-${index + 1000}`)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-950 border border-zinc-800 text-gray-300 hover:text-amber-300 hover:border-amber-500/40 cursor-pointer font-mono font-bold transition-colors"
                      title="Click to copy Order ID"
                    >
                      <span>ORDER #{item.orderId ? item.orderId.substring(0, 12) : `VC-${index + 1000}`}</span>
                      {copiedId === item.orderId ? (
                        <HiCheck className="text-emerald-400 text-sm" />
                      ) : (
                        <HiOutlineClipboardDocumentCheck className="text-gray-500 text-sm" />
                      )}
                    </div>

                    <span>•</span>

                    {/* Order Date */}
                    <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                      <HiOutlineClock className="text-amber-400 text-sm" />
                      <span>
                        {new Date(item.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </span>

                    <span>•</span>

                    {/* Payment Method */}
                    <span className="flex items-center gap-1.5">
                      <RiSecurePaymentLine className="text-amber-400 text-sm" />
                      <span>Payment:</span>
                      {getPaymentBadge(item.paymentMethod, item.payment)}
                    </span>
                  </div>

                  <div>{getStatusBadge(item.status)}</div>
                </div>

                {/* 2. Main Product Info & Details Grid */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-start sm:items-center gap-5 flex-1 min-w-0">
                    <Link
                      to={`/product/${item._id || item.id}`}
                      className="w-20 sm:w-24 h-20 sm:h-24 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 p-1 group-hover:border-amber-500/40 transition-colors relative block"
                    >
                      {imgSrc ? (
                        <img
                          src={imgSrc}
                          className="w-full h-full object-cover rounded-xl group-hover:scale-105 transition-transform duration-500"
                          alt={item.name}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">
                          Apparel
                        </div>
                      )}
                    </Link>

                    <div className="space-y-2 min-w-0 flex-1">
                      <Link
                        to={`/product/${item._id || item.id}`}
                        className="text-base sm:text-lg font-bold text-white hover:text-amber-400 transition-colors leading-snug truncate block"
                      >
                        {item.name}
                      </Link>

                      <div className="flex items-center gap-3 flex-wrap text-xs sm:text-sm">
                        <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">
                          {currency}{item.price?.toLocaleString()}
                        </span>

                        <span className="px-2.5 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 text-gray-300 font-semibold text-xs">
                          Qty: <strong className="text-white">{item.quantity || 1}</strong>
                        </span>

                        {item.size && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-xs">
                            Size: {item.size}
                          </span>
                        )}

                        <span className="text-xs text-gray-500">
                          Total: <strong className="text-gray-300 font-mono">{currency}{itemTotal.toLocaleString()}.00</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions (Track, Invoice, Buy Again) */}
                  <div className="flex items-center gap-3 w-full md:w-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-zinc-800/80 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedOrderForInvoice(item)}
                      className="px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      title="View Invoice & Receipt"
                    >
                      <HiOutlineDocumentText className="text-base text-amber-400" />
                      <span>Invoice</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedOrderForTrack(item)}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <HiOutlineTruck className="text-base" />
                      <span>Track Order</span>
                    </button>
                  </div>
                </div>

                {/* 3. Live 4-Stage Visual Progress Stepper */}
                <div className="pt-2 border-t border-zinc-800/60">
                  <div className="grid grid-cols-4 gap-2 text-center relative py-2">
                    {[
                      { step: 1, label: "Order Placed", icon: "✓" },
                      { step: 2, label: "Quality Packed", icon: "📦" },
                      { step: 3, label: "Dispatched", icon: "🚚" },
                      { step: 4, label: "Delivered", icon: "✨" },
                    ].map((st, i) => {
                      const isComplete = statusLevel >= st.step;
                      const isCurrent = statusLevel === st.step;

                      return (
                        <div key={st.step} className="flex flex-col items-center gap-1.5 relative">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all z-10 ${
                              isComplete
                                ? "bg-amber-400 text-black shadow-md shadow-amber-500/30"
                                : "bg-zinc-950 border border-zinc-800 text-gray-600"
                            }`}
                          >
                            {st.icon}
                          </div>
                          <span
                            className={`text-[11px] font-semibold tracking-tight ${
                              isCurrent
                                ? "text-amber-300 font-bold"
                                : isComplete
                                ? "text-gray-300"
                                : "text-gray-600"
                            }`}
                          >
                            {st.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Bottom Trust Note */}
                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <HiOutlineShieldCheck className="text-amber-400 text-sm" />
                    <span>Vraj Creation Verified Quality & Express Dispatch</span>
                  </span>
                  <span className="font-mono text-zinc-400">
                    {item.address?.city ? `Shipping to ${item.address.city}, ${item.address.state || "India"}` : "Standard Delivery"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TRACKING TIMELINE MODAL */}
      {selectedOrderForTrack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#09090b] border border-zinc-800 w-full max-w-lg rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
                  <HiOutlineTruck />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Live Shipment Tracking</h3>
                  <p className="text-xs text-gray-400 font-mono">
                    AWB: {selectedOrderForTrack.orderId ? `VC-EXP-${selectedOrderForTrack.orderId.substring(0, 8).toUpperCase()}` : "VC-EXP-984210"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrderForTrack(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <HiXMark className="text-base" />
              </button>
            </div>

            {/* Product Summary In Modal */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                {selectedOrderForTrack.image ? (
                  <img
                    src={Array.isArray(selectedOrderForTrack.image) ? selectedOrderForTrack.image[0] : selectedOrderForTrack.image}
                    alt={selectedOrderForTrack.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-600">VC</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{selectedOrderForTrack.name}</h4>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>Qty: {selectedOrderForTrack.quantity || 1}</span>
                  {selectedOrderForTrack.size && <span>• Size: {selectedOrderForTrack.size}</span>}
                  <span>• {currency}{selectedOrderForTrack.price?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Live Milestones */}
            <div className="space-y-4 pl-3 border-l-2 border-amber-500/40 ml-4 py-2">
              <div className="relative">
                <div className="absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full bg-amber-400 shadow-md shadow-amber-500/50"></div>
                <h5 className="text-xs font-bold text-white">Order Confirmed & Placed</h5>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Verified with Vraj Creation production hub in Surat, Gujarat.
                </p>
              </div>

              <div className="relative">
                <div
                  className={`absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full ${
                    getStatusLevel(selectedOrderForTrack.status) >= 2
                      ? "bg-amber-400 shadow-md shadow-amber-500/50"
                      : "bg-zinc-800 border border-zinc-600"
                  }`}
                ></div>
                <h5 className="text-xs font-bold text-white">Quality Inspection & Packaging</h5>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Handcrafted pieces inspected and boxed in tamper-evident protective casing.
                </p>
              </div>

              <div className="relative">
                <div
                  className={`absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full ${
                    getStatusLevel(selectedOrderForTrack.status) >= 3
                      ? "bg-amber-400 shadow-md shadow-amber-500/50"
                      : "bg-zinc-800 border border-zinc-600"
                  }`}
                ></div>
                <h5 className="text-xs font-bold text-white">In Transit via Express Courier</h5>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Handed over to BlueDart / Delhivery Express Logistics.
                </p>
              </div>

              <div className="relative">
                <div
                  className={`absolute -left-[19px] top-1 w-3.5 h-3.5 rounded-full ${
                    getStatusLevel(selectedOrderForTrack.status) >= 4
                      ? "bg-emerald-400 shadow-md shadow-emerald-500/50"
                      : "bg-zinc-800 border border-zinc-600"
                  }`}
                ></div>
                <h5 className="text-xs font-bold text-white">Delivered & Verified</h5>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Delivered to recipient address with OTP verification.
                </p>
              </div>
            </div>

            {/* Destination Address */}
            {selectedOrderForTrack.address && (
              <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 text-xs space-y-1">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Delivery Destination
                </span>
                <p className="font-bold text-white">
                  {selectedOrderForTrack.address.firstName} {selectedOrderForTrack.address.lastName}
                </p>
                <p className="text-gray-400">
                  {selectedOrderForTrack.address.street}, {selectedOrderForTrack.address.city},{" "}
                  {selectedOrderForTrack.address.state} - {selectedOrderForTrack.address.pincode}
                </p>
                <p className="text-gray-400">Phone: {selectedOrderForTrack.address.phone}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedOrderForTrack(null)}
              className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
            >
              Close Tracker
            </button>
          </div>
        </div>
      )}

      {/* INVOICE & RECEIPT MODAL */}
      {selectedOrderForInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-[#09090b] border border-zinc-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in duration-200 text-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-lg font-black text-white">VRAJ CREATION</h3>
                <p className="text-[11px] text-amber-400 uppercase font-mono tracking-wider">Official Tax Invoice</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrderForInvoice(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                <HiXMark className="text-base" />
              </button>
            </div>

            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              <div>
                <span className="text-gray-500 block">Invoice Number:</span>
                <span className="font-mono font-bold text-white">INV-{selectedOrderForInvoice.orderId?.substring(0, 8).toUpperCase() || "VC-9842"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Invoice Date:</span>
                <span className="font-medium text-white">
                  {new Date(selectedOrderForInvoice.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Payment Method:</span>
                <span className="font-bold text-amber-400 uppercase">
                  {selectedOrderForInvoice.paymentMethod?.toLowerCase().includes("stripe") || selectedOrderForInvoice.payment
                    ? "CREDIT / DEBIT CARD (STRIPE)"
                    : "CASH ON DELIVERY (COD)"}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block">Payment Status:</span>
                <span className={`font-bold ${selectedOrderForInvoice.payment || selectedOrderForInvoice.paymentMethod?.toLowerCase().includes("stripe") ? "text-emerald-400" : "text-amber-400"}`}>
                  {selectedOrderForInvoice.payment || selectedOrderForInvoice.paymentMethod?.toLowerCase().includes("stripe") ? "PAID (ONLINE)" : "PENDING ON DELIVERY"}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div className="border-t border-b border-zinc-800 py-3 space-y-2 text-xs">
              <div className="flex justify-between font-bold text-gray-400 uppercase tracking-wider text-[10px]">
                <span>Description</span>
                <span>Amount</span>
              </div>
              <div className="flex justify-between items-center text-white py-1">
                <div>
                  <span className="font-bold">{selectedOrderForInvoice.name}</span>
                  <div className="text-[11px] text-gray-400">
                    Size: {selectedOrderForInvoice.size || "Standard"} × Qty: {selectedOrderForInvoice.quantity || 1}
                  </div>
                </div>
                <span className="font-mono font-bold">
                  {currency}{((selectedOrderForInvoice.price || 0) * (selectedOrderForInvoice.quantity || 1)).toLocaleString()}.00
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-400 pt-2 border-t border-zinc-800/80">
                <span>Shipping & Handling</span>
                <span className="text-emerald-400 font-bold">FREE</span>
              </div>
              <div className="flex justify-between items-center text-sm font-black text-amber-400 pt-2 border-t border-zinc-800">
                <span>Grand Total</span>
                <span className="font-mono text-base">
                  {currency}{((selectedOrderForInvoice.price || 0) * (selectedOrderForInvoice.quantity || 1)).toLocaleString()}.00
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="flex-1 py-3 bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                <RiPrinterLine className="text-base" />
                <span>Print Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderForInvoice(null)}
                className="px-5 py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
