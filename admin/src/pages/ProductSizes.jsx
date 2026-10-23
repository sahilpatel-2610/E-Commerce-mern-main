import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  getFirestoreProductSizes,
  addFirestoreProductSize,
  deleteFirestoreProductSize,
} from "../api/firebaseService";

function ProductSizes({ token }) {
  const [sizes, setSizes] = useState([]);
  const [size, setSize] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const sizePresets = [
    "XS", "S", "M", "L", "XL", "XXL", "3XL", "28", "30", "32", "34", "36", "38", "40", "Free Size"
  ];

  const fetchSizes = async () => {
    try {
      setLoading(true);
      const firestoreSizes = await getFirestoreProductSizes();
      if (Array.isArray(firestoreSizes)) {
        setSizes(firestoreSizes);
        return;
      }
      const { data } = await axios.get(`${backendUrl}/api/admin/product-sizes`);
      if (data.success && Array.isArray(data.sizes)) {
        setSizes(data.sizes);
      } else {
        setSizes([]);
      }
    } catch (err) {
      console.log("Error loading sizes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSizes();
  }, []);

  const handleAddSize = async (e, customValue = null) => {
    if (e) e.preventDefault();
    const valueToAdd = customValue || size;
    if (!valueToAdd.trim()) return;

    try {
      setSubmitting(true);
      await addFirestoreProductSize(valueToAdd.trim());
      try {
        await axios.post(
          `${backendUrl}/api/admin/product-size/add`,
          { size: valueToAdd.trim() },
          { headers: { token } }
        );
      } catch (e) {}

      toast.success("Size added successfully to Firebase");
      setSize("");
      fetchSizes();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSize = async (id) => {
    if (!window.confirm("Are you sure you want to delete this size?")) return;
    try {
      await deleteFirestoreProductSize(id);
      try {
        await axios.post(
          `${backendUrl}/api/admin/product-size/delete`,
          { id },
          { headers: { token } }
        );
      } catch (e) {}
      toast.success("Size deleted successfully from Firebase");
      fetchSizes();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="w-full space-y-6 select-none max-w-7xl mx-auto text-gray-200 pb-12">
      {/* 1. Header Banner matching Reviews / MERN Theme */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>APPAREL ATTRIBUTES</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📏 Product Size Presets</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Configure clothing and footwear sizes available across your store catalog.
          </p>
        </div>

        <Link
          to="/add"
          className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
        >
          <span>Product Upload</span>
          <span>↗</span>
        </Link>
      </div>

      {/* 2. Top 3 KPI Summary Cards matching Reviews theme */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Active Size Options
            </p>
            <h3 className="text-3xl font-black text-white mt-1">
              {loading ? "..." : sizes.length}
            </h3>
            <span className="text-[10px] text-amber-400 font-semibold">Store Catalog Options</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            📏
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Quick Preset Badges
            </p>
            <h3 className="text-3xl font-black text-amber-400 mt-1">
              {sizePresets.length}
            </h3>
            <span className="text-[10px] text-amber-300 font-semibold">Ready to Apply</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            🏷️
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Sync Status
            </p>
            <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              Live Synced
            </h3>
            <span className="text-[10px] text-gray-400">Pure Firebase Cloud</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-xl">
            ⚡
          </div>
        </div>
      </div>

      {/* 3. Add Size Form matching Reviews Container */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 backdrop-blur-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-gray-800">
          <span>➕</span>
          <span>Add Custom Size or Dimension</span>
        </h3>

        <form onSubmit={handleAddSize} className="flex flex-col sm:flex-row gap-3 max-w-lg">
          <input
            type="text"
            placeholder="Enter custom size (e.g. 42, XXL, Free Size)..."
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-500 outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 cursor-pointer transition-all disabled:opacity-50"
          >
            {submitting ? "Adding..." : "+ Add Size"}
          </button>
        </form>

        <div className="pt-2">
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider block mb-3">
            ⚡ Quick-Add Fashion Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {sizePresets.map((sp) => (
              <button
                key={sp}
                type="button"
                onClick={() => handleAddSize(null, sp)}
                className="px-3.5 py-1.5 rounded-xl bg-gray-800/90 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-gray-700 hover:border-amber-500/40 text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-105"
              >
                + {sp}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Active Sizes List matching Reviews Cards */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>🏷️</span>
            <span>Active Store Sizes ({sizes.length})</span>
          </h3>
          <span className="text-xs text-gray-400">Click ✕ to remove</span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-400">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <span>Loading sizes from Firebase...</span>
          </div>
        ) : sizes.length === 0 ? (
          <div className="py-10 text-center text-gray-500 text-xs">
            No sizes configured yet. Click the presets above to add sizes to your store catalog.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 pt-2">
            {sizes.map((s, idx) => (
              <div
                key={s._id || idx}
                className="px-4 py-2.5 rounded-2xl bg-gray-800/90 hover:bg-gray-800 border border-gray-700 hover:border-amber-500/40 flex items-center gap-3 text-sm font-bold text-white shadow-md transition-all group"
              >
                <span className="group-hover:text-amber-300 transition-colors">{s.size}</span>
                <button
                  onClick={() => handleDeleteSize(s._id)}
                  className="w-5 h-5 rounded-full bg-gray-900/80 group-hover:bg-rose-500/20 text-gray-400 group-hover:text-rose-400 flex items-center justify-center text-xs transition-colors cursor-pointer"
                  title="Remove size"
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

export default ProductSizes;
