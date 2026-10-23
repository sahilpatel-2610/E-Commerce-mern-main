import React, { useEffect, useState } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import {
  getFirestoreCategories,
  addFirestoreSubCategory,
} from "../api/firebaseService";

function AddSubCategory({ token }) {
  const navigate = useNavigate();
  const [subCat, setSubCat] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        let catList = [];
        try {
          const firestoreCats = await getFirestoreCategories();
          if (Array.isArray(firestoreCats) && firestoreCats.length > 0) {
            catList = [...firestoreCats];
          }
        } catch (e) {}

        try {
          const { data } = await axios.get(`${backendUrl}/api/admin/categories`);
          if (data && data.success && Array.isArray(data.categories)) {
            data.categories.forEach((c) => {
              if (
                !catList.some(
                  (ec) =>
                    (ec._id || ec.id) === (c._id || c.id) ||
                    ec.name?.toLowerCase().trim() === c.name?.toLowerCase().trim()
                )
              ) {
                catList.push(c);
              }
            });
          }
        } catch (e) {}

        setCategories(catList);
        if (catList.length > 0) {
          setCategory((prev) => prev || catList[0]._id || catList[0].id);
        }
      } catch (err) {
        console.log(err);
      }
    };
    fetchCats();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subCat.trim()) {
      toast.error("Subcategory name is required");
      return;
    }

    try {
      setLoading(true);
      const cleanSub = subCat.trim();
      const subSlug = cleanSub.toLowerCase().replace(/[^a-z0-9]/g, "_");
      const parentSlug = category ? String(category).toLowerCase().replace(/[^a-z0-9]/g, "_") : "gen";
      const docId = `sub_${parentSlug}_${subSlug}`;

      await addFirestoreSubCategory({
        _id: docId,
        id: docId,
        name: cleanSub,
        parentId: category,
        createdAt: new Date().toISOString(),
      });

      try {
        await axios.post(
          `${backendUrl}/api/admin/subcategory/add`,
          { _id: docId, id: docId, name: cleanSub, parentId: category },
          { headers: { token } }
        );
      } catch (e) {}

      setLoading(false);
      toast.success("Subcategory Created Successfully in Firebase!");
      navigate("/sub-category-list");
    } catch (err) {
      setLoading(false);
      toast.error(err.message);
    }
  };

  const selectedParentObj = categories.find((c) => c._id === category);

  return (
    <div className="w-full max-w-5xl space-y-6 select-none pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>SUB-DEPARTMENT CREATION</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>➕ Add New Sub Category</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Create specific product groups assigned to parent categories.
          </p>
        </div>

        <Link
          to="/sub-category-list"
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
        >
          ← Back to Sub Categories
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
              <span>📑</span>
              <span>Subcategory Settings</span>
            </h2>

            {/* Parent Category Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Select Parent Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none cursor-pointer transition-colors"
              >
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Subcategory Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Oversized Tees, Leather Boots"
                value={subCat}
                onChange={(e) => setSubCat(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
              />
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
                <span>🚀 Publish Subcategory</span>
              )}
            </button>
          </form>
        </div>

        {/* Live Hierarchy Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-4 backdrop-blur-xl">
            <h3 className="text-base font-bold text-white tracking-wide flex items-center gap-2 pb-2 border-b border-gray-800">
              <span>👁️</span>
              <span>Hierarchy Preview</span>
            </h3>
            <p className="text-xs text-gray-400">
              Visual path of how products will be indexed in customer navigation.
            </p>

            <div className="p-5 bg-black/60 border border-gray-800 rounded-2xl space-y-4 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                <span
                  style={{
                    backgroundColor: `${selectedParentObj?.color || "#10b981"}20`,
                    borderColor: `${selectedParentObj?.color || "#10b981"}50`,
                    color: selectedParentObj?.color || "#10b981",
                  }}
                  className="px-3 py-1 rounded-xl border flex items-center gap-1.5 shrink-0 max-w-[180px]"
                  title={selectedParentObj?.name || "Parent Category"}
                >
                  <span>📁</span>
                  <span className="truncate">{selectedParentObj?.name || "Parent Category"}</span>
                </span>
                <span className="text-gray-500 font-black shrink-0">➔</span>
                <span
                  className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl max-w-[220px] sm:max-w-[300px] truncate text-xs font-bold inline-block"
                  title={subCat || "Subcategory Name"}
                >
                  {subCat || "Subcategory Name"}
                </span>
              </div>

              <div className="p-3 bg-gray-900 rounded-xl border border-gray-800 text-xs text-gray-400">
                <span className="text-amber-400 font-bold block mb-0.5">✓ Ready for Storefront Filter</span>
                <p>Customers can filter products by this subcategory in product catalog.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddSubCategory;
