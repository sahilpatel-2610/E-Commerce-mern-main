import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  getFirestoreProductRams,
  addFirestoreProductRam,
  deleteFirestoreProductRam,
} from "../api/firebaseService";

function ProductRams({ token }) {
  const [rams, setRams] = useState([]);
  const [productRam, setProductRam] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const ramPresets = ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB"];

  const fetchRams = async () => {
    try {
      setLoading(true);
      const firestoreRams = await getFirestoreProductRams();
      if (Array.isArray(firestoreRams) && firestoreRams.length > 0) {
        setRams(firestoreRams);
        return;
      }
      const { data } = await axios.get(`${backendUrl}/api/admin/product-rams`);
      if (data.success && Array.isArray(data.rams)) {
        setRams(data.rams);
      } else {
        setRams([]);
      }
    } catch (err) {
      console.log("Failed to load RAMs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRams();
  }, []);

  const handleAddRam = async (e, customValue = null) => {
    if (e) e.preventDefault();
    const valueToAdd = customValue || productRam;
    if (!valueToAdd.trim()) return;

    try {
      setSubmitting(true);
      await addFirestoreProductRam(valueToAdd.trim());
      try {
        await axios.post(
          `${backendUrl}/api/admin/product-ram/add`,
          { productRam: valueToAdd.trim() },
          { headers: { token } }
        );
      } catch (e) {}

      toast.success(`RAM "${valueToAdd}" added successfully to Firebase!`);
      setProductRam("");
      fetchRams();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRam = async (id, val) => {
    if (!window.confirm(`Are you sure you want to delete RAM "${val || ""}"?`)) return;
    try {
      await deleteFirestoreProductRam(id);
      try {
        await axios.post(
          `${backendUrl}/api/admin/product-ram/delete`,
          { id },
          { headers: { token } }
        );
      } catch (e) {}
      toast.success("RAM deleted successfully from Firebase");
      fetchRams();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full max-w-5xl space-y-6 select-none pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>SPECIFICATIONS & HARDWARE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>💾 Product RAM Configurations</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Define selectable memory capacities for electronic products in your catalog.
          </p>
        </div>

        <Link
          to="/product-list"
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
        >
          ← Back to Catalog
        </Link>
      </div>

      {/* 2. Add New RAM Card + Presets */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 backdrop-blur-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            ➕ Add New RAM Size
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Type custom RAM value or click a quick preset below.
          </p>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Quick Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {ramPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddRam(null, preset)}
                className="px-3 py-1.5 bg-gray-800/80 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-gray-700 hover:border-amber-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => handleAddRam(e)} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            required
            placeholder="e.g. 12GB, 24GB, 48GB"
            value={productRam}
            onChange={(e) => setProductRam(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Add RAM"}
          </button>
        </form>
      </div>

      {/* 3. Existing RAMs List */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 backdrop-blur-xl">
        <div className="flex justify-between items-center pb-2 border-b border-gray-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Active RAM Options in Database
            </h3>
            <p className="text-xs text-gray-400">Total {rams.length} options configured</p>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">
            {rams.length} Configured
          </span>
        </div>

        {loading && (
          <div className="py-12 flex justify-center items-center gap-2 text-gray-400 text-sm">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading RAM configurations...</span>
          </div>
        )}

        {!loading && rams.length === 0 && (
          <div className="py-12 text-center text-gray-500 text-xs">
            No RAM configurations found. Use the form above to add memory options.
          </div>
        )}

        {!loading && rams.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-2">
            {rams.map((item, index) => (
              <div
                key={item._id || index}
                className="bg-gray-800/80 border border-gray-700/80 hover:border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                    💾
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      {item.productRam || "N/A"}
                    </h4>
                    <span className="text-[10px] text-gray-400">RAM Variant</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteRam(item._id, item.productRam)}
                  className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                  title="Delete RAM"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductRams;
