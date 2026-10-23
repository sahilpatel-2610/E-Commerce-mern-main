import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link } from "react-router-dom";
import {
  getFirestoreCategories,
  getFirestoreSubCategories,
  deleteFirestoreSubCategory,
} from "../api/firebaseService";

function SubCategoryList({ token }) {
  const [categories, setCategories] = useState([]);
  const [directSubs, setDirectSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedParent, setSelectedParent] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCategories = async () => {
    try {
      setLoading(true);
      let catList = [];
      let subList = [];

      try {
        const [firestoreCats, firestoreSubs] = await Promise.all([
          getFirestoreCategories(),
          getFirestoreSubCategories(),
        ]);
        if (Array.isArray(firestoreCats) && firestoreCats.length > 0) {
          catList = [...firestoreCats];
        }
        if (Array.isArray(firestoreSubs) && firestoreSubs.length > 0) {
          subList = [...firestoreSubs];
        }
      } catch (e) {}

      try {
        const { data } = await axios.get(`${backendUrl}/api/admin/categories`);
        if (data && data.success && Array.isArray(data.categories)) {
          data.categories.forEach((c) => {
            if (
              !catList.some(
                (ex) =>
                  (ex._id || ex.id) === (c._id || c.id) ||
                  ex.name?.toLowerCase().trim() === c.name?.toLowerCase().trim()
              )
            ) {
              catList.push(c);
            }
          });
        }
      } catch (e) {}

      setCategories(catList);
      setDirectSubs(subList);
    } catch (err) {
      console.log("Error loading categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDeleteSub = async (subId, subName, parentId) => {
    if (!window.confirm(`Are you sure you want to delete subcategory "${subName}"?`)) return;
    try {
      await deleteFirestoreSubCategory(subId, subName, parentId);
      try {
        await axios.post(
          `${backendUrl}/api/admin/subcategory/delete`,
          { id: subId, name: subName, parentId },
          { headers: { token } }
        );
      } catch (e) {}
      toast.success(`Subcategory "${subName}" deleted from Firebase!`);
      await fetchCategories();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Flatten all subcategories into a structured list with parent info
  const allSubCategories = useMemo(() => {
    const list = [];
    const seen = new Set();

    // 1. Direct subcategory documents
    directSubs.forEach((s) => {
      const sName = s.name?.trim();
      if (!sName) return;
      const parent = categories.find(
        (c) =>
          (c._id || c.id) === s.parentId ||
          c.name?.toLowerCase().trim() === String(s.parentId || "").toLowerCase().trim()
      );
      const parentName = parent ? parent.name : (s.parentName || "General");
      const parentId = parent ? (parent._id || parent.id) : (s.parentId || "");
      const parentColor = parent?.color || "#10b981";
      const key = `${parentName.toLowerCase()}_${sName.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({
          id: s._id || s.id || `sub_${key}`,
          name: sName,
          parentName,
          parentId,
          parentColor,
        });
      }
    });

    // 2. Parent categories nested subCategories
    categories.forEach((parent) => {
      const subs = parent.subCategories || parent.subcategories || [];
      subs.forEach((sub, i) => {
        const subName = typeof sub === "object" ? sub.name?.trim() : String(sub).trim();
        if (!subName) return;
        const subId = typeof sub === "object" ? (sub._id || sub.id) : `${parent._id || parent.id}_${i}`;
        const key = `${parent.name.toLowerCase()}_${subName.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          list.push({
            id: subId,
            name: subName,
            parentName: parent.name,
            parentId: parent._id || parent.id,
            parentColor: parent.color || "#10b981",
          });
        }
      });
    });

    return list;
  }, [categories, directSubs]);

  // Filtered subcategories
  const filteredSubs = useMemo(() => {
    return allSubCategories.filter((sub) => {
      const matchesParent =
        selectedParent === "All" ||
        sub.parentName.toLowerCase() === selectedParent.toLowerCase();

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        sub.name.toLowerCase().includes(term) ||
        sub.parentName.toLowerCase().includes(term);

      return matchesParent && matchesSearch;
    });
  }, [allSubCategories, selectedParent, searchTerm]);

  return (
    <div className="w-full space-y-6 select-none pb-12">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>SUB DEPARTMENT INDEX</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>📑 Sub Category List</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            View and manage child categories nested under main departments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/category-list"
            className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-200 hover:text-white transition-colors"
          >
            ← Main Categories
          </Link>
          <Link
            to="/add-sub-category"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>➕</span>
            <span>Add Sub Category</span>
          </Link>
        </div>
      </div>

      {/* 2. Filter & Search Controls */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Parent Category Filter */}
          <div className="w-full sm:w-60">
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="All">All Parent Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search subcategory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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

        <span className="text-xs text-gray-400 font-bold self-center">
          Total {filteredSubs.length} Sub Categories Found
        </span>
      </div>

      {/* 3. Subcategories Data Table */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-200">
            <thead className="bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider uppercase text-[11px] shadow-md">
              <tr>
                <th className="py-4 px-6">SUB CATEGORY</th>
                <th className="py-4 px-6">PARENT CATEGORY</th>
                <th className="py-4 px-6 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/80 bg-black/40">
              {loading && (
                <tr>
                  <td colSpan="3" className="text-center py-20 text-gray-400">
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-semibold">Loading subcategories...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredSubs.length === 0 && (
                <tr>
                  <td colSpan="3" className="text-center py-16 text-gray-400">
                    No subcategories found matching your criteria.
                  </td>
                </tr>
              )}
              {!loading &&
                filteredSubs.map((sub, i) => (
                  <tr
                    key={sub.id || i}
                    className="hover:bg-gray-800/50 transition-colors duration-150 group"
                  >
                    <td
                      className="py-4 px-6 font-extrabold text-white text-sm group-hover:text-amber-400 transition-colors max-w-xs truncate"
                      title={sub.name}
                    >
                      {sub.name}
                    </td>

                    <td className="py-4 px-6">
                      <span
                        style={{
                          backgroundColor: `${sub.parentColor}20`,
                          borderColor: `${sub.parentColor}40`,
                          color: sub.parentColor,
                        }}
                        className="px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5"
                      >
                        <span
                          style={{ backgroundColor: sub.parentColor }}
                          className="w-2 h-2 rounded-full shadow-sm"
                        ></span>
                        <span>{sub.parentName}</span>
                      </span>
                    </td>

                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleDeleteSub(sub.id, sub.name, sub.parentId)}
                        className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/40 rounded-xl text-xs font-bold transition-all cursor-pointer"
                        title="Delete Subcategory"
                      >
                        Delete 🗑️
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default SubCategoryList;
