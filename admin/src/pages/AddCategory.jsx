import React, { useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { addFirestoreCategory } from "../api/firebaseService";

function AddCategory({ token }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#10b981");
  const [loading, setLoading] = useState(false);

  const colorPresets = [
    { name: "Emerald", hex: "#10b981" },
    { name: "Ocean Blue", hex: "#3b82f6" },
    { name: "Purple", hex: "#8b5cf6" },
    { name: "Amber Gold", hex: "#f59e0b" },
    { name: "Rose Pink", hex: "#ec4899" },
    { name: "Cyan Teal", hex: "#06b6d4" },
    { name: "Crimson", hex: "#ef4444" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setLoading(true);
      const cleanName = name.trim();
      const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const docId = `cat_${slug}`;

      await addFirestoreCategory({
        _id: docId,
        id: docId,
        name: cleanName,
        color,
        image: "",
        subCategories: [],
        createdAt: new Date().toISOString(),
      });

      try {
        await axios.post(
          `${backendUrl}/api/admin/category/add`,
          { _id: docId, id: docId, name: cleanName, color, image: "" },
          { headers: { token } }
        );
      } catch (e) {}

      setLoading(false);
      toast.success("Category Created Successfully in Firebase!");
      navigate("/category-list");
    } catch (err) {
      setLoading(false);
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
            <span>STORE ARCHITECTURE</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>➕ Create New Main Category</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Add a top-level department to classify products across your e-commerce store.
          </p>
        </div>

        <Link
          to="/category-list"
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
        >
          ← Back to Categories
        </Link>
      </div>

      {/* 2. 2-Column Creator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column (7 Cols) */}
        <div className="lg:col-span-7">
          <form
            onSubmit={handleSubmit}
            className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-xl"
          >
            <h2 className="text-base font-bold text-white tracking-wide pb-2 border-b border-gray-800 flex items-center gap-2">
              <span>📁</span>
              <span>Category Details</span>
            </h2>

            {/* Category Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Category Title *
              </label>
              <input
                type="text"
                required
                maxLength={50}
                placeholder="e.g. Luxury Footwear, Casual Wear"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* Theme Color Picker */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Accent Theme Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-12 rounded-xl bg-transparent border border-gray-700 cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="px-4 py-3 bg-gray-800/90 border border-gray-700 rounded-xl text-white font-mono text-sm focus:outline-none uppercase w-32"
                />
              </div>

              {/* Color Presets */}
              <div className="flex flex-wrap gap-2 pt-2">
                {colorPresets.map((cp) => (
                  <button
                    key={cp.hex}
                    type="button"
                    onClick={() => setColor(cp.hex)}
                    className="px-3 py-1.5 rounded-xl border border-gray-700 hover:border-gray-500 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer bg-gray-800/80 hover:bg-gray-800 text-gray-300"
                  >
                    <span
                      style={{ backgroundColor: cp.hex }}
                      className="w-3 h-3 rounded-full"
                    ></span>
                    <span>{cp.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving to Firebase...</span>
                </div>
              ) : (
                <span>🚀 Publish Category to Store</span>
              )}
            </button>
          </form>
        </div>

        {/* Live Preview Column (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2 pb-2 border-b border-gray-800">
              <span>👁️</span>
              <span>Live Storefront Badge Preview</span>
            </h3>
            <p className="text-xs text-gray-400">
              See in real-time how this category pill and badge will look to store customers.
            </p>

            {/* Live Visual Card */}
            <div className="p-6 bg-black/60 border border-gray-800 rounded-2xl space-y-4 overflow-hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    style={{ backgroundColor: color }}
                    className="w-5 h-5 rounded-full shadow-lg border border-white/30 shrink-0"
                  ></div>
                  <h4
                    className="font-extrabold text-white text-sm sm:text-base truncate"
                    title={name || "Untitled Category"}
                  >
                    {name || "Untitled Category"}
                  </h4>
                </div>
                <span
                  style={{ backgroundColor: `${color}25`, borderColor: `${color}50`, color: color }}
                  className="px-3 py-1 rounded-xl text-xs font-bold border font-mono shrink-0"
                >
                  {color}
                </span>
              </div>

              <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-xs text-gray-400 space-y-1">
                <span className="text-amber-400 font-bold block">✓ Navigation Header Pill</span>
                <p>This department will appear in the main customer navbar and filters.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddCategory;
