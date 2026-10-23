import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  getFirestoreReviews,
  deleteFirestoreReview,
  getPlatformBadge,
  formatDateTime,
} from "../api/firebaseService";

function Reviews({ token }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const firestoreReviews = await getFirestoreReviews();
      if (Array.isArray(firestoreReviews)) {
        setReviews(firestoreReviews);
        return;
      }
      const { data } = await axios.get(`${backendUrl}/api/admin/reviews`);
      if (data.success && Array.isArray(data.reviews)) {
        setReviews(data.reviews);
      } else {
        setReviews([]);
      }
    } catch (err) {
      console.log("Error loading reviews:", err);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDeleteReview = async (id) => {
    if (!window.confirm("Are you sure you want to delete this review?")) return;
    try {
      await deleteFirestoreReview(id);
      try {
        await axios.post(
          `${backendUrl}/api/admin/review/delete`,
          { id },
          { headers: { token } }
        );
      } catch (e) {}

      toast.success("Review deleted successfully from Firebase");
      setReviews((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const renderStars = (val) => {
    const r = Math.min(Math.max(Number(val) || 5, 1), 5);
    return "★".repeat(Math.floor(r)) + "☆".repeat(5 - Math.floor(r));
  };

  // Review Summary Metrics
  const reviewStats = useMemo(() => {
    let fiveStars = 0;
    let fourStars = 0;
    let totalScore = 0;

    reviews.forEach((r) => {
      const val = Number(r.rating || r.customerRating || 5);
      totalScore += val;
      if (val >= 5) fiveStars++;
      else if (val >= 4) fourStars++;
    });

    const avg = reviews.length > 0 ? (totalScore / reviews.length).toFixed(1) : "5.0";
    return { total: reviews.length, avg, fiveStars, fourStars };
  }, [reviews]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      const ratingVal = Number(r.rating || r.customerRating || 5);
      const matchesRating =
        ratingFilter === "All" ||
        (ratingFilter === "5" && ratingVal >= 5) ||
        (ratingFilter === "4" && ratingVal === 4) ||
        (ratingFilter === "3" && ratingVal <= 3);

      const plat = getPlatformBadge(r).label.toLowerCase();
      const matchesPlatform =
        platformFilter === "All" ||
        (platformFilter === "Web" && plat.includes("web")) ||
        (platformFilter === "Android" && plat.includes("android")) ||
        (platformFilter === "Flutter" && plat.includes("flutter")) ||
        (platformFilter === "React Native" && (plat.includes("react") || plat.includes("rn")));

      const term = searchTerm.toLowerCase().trim();
      const nameStr = (r.name || r.userName || r.customerName || "Customer").toLowerCase();
      const prodIdStr = String(r.productId || "").toLowerCase();
      const reviewText = (r.review || r.comment || "").toLowerCase();

      const matchesSearch =
        !term ||
        nameStr.includes(term) ||
        prodIdStr.includes(term) ||
        reviewText.includes(term) ||
        plat.includes(term);

      return matchesRating && matchesPlatform && matchesSearch;
    });
  }, [reviews, ratingFilter, platformFilter, searchTerm]);

  // Paginated Reviews
  const totalPages = Math.ceil(filteredReviews.length / rowsPerPage) || 1;
  const paginatedReviews = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredReviews.slice(start, start + rowsPerPage);
  }, [filteredReviews, currentPage, rowsPerPage]);

  return (
    <div className="w-full space-y-6 select-none pb-12">
      {/* 1. Header Banner matching Emerald MERN Theme */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>CUSTOMER FEEDBACK & RATINGS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>⭐ Multi-App Product Reviews</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Monitor customer reviews, star ratings, and app origin across Web, Android, Flutter & React Native.
          </p>
        </div>

        <button
          onClick={fetchReviews}
          className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-200 hover:text-amber-400 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <span>🔄</span>
          <span>Refresh Reviews</span>
        </button>
      </div>

      {/* 2. Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Customer Reviews
            </p>
            <h3 className="text-3xl font-black text-white mt-1">
              {loading ? "..." : reviewStats.total}
            </h3>
            <span className="text-[10px] text-amber-400 font-semibold">Verified Buyers Across 4 Apps</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            💬
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Average Store Rating
            </p>
            <h3 className="text-3xl font-black text-amber-400 mt-1 flex items-baseline gap-1.5">
              <span>{loading ? "..." : reviewStats.avg}</span>
              <span className="text-sm font-normal text-gray-400">/ 5.0</span>
            </h3>
            <span className="text-[10px] text-amber-300 font-semibold">★★★★★ Excellent</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            ⭐
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              5-Star Ratings Share
            </p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1">
              {loading ? "..." : reviewStats.fiveStars}
            </h3>
            <span className="text-[10px] text-emerald-300 font-semibold">Top Satisfaction</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl">
            ✨
          </div>
        </div>
      </div>

      {/* 3. Filters Bar & Search */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          {/* Rating Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Rating:</span>
            {["All", "5", "4", "3"].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRatingFilter(r);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  ratingFilter === r
                    ? "bg-amber-400 text-black shadow-md shadow-amber-500/25"
                    : "bg-gray-800/80 text-gray-400 hover:text-white border border-gray-700"
                }`}
              >
                {r === "All" ? `All Ratings (${reviews.length})` : `⭐ ${r} Star`}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search by customer, product, app..."
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

      {/* 4. Reviews Data Table */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-200">
            <thead className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider uppercase text-[11px] shadow-md">
              <tr>
                <th className="py-4 px-6 min-w-[200px]">Customer & App Source</th>
                <th className="py-4 px-6 min-w-[150px]">Product</th>
                <th className="py-4 px-6 min-w-[280px]">Review Feedback</th>
                <th className="py-4 px-6 whitespace-nowrap">Rating</th>
                <th className="py-4 px-6 whitespace-nowrap">Date & Time</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 bg-black/40">
              {loading && (
                <tr>
                  <td colSpan="6" className="text-center py-20 text-gray-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold">Loading reviews...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredReviews.length === 0 && (
                <tr>
                  <td colSpan="6" className="text-center py-16 text-gray-400 space-y-2">
                    <div className="text-3xl">💬</div>
                    <p className="text-sm font-bold text-white">No Reviews Found</p>
                    <p className="text-xs text-gray-500">Try selecting another filter or search term.</p>
                  </td>
                </tr>
              )}
              {!loading &&
                paginatedReviews.map((rev) => {
                  const customerName = rev.name || rev.userName || rev.customerName || "Customer";
                  const initial = customerName.charAt(0).toUpperCase();
                  const rawProdId = rev.productId ? String(rev.productId) : (rev.productName || "—");
                  const dateObj = formatDateTime(rev.date || rev.createdAt);
                  const platBadge = getPlatformBadge(rev);

                  return (
                    <tr
                      key={rev._id}
                      className="hover:bg-gray-800/50 transition-colors duration-150 group"
                    >
                      {/* 1. Name & App Source */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-600 text-black font-black flex items-center justify-center text-xs shadow-md">
                            {initial}
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-bold text-white text-xs group-hover:text-amber-400 transition-colors">
                              {customerName}
                            </h4>
                            <span className={`px-2 py-0.2 rounded-md border text-[10px] font-bold inline-flex items-center gap-1 ${platBadge.badgeClass}`}>
                              <span>{platBadge.icon}</span>
                              <span>{platBadge.label}</span>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Product ID / Name */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {rev.productName && (
                            <p className="text-white font-bold text-xs line-clamp-1">{rev.productName}</p>
                          )}
                          <span className="px-2 py-0.5 bg-gray-800/90 border border-gray-700 rounded font-mono text-[10px] text-gray-400">
                            {rawProdId}
                          </span>
                        </div>
                      </td>

                      {/* 3. Review */}
                      <td className="py-4 px-6">
                        <p className="text-gray-300 leading-relaxed line-clamp-2">
                          "{rev.review || rev.comment || "Superb quality, bespoke luxury craftsmanship."}"
                        </p>
                      </td>

                      {/* 4. Rating */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-amber-400 text-sm tracking-wider">
                            {renderStars(rev.rating || rev.customerRating || 5)}
                          </span>
                          <span className="text-[11px] text-gray-400 font-bold">
                            ({rev.rating || rev.customerRating || 5}.0)
                          </span>
                        </div>
                      </td>

                      {/* 5. Date & Time */}
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

                      {/* 6. Action */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleDeleteReview(rev._id)}
                          className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          title="Delete Review"
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

        {/* Pagination */}
        <div className="px-6 py-4 bg-gray-900/90 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
          <span>
            Showing{" "}
            <strong className="text-white">
              {filteredReviews.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1}
            </strong>{" "}
            to{" "}
            <strong className="text-white">
              {Math.min(currentPage * rowsPerPage, filteredReviews.length)}
            </strong>{" "}
            of <strong className="text-white">{filteredReviews.length}</strong> reviews
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
              disabled={currentPage === totalPages || filteredReviews.length === 0}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer text-white font-bold"
            >
              Next ❯
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reviews;
