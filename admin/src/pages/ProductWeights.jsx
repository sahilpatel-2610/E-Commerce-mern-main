import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  getFirestoreProductWeights,
  addFirestoreProductWeight,
  deleteFirestoreProductWeight,
} from "../api/firebaseService";

function ProductWeights({ token }) {
  const [weights, setWeights] = useState([]);
  const [productWeight, setProductWeight] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const weightPresets = ["100g", "250g", "500g", "1kg", "2kg", "5kg", "10kg"];

  const fetchWeights = async () => {
    try {
      setLoading(true);
      const firestoreWeights = await getFirestoreProductWeights();
      if (Array.isArray(firestoreWeights) && firestoreWeights.length > 0) {
        setWeights(firestoreWeights);
        return;
      }
      const { data } = await axios.get(`${backendUrl}/api/admin/product-weights`);
      if (data.success && Array.isArray(data.weights)) {
        setWeights(data.weights);
      } else {
        setWeights([]);
      }
    } catch (err) {
      console.log("Failed to load weights:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeights();
  }, []);

  const handleAddWeight = async (e, customValue = null) => {
    if (e) e.preventDefault();
    const valueToAdd = customValue || productWeight;
    if (!valueToAdd.trim()) return;

    try {
      setSubmitting(true);
      await addFirestoreProductWeight(valueToAdd.trim());
      try {
        await axios.post(
          `${backendUrl}/api/admin/product-weight/add`,
          { productWeight: valueToAdd.trim() },
          { headers: { token } }
        );
      } catch (e) {}

      toast.success(`Weight "${valueToAdd}" added successfully to Firebase!`);
      setProductWeight("");
      fetchWeights();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWeight = async (id, val) => {
    if (!window.confirm(`Are you sure you want to delete Weight "${val || ""}"?`)) return;
    try {
      await deleteFirestoreProductWeight(id);
      try {
        await axios.post(
          `${backendUrl}/api/admin/product-weight/delete`,
          { id },
          { headers: { token } }
        );
      } catch (e) {}
      toast.success("Weight deleted successfully from Firebase");
      fetchWeights();
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
            <span>MEASUREMENTS & PACKAGING</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>⚖️ Product Weight Specifications</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Configure product weight variants for groceries, food, perfumes, and general items.
          </p>
        </div>

        <Link
          to="/product-list"
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
        >
          ← Back to Catalog
        </Link>
      </div>

      {/* 2. Add New Weight Card + Presets */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 backdrop-blur-xl">
        <div>
          <h2 className="text-base font-bold text-white tracking-wide">
            ➕ Add New Weight Metric
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Enter custom weight or click a preset shortcut.
          </p>
        </div>

        {/* Presets */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Quick Presets:
          </span>
          <div className="flex flex-wrap gap-2">
            {weightPresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddWeight(null, preset)}
                className="px-3 py-1.5 bg-gray-800/80 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-gray-700 hover:border-amber-500/40 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                + {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={(e) => handleAddWeight(e)} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="text"
            required
            placeholder="e.g. 750g, 1.5kg, 3kg"
            value={productWeight}
            onChange={(e) => setProductWeight(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
          />
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Add Weight"}
          </button>
        </form>
      </div>

      {/* 3. Existing Weights List */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 backdrop-blur-xl">
        <div className="flex justify-between items-center pb-2 border-b border-gray-800">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              Active Weights in Database
            </h3>
            <p className="text-xs text-gray-400">Total {weights.length} weights configured</p>
          </div>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">
            {weights.length} Configured
          </span>
        </div>

        {loading && (
          <div className="py-12 flex justify-center items-center gap-2 text-gray-400 text-sm">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
            <span>Loading weight options...</span>
          </div>
        )}

        {!loading && weights.length === 0 && (
          <div className="py-12 text-center text-gray-500 text-xs">
            No weight options found. Use the form above to add metrics.
          </div>
        )}

        {!loading && weights.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-2">
            {weights.map((item, index) => (
              <div
                key={item._id || index}
                className="bg-gray-800/80 border border-gray-700/80 hover:border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                    ⚖️
                  </div>
                  <div>
                    <h4 className="font-extrabold text-white text-sm">
                      {item.productWeight || "N/A"}
                    </h4>
                    <span className="text-[10px] text-gray-400">Weight Unit</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteWeight(item._id, item.productWeight)}
                  className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white flex items-center justify-center text-xs transition-colors cursor-pointer"
                  title="Delete Weight"
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

export default ProductWeights;
