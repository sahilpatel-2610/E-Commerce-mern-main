import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import {
  getFirestoreCategories,
  deleteFirestoreCategory,
  updateFirestoreCategory,
} from "../api/firebaseService";

function Categories({ token }) {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit Modal State
  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState("");
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#f59e0b");

  const colorPresets = [
    "#f59e0b", // Amber
    "#eab308", // Yellow
    "#10b981", // Emerald
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#ef4444", // Red
  ];

  const fetchCategories = async () => {
    try {
      setLoading(true);
      let combined = [];

      try {
        const firestoreCats = await getFirestoreCategories();
        if (Array.isArray(firestoreCats) && firestoreCats.length > 0) {
          combined = [...firestoreCats];
        }
      } catch (e) {}

      try {
        const { data } = await axios.get(`${backendUrl}/api/admin/categories`);
        if (data && data.success && Array.isArray(data.categories)) {
          data.categories.forEach((c) => {
            if (
              !combined.some(
                (ex) =>
                  (ex._id || ex.id) === (c._id || c.id) ||
                  ex.name?.toLowerCase().trim() === c.name?.toLowerCase().trim()
              )
            ) {
              combined.push(c);
            }
          });
        }
      } catch (e) {}

      const uniqueMap = new Map();
      combined.forEach((c) => {
        const key = (c.name || "").toLowerCase().trim();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, c);
        }
      });

      setCategories(Array.from(uniqueMap.values()));
    } catch (err) {
      console.log("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openEditModal = (cat) => {
    setEditId(cat._id);
    setEditName(cat.name);
    setEditColor(cat.color || "#f59e0b");
    setEditModal(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.warning("Category name cannot be empty");
      return;
    }
    try {
      await updateFirestoreCategory(editId, {
        name: editName.trim(),
        color: editColor,
      });
      try {
        await axios.post(
          `${backendUrl}/api/admin/category/edit`,
          { id: editId, name: editName.trim(), color: editColor },
          { headers: { token } }
        );
      } catch (e) {}
      toast.success("Category updated successfully in Firebase!");
      setEditModal(false);
      fetchCategories();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${name}"? All related subcategories may be affected.`
      )
    ) {
      return;
    }
    try {
      await deleteFirestoreCategory(id);
      try {
        await axios.post(
          `${backendUrl}/api/admin/category/delete`,
          { id },
          { headers: { token } }
        );
      } catch (e) {}
      toast.success("Category deleted successfully from Firebase!");
      fetchCategories();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Filter Categories
  const filteredCategories = useMemo(() => {
    return categories.filter((c) => {
      const q = searchTerm.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = (c.name || "").toLowerCase().includes(q);
      const subMatch = (c.subCategories || []).some((s) =>
        s.toLowerCase().includes(q)
      );
      return nameMatch || subMatch;
    });
  }, [categories, searchTerm]);

  // Metrics
  const totalSubCategories = useMemo(() => {
    return categories.reduce(
      (sum, c) => sum + (c.subCategories || []).length,
      0
    );
  }, [categories]);

  return (
    <div className="w-full space-y-6 select-none max-w-7xl mx-auto text-gray-200 pb-12">
      {/* 1. Header Banner matching Reviews / MERN Theme */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>CATALOG TAXONOMY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📁 Category Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Organize main product departments, subcategories, and color branding.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Link
            to="/sub-category-list"
            className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            Sub Categories ({totalSubCategories}) ↗
          </Link>
          <Link
            to="/add-category"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all cursor-pointer"
          >
            <span>+ Add Category</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 3 KPI Summary Cards matching Reviews theme */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Main Departments
            </p>
            <h3 className="text-3xl font-black text-white mt-1">
              {categories.length}
            </h3>
            <span className="text-[10px] text-amber-400 font-semibold">
              Active in Store
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            📁
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Subcategories
            </p>
            <h3 className="text-3xl font-black text-amber-400 mt-1">
              {totalSubCategories}
            </h3>
            <Link
              to="/sub-category-list"
              className="text-[10px] text-amber-300 hover:underline font-semibold"
            >
              View list ↗
            </Link>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            📑
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Sync Status
            </p>
            <h3 className="text-lg font-bold text-white mt-1 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              Fully Synced
            </h3>
            <span className="text-[10px] text-gray-400">Live in Firebase</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center text-xl">
            ⚡
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
          />
        </div>
        <div className="text-xs text-gray-400 font-medium">
          Showing <strong className="text-white">{filteredCategories.length}</strong> of{" "}
          {categories.length} Categories
        </div>
      </div>

      {/* 4. Categories Table matching Reviews Container */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider uppercase text-[11px] shadow-md">
              <tr>
                <th className="py-4 px-6">Category Name</th>
                <th className="py-4 px-6">Brand Color</th>
                <th className="py-4 px-6">Sub Categories</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-400">
                    <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading categories...
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-gray-400">
                    No categories found.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, idx) => (
                  <tr key={cat._id || idx} className="hover:bg-gray-800/60 transition-colors">
                    <td
                      className="py-4 px-6 font-bold text-white text-sm max-w-xs truncate"
                      title={cat.name}
                    >
                      {cat.name}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20"
                          style={{ backgroundColor: cat.color || "#f59e0b" }}
                        ></span>
                        <span className="text-gray-400 font-mono text-[11px]">
                          {cat.color || "#f59e0b"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {(() => {
                          const isHex = (str) => typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str.trim());
                          const rawSubs = cat.subCategories || cat.subcategories || [];
                          const cleanSubs = rawSubs
                            .map((s) => (typeof s === "object" ? s.name : s))
                            .filter((s) => s && !isHex(s));

                          if (cleanSubs.length === 0) {
                            return (
                              <span className="text-gray-500 text-[11px] italic">
                                No subcategories
                              </span>
                            );
                          }

                          return cleanSubs.map((sName, sIdx) => (
                            <span
                              key={sIdx}
                              className="px-2 py-0.5 rounded-lg bg-gray-800/90 border border-gray-700 text-gray-300 text-[11px]"
                            >
                              {sName}
                            </span>
                          ));
                        })()}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(cat)}
                          className="p-2 rounded-xl bg-gray-800/90 hover:bg-gray-700 border border-gray-700 text-amber-300 hover:text-white transition-colors cursor-pointer"
                          title="Edit Category"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat._id, cat.name)}
                          className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 transition-colors cursor-pointer"
                          title="Delete Category"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Category Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#090d16] border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>✏️ Edit Category</span>
              </h3>
              <button
                onClick={() => setEditModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer font-bold w-8 h-8 rounded-full bg-gray-800/80 hover:bg-gray-700 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 focus:border-amber-400 rounded-xl text-white text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {colorPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        editColor === c ? "scale-110 border-white ring-2 ring-amber-400" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 cursor-pointer transition-all"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditModal(false)}
                  className="flex-1 py-3 bg-gray-800/90 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl border border-gray-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Categories;
