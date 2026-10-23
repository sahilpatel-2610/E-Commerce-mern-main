import React, { useEffect, useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  getFirestoreSubscribers,
  deleteFirestoreSubscriber,
  getPlatformBadge,
  formatDateTime,
} from "../api/firebaseService";

function Subscribers() {
  const [subscribers, setSubscribers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState("All");
  const [copied, setCopied] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchSubscribers = async () => {
    try {
      setLoading(true);
      const data = await getFirestoreSubscribers();
      setSubscribers(data.reverse());
    } catch (error) {
      console.error("Error fetching subscribers:", error);
      toast.error("Failed to load subscribers from Firebase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this subscriber from Firebase?")) {
      return;
    }
    try {
      const res = await deleteFirestoreSubscriber(id);
      if (res.success) {
        toast.success("Subscriber removed from Firebase!");
        setSubscribers((prev) => prev.filter((s) => s._id !== id));
      } else {
        toast.error("Failed to delete subscriber");
      }
    } catch (err) {
      toast.error(err.message || "Error deleting subscriber");
    }
  };

  const handleCopyAll = () => {
    if (subscribers.length === 0) {
      toast.info("No subscriber emails to copy!");
      return;
    }
    const emails = subscribers.map((s) => s.email).filter(Boolean).join(", ");
    navigator.clipboard.writeText(emails);
    setCopied(true);
    toast.success(`📋 Copied ${subscribers.length} subscriber emails!`);
    setTimeout(() => setCopied(false), 3000);
  };

  // Filtered subscribers
  const filteredSubscribers = useMemo(() => {
    return subscribers.filter((s) => {
      const plat = getPlatformBadge(s).label.toLowerCase();
      const matchesPlatform =
        platformFilter === "All" ||
        (platformFilter === "Web" && plat.includes("web")) ||
        (platformFilter === "Android" && plat.includes("android")) ||
        (platformFilter === "Flutter" && plat.includes("flutter")) ||
        (platformFilter === "React Native" && (plat.includes("react") || plat.includes("rn")));

      const term = searchTerm.toLowerCase().trim();
      const emailStr = (s.email || "").toLowerCase();

      return matchesPlatform && (!term || emailStr.includes(term) || plat.includes(term));
    });
  }, [subscribers, platformFilter, searchTerm]);

  const totalPages = Math.ceil(filteredSubscribers.length / itemsPerPage) || 1;
  const paginatedSubscribers = filteredSubscribers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 select-none text-white">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-[#0d121f] via-[#090d16] to-[#04060a] border border-gray-800 p-6 rounded-3xl shadow-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="text-[11px] font-bold tracking-widest text-amber-400 uppercase">
              Firebase Firestore Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
            Multi-App VIP Subscribers
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage customer email leads across Web Storefront, Android, Flutter & React Native in Firebase Firestore.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>{copied ? "✓ Copied!" : "📋 Copy All Emails"}</span>
          </button>

          <button
            onClick={fetchSubscribers}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/80 hover:bg-gray-700 text-gray-200 border border-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Subscribers
            </p>
            <h3 className="text-3xl font-black text-white mt-1">
              {loading ? "..." : subscribers.length}
            </h3>
            <span className="text-[10px] text-amber-400 font-semibold">Leads from 4 Platforms</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            📬
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Subscription Status
            </p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1 flex items-baseline gap-1.5">
              <span>100%</span>
              <span className="text-sm font-normal text-gray-400">Active</span>
            </h3>
            <span className="text-[10px] text-emerald-300 font-semibold">✓ Verified Leads</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl">
            ✨
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Marketing Readiness
            </p>
            <h3 className="text-3xl font-black text-amber-300 mt-1">
              Ready
            </h3>
            <span className="text-[10px] text-amber-400 font-semibold">One-Click Email Blast</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            🚀
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Controls */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search by subscriber email or platform..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900/80 border border-gray-700/80 rounded-2xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
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

      {/* 4. Table */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#101726] border-b border-gray-800 text-gray-400 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-4 px-6">Subscriber</th>
                <th className="py-4 px-6">App Source</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Subscribed Date & Time</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-medium">
              {loading && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-amber-400">
                    <div className="flex justify-center items-center gap-3">
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm font-bold">Loading subscribers from Firebase...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && paginatedSubscribers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-gray-400 space-y-2">
                    <div className="text-3xl">📬</div>
                    <h4 className="text-sm font-bold text-gray-300">No Subscribers Found</h4>
                    <p className="text-xs text-gray-500">Subscribers who sign up via any app will appear here.</p>
                  </td>
                </tr>
              )}

              {!loading &&
                paginatedSubscribers.map((sub) => {
                  const initial = (sub.email || "S").charAt(0).toUpperCase();
                  const dateObj = formatDateTime(sub.date || sub.createdAt);
                  const platBadge = getPlatformBadge(sub);

                  return (
                    <tr
                      key={sub._id}
                      className="hover:bg-gray-800/50 transition-colors duration-150 group"
                    >
                      {/* 1. Initial */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-black font-black flex items-center justify-center text-xs shadow-md">
                            {initial}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">
                              {sub.email?.split("@")[0]}
                            </h4>
                            <span className="text-[10px] text-amber-400 font-semibold">
                              ✓ VIP Member
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. App Source */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md border text-[11px] font-bold inline-flex items-center gap-1.5 ${platBadge.badgeClass}`}>
                          <span>{platBadge.icon}</span>
                          <span>{platBadge.label}</span>
                        </span>
                      </td>

                      {/* 3. Email Address */}
                      <td className="py-4 px-6 whitespace-nowrap font-mono text-xs text-gray-200">
                        {sub.email}
                      </td>

                      {/* 4. Subscribed Date & Time */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-300 text-xs">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-gray-200">🗓️ {dateObj.date}</span>
                          {dateObj.time && (
                            <span className="text-[11px] text-amber-400 font-mono font-medium">
                              ⏰ {dateObj.time}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. Status */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[11px] font-bold">
                          ✓ Active
                        </span>
                      </td>

                      {/* 6. Action */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(sub._id)}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Delete Subscriber"
                        >
                          Delete 🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* 5. Pagination Footer */}
        {!loading && filteredSubscribers.length > 0 && (
          <div className="py-4 px-6 border-t border-gray-800 bg-[#0a0f1d] flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-400">
            <div>
              Showing <span className="text-white font-bold">{paginatedSubscribers.length}</span> of{" "}
              <span className="text-white font-bold">{filteredSubscribers.length}</span> subscribers
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800 rounded-lg text-gray-300 font-bold transition-colors cursor-pointer"
              >
                Prev
              </button>
              <span className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg font-bold text-amber-400">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:hover:bg-gray-800 rounded-lg text-gray-300 font-bold transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Subscribers;
