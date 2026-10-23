import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { backendUrl, currency } from "../App";
import { toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";
import { assets } from "../assets/admin_assets/assets";
import {
  getFirestoreProducts,
  getFirestoreCategories,
  deleteFirestoreProduct,
} from "../api/firebaseService";

function List({ token }) {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCount, setSubCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // View Mode: 'table' | 'grid'
  const [viewMode, setViewMode] = useState("table");

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedSubCategory, setSelectedSubCategory] = useState("All");
  const [sortBy, setSortBy] = useState("default");
  const [stockFilter, setStockFilter] = useState("all");

  // Pagination
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // View Modal
  const [viewProduct, setViewProduct] = useState(null);

  const isHexId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str.trim());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rawProducts, rawCategories] = await Promise.all([
        getFirestoreProducts(),
        getFirestoreCategories(),
      ]);

      let productList = Array.isArray(rawProducts) ? [...rawProducts] : [];
      let catList = Array.isArray(rawCategories) ? [...rawCategories] : [];

      try {
        const prodRes = await axios.get(`${backendUrl}/api/product/list`);
        if (prodRes.data?.success && Array.isArray(prodRes.data.products)) {
          prodRes.data.products.forEach((p) => {
            if (!productList.some((ep) => (ep._id || ep.id) === (p._id || p.id))) {
              productList.push(p);
            }
          });
        }
      } catch (e) {}

      try {
        const catRes = await axios.get(`${backendUrl}/api/admin/categories`);
        if (catRes.data?.success && Array.isArray(catRes.data.categories)) {
          catRes.data.categories.forEach((c) => {
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

      setList(productList);
      setCategories(catList);

      const uniqueSubs = new Set();
      catList.forEach((c) => {
        (c.subCategories || c.subcategories || []).forEach((sc) => {
          const sName = typeof sc === "string" ? sc : sc?.name;
          if (sName) uniqueSubs.add(sName);
        });
      });
      productList.forEach((p) => {
        if (p.subCategory) uniqueSubs.add(p.subCategory);
      });
      setSubCount(uniqueSubs.size);
    } catch (err) {
      console.log("List.jsx fetchData error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const removeProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteFirestoreProduct(id);
      try {
        await axios.post(
          `${backendUrl}/api/product/remove`,
          { id },
          { headers: { token } }
        );
      } catch (e) {}
      toast.success("Product deleted successfully");
      fetchData();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Subcategories derived from categories
  const availableSubCategories = useMemo(() => {
    if (selectedCategory === "All") {
      const allSubs = [];
      categories.forEach((c) => {
        const subs = c.subCategories || c.subcategories || [];
        subs.forEach((sc) => {
          const name = typeof sc === "string" ? sc : sc?.name;
          if (name && !allSubs.includes(name)) allSubs.push(name);
        });
      });
      return allSubs;
    }
    const catObj = categories.find(
      (c) => c.name?.toLowerCase() === selectedCategory.toLowerCase()
    );
    if (!catObj) return [];
    const subs = catObj.subCategories || catObj.subcategories || [];
    return subs.map((sc) => (typeof sc === "string" ? sc : sc?.name));
  }, [categories, selectedCategory]);

  // Filtered Products
  const filteredList = useMemo(() => {
    let result = list.filter((p) => {
      const catName =
        p.catName ||
        (typeof p.category === "object" ? p.category?.name : p.category) ||
        "";
      const subCatName = p.subCategory || p.subCat || "";

      const matchesCategory =
        selectedCategory === "All" ||
        catName.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSubCategory =
        selectedSubCategory === "All" ||
        subCatName.toLowerCase() === selectedSubCategory.toLowerCase();

      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        (p.name && p.name.toLowerCase().includes(term)) ||
        (p.brand && p.brand.toLowerCase().includes(term)) ||
        (catName && catName.toLowerCase().includes(term)) ||
        (subCatName && String(subCatName).toLowerCase().includes(term));

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "instock" && Number(p.countInStock || p.stock || 10) > 0) ||
        (stockFilter === "lowstock" && Number(p.countInStock || p.stock || 10) <= 5);

      return matchesCategory && matchesSubCategory && matchesSearch && matchesStock;
    });

    if (sortBy === "priceLow") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "priceHigh") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "rating") {
      result.sort(
        (a, b) =>
          Number(b.rating || b.ratings || 5) - Number(a.rating || a.ratings || 5)
      );
    } else if (sortBy === "name") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return result;
  }, [list, selectedCategory, selectedSubCategory, searchTerm, sortBy, stockFilter]);

  // Paginated Products
  const totalPages = Math.ceil(filteredList.length / rowsPerPage) || 1;
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, currentPage, rowsPerPage]);

  const renderStars = (val) => {
    const r = Math.min(Math.max(Number(val) || 5, 1), 5);
    return "★".repeat(Math.floor(r)) + "☆".repeat(5 - Math.floor(r));
  };

  // Helper to format attributes (RAM, Weight, Size) as arrays
  const parseAttrArray = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [val];
      }
      return [val];
    }
    return [];
  };

  // Export CSV Helper
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      toast.warning("No products to export");
      return;
    }
    const headers =
      "ID,Name,Category,SubCategory,Brand,Price,Rating,RAMS,WEIGHT,SIZE\n";
    const rows = filteredList
      .map((p) => {
        const rams = parseAttrArray(p.productRam).join(" | ");
        const weights = parseAttrArray(p.productWeight).join(" | ");
        const sizes = parseAttrArray(p.sizes || p.size).join(" | ");
        return `"${p._id}","${p.name}","${p.catName || p.category || ""}","${
          p.subCategory || ""
        }","${p.brand || ""}","${p.price}","${p.rating || 5}","${rams}","${weights}","${sizes}"`;
      })
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Geloura_Products_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    toast.success("Products exported to CSV!");
  };

  return (
    <div className="w-full space-y-6 select-none pb-12">
      {/* 1. Header & Top Action Controls */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>CATALOG INVENTORY MANAGER</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            🛍️ Products Master List
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            View, filter, edit and manage all active products in your storefront.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Table / Grid Toggle */}
          <div className="flex items-center bg-gray-800/80 border border-gray-700/80 rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-amber-400 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Table View"
            >
              <span>📋</span>
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-amber-400 text-black shadow-md"
                  : "text-gray-400 hover:text-white"
              }`}
              title="Grid Card View"
            >
              <span>🔲</span>
              <span>Grid</span>
            </button>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-semibold text-gray-200 hover:text-amber-400 flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            title="Download CSV"
          >
            <span>📥</span>
            <span>Export CSV</span>
          </button>

          {/* Upload Product */}
          <Link
            to="/product-upload"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span className="text-sm">➕</span>
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* 2. Top 3 Metric Summary Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Products */}
        <div className="bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-black rounded-2xl p-5 text-white shadow-xl flex justify-between items-center relative overflow-hidden group hover:scale-[1.02] transition-all">
          <div className="space-y-1">
            <p className="text-xs font-bold opacity-90 uppercase tracking-wider">
              Total Catalog Products
            </p>
            <h2 className="text-3xl sm:text-4xl font-black">
              {loading ? "..." : list.length}
            </h2>
            <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-semibold">
              Live in Database
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
            🛍️
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 2: Total Categories */}
        <div
          onClick={() => navigate("/categories")}
          className="bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700 rounded-2xl p-5 text-white shadow-xl flex justify-between items-center relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer"
          title="Click to view Categories"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold opacity-90 uppercase tracking-wider">
              Product Categories
            </p>
            <h2 className="text-3xl sm:text-4xl font-black">
              {loading ? "..." : categories.length}
            </h2>
            <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-semibold">
              Manage Categories ↗
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
            📁
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
        </div>

        {/* Card 3: Sub Categories */}
        <div
          onClick={() => navigate("/sub-category-list")}
          className="bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 rounded-2xl p-5 text-white shadow-xl flex justify-between items-center relative overflow-hidden group hover:scale-[1.02] transition-all cursor-pointer"
          title="Click to view Sub Categories"
        >
          <div className="space-y-1">
            <p className="text-xs font-bold opacity-90 uppercase tracking-wider">
              Sub Categories
            </p>
            <h2 className="text-3xl sm:text-4xl font-black">
              {loading ? "..." : subCount}
            </h2>
            <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-full font-semibold">
              Sub Categories ↗
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
            📑
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
        </div>
      </div>

      {/* 3. Advanced Filter & Search Bar */}
      <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl backdrop-blur-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Category */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubCategory("All");
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="All">All Categories ({list.length})</option>
              {categories.map((c) => (
                <option key={c._id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Sub Category */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Sub Category
            </label>
            <select
              value={selectedSubCategory}
              onChange={(e) => {
                setSelectedSubCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="All">All Sub Categories</option>
              {availableSubCategories.map((sc, i) => (
                <option key={i} value={sc}>
                  {sc}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Stock Filter */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Stock Status
            </label>
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="all">All Inventory</option>
              <option value="instock">In Stock Only</option>
              <option value="lowstock">Low Stock (≤ 5)</option>
            </select>
          </div>

          {/* 4. Sort By */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs font-semibold focus:outline-none cursor-pointer transition-colors"
            >
              <option value="default">Default Order</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="rating">Top Rated (★)</option>
              <option value="name">Product Name (A-Z)</option>
            </select>
          </div>

          {/* 5. Search Box */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Search Products
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search by title, brand..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2.5 bg-gray-800 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
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
        </div>
      </div>

      {/* 4. Products Presentation (Table View OR Grid View) */}
      {viewMode === "table" ? (
        /* TABLE VIEW WITH EXACT 10 COLUMNS */
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="max-h-[620px] overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
            <table className="w-full text-left text-xs text-gray-200">
              {/* Exact 8 Columns Table Header */}
              <thead className="sticky top-0 z-20 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-extrabold tracking-wider uppercase text-[11px] shadow-md">
                <tr>
                  <th className="py-4 px-6 whitespace-nowrap min-w-[260px]">
                    PRODUCT
                  </th>
                  <th className="py-4 px-5 whitespace-nowrap">CATEGORY</th>
                  <th className="py-4 px-5 whitespace-nowrap">SUB CATEGORY</th>
                  <th className="py-4 px-5 whitespace-nowrap">BRAND</th>
                  <th className="py-4 px-5 whitespace-nowrap">PRICE</th>
                  <th className="py-4 px-5 whitespace-nowrap">RATING</th>
                  <th className="py-4 px-5 whitespace-nowrap">PRODUCT SIZE</th>
                  <th className="py-4 px-6 whitespace-nowrap text-center">
                    ACTION
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 bg-black/40">
                {loading && (
                  <tr>
                    <td colSpan="8" className="text-center py-20 text-gray-400">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                        <span className="font-semibold">
                          Loading product catalog...
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && filteredList.length === 0 && (
                  <tr>
                    <td
                      colSpan="8"
                      className="text-center py-20 text-gray-400 space-y-2"
                    >
                      <div className="text-3xl">🔍</div>
                      <p className="text-sm font-bold text-white">
                        No Matching Products Found
                      </p>
                      <p className="text-xs text-gray-500">
                        Try adjusting your filters or search keywords.
                      </p>
                    </td>
                  </tr>
                )}
                {!loading &&
                  paginatedList.map((product) => {
                    const imgSrc =
                      (Array.isArray(product.image) && product.image[0]) ||
                      (Array.isArray(product.images) && product.images[0]) ||
                      (typeof product.image === "string" && product.image) ||
                      assets.upload_area;

                    const categoryName =
                      product.catName ||
                      (typeof product.category === "object"
                        ? product.category?.name
                        : product.category) ||
                      "Fashion";

                    const subCategoryName =
                      product.subCategory || product.subCat || "—";

                    const cleanBrand =
                      product.brand && !isHexId(product.brand)
                        ? product.brand
                        : "EVALS";

                    const ramsList = parseAttrArray(product.productRam);
                    const weightsList = parseAttrArray(product.productWeight);
                    const sizesList = parseAttrArray(
                      product.sizes || product.productSize || product.size
                    );

                    return (
                      <tr
                        key={product._id}
                        className="hover:bg-gray-800/50 transition-colors duration-150 group"
                      >
                        {/* 1. PRODUCT */}
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-xl bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center shrink-0 p-1 shadow-sm group-hover:border-amber-500/40 transition-colors">
                              <img
                                src={imgSrc}
                                alt={product.name}
                                className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform"
                                onError={(e) => {
                                  e.target.src = assets.upload_area;
                                }}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white text-xs line-clamp-1 group-hover:text-amber-400 transition-colors">
                                {product.name}
                              </p>
                              <span className="inline-block text-[10px] text-amber-400 font-semibold mt-0.5">
                                🟢 In Stock
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. CATEGORY */}
                        <td className="py-3.5 px-5 font-semibold text-gray-200 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-amber-950/25 border border-amber-500/30 text-amber-300 rounded-lg text-[11px]">
                            {categoryName}
                          </span>
                        </td>

                        {/* 3. SUB CATEGORY */}
                        <td className="py-3.5 px-5 text-gray-300 whitespace-nowrap font-medium">
                          {subCategoryName}
                        </td>

                        {/* 4. BRAND */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-gray-800/90 border border-gray-700 text-gray-300 font-semibold text-[11px] rounded-lg shadow-sm">
                            {cleanBrand}
                          </span>
                        </td>

                        {/* 5. PRICE */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="space-y-0.5">
                            <span className="text-amber-400 font-extrabold text-xs block">
                              Rs {product.price}
                            </span>
                            {product.oldPrice &&
                              Number(product.oldPrice) > Number(product.price) && (
                                <span className="text-[10px] text-gray-500 line-through">
                                  Rs {product.oldPrice}
                                </span>
                              )}
                          </div>
                        </td>

                        {/* 6. RATING */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className="text-amber-400 tracking-wider text-xs">
                              {renderStars(
                                product.rating || product.ratings || 5
                              )}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              ({product.rating || product.ratings || 5}.0)
                            </span>
                          </div>
                        </td>

                        {/* 7. PRODUCT SIZE */}
                        <td className="py-3.5 px-5 whitespace-nowrap">
                          {sizesList.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[120px]">
                              {sizesList.map((sz, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-gray-800/90 border border-gray-700 text-amber-300 rounded-md text-[10px] font-bold"
                                >
                                  {sz}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-500 text-[11px]">—</span>
                          )}
                        </td>

                        {/* 10. ACTION */}
                        <td className="py-3.5 px-6 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* 👁️ View Button */}
                            <button
                              onClick={() => setViewProduct(product)}
                              className="w-7 h-7 rounded-lg bg-fuchsia-600/80 hover:bg-fuchsia-600 text-white flex items-center justify-center shadow-md transition-all hover:scale-105 cursor-pointer"
                              title="Quick View Details"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                />
                              </svg>
                            </button>

                            {/* ✏️ Edit Button */}
                            <button
                              onClick={() =>
                                navigate(`/product-upload?editId=${product._id}`)
                              }
                              className="w-7 h-7 rounded-lg bg-amber-400 hover:bg-amber-400 text-black font-bold flex items-center justify-center shadow-md transition-all hover:scale-105 cursor-pointer"
                              title="Edit Product"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>

                            {/* 🗑️ Delete Button */}
                            <button
                              onClick={() => removeProduct(product._id)}
                              className="w-7 h-7 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white flex items-center justify-center shadow-md transition-all hover:scale-105 cursor-pointer"
                              title="Delete Product"
                            >
                              <svg
                                className="w-3.5 h-3.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-900/90 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400 font-medium">
            <span className="text-gray-400">
              Showing{" "}
              <strong className="text-white">
                {filteredList.length === 0
                  ? 0
                  : (currentPage - 1) * rowsPerPage + 1}
              </strong>{" "}
              to{" "}
              <strong className="text-white">
                {Math.min(currentPage * rowsPerPage, filteredList.length)}
              </strong>{" "}
              of <strong className="text-white">{filteredList.length}</strong>{" "}
              products
            </span>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Per page:</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={
                    currentPage === totalPages || filteredList.length === 0
                  }
                  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-30 cursor-pointer text-white font-bold"
                >
                  Next ❯
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GRID CARDS VIEW */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {paginatedList.map((product) => {
              const imgSrc =
                (Array.isArray(product.image) && product.image[0]) ||
                (Array.isArray(product.images) && product.images[0]) ||
                (typeof product.image === "string" && product.image) ||
                assets.upload_area;

              return (
                <div
                  key={product._id}
                  className="bg-[#090d16]/90 border border-gray-800 hover:border-amber-500/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between group"
                >
                  <div className="relative aspect-square w-full bg-gray-900 overflow-hidden flex items-center justify-center p-3">
                    <img
                      src={imgSrc}
                      alt={product.name}
                      className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-2.5 py-1 bg-black/70 backdrop-blur-md border border-gray-700 text-amber-400 font-bold text-[10px] rounded-lg">
                        {product.catName || product.category || "Fashion"}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-extrabold text-white text-sm line-clamp-1 group-hover:text-amber-400 transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-gray-400 text-xs line-clamp-2 mt-1">
                        {product.description || "High quality luxury piece."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-amber-400 font-black text-base">
                          Rs {product.price}
                        </span>
                        {product.oldPrice && (
                          <span className="text-gray-500 text-xs line-through ml-2">
                            Rs {product.oldPrice}
                          </span>
                        )}
                      </div>
                      <span className="text-amber-400 text-xs">
                        ★ {product.rating || 5}.0
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={() => setViewProduct(product)}
                        className="py-2 bg-fuchsia-600/20 hover:bg-fuchsia-600 text-fuchsia-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() =>
                          navigate(`/product-upload?editId=${product._id}`)
                        }
                        className="py-2 bg-amber-400 hover:bg-amber-400 text-black rounded-xl text-xs font-extrabold transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeProduct(product._id)}
                        className="py-2 bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Pagination */}
          <div className="flex justify-center items-center gap-3 pt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-xl text-xs font-bold text-white cursor-pointer"
            >
              ❮ Previous Page
            </button>
            <span className="text-xs font-bold text-amber-400 px-3 py-1 bg-amber-950/25 border border-amber-500/30 rounded-lg">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={
                currentPage === totalPages || filteredList.length === 0
              }
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 rounded-xl text-xs font-bold text-white cursor-pointer"
            >
              Next Page ❯
            </button>
          </div>
        </div>
      )}

      {/* 5. Quick View Product Modal */}
      {viewProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0c121e] border border-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-lg">👁️</span>
                <h3 className="text-base font-bold text-white">
                  Product Overview
                </h3>
              </div>
              <button
                onClick={() => setViewProduct(null)}
                className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-full sm:w-36 h-36 rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center shrink-0 p-1">
                  <img
                    src={
                      (Array.isArray(viewProduct.image) &&
                        viewProduct.image[0]) ||
                      (Array.isArray(viewProduct.images) &&
                        viewProduct.images[0]) ||
                      (typeof viewProduct.image === "string" &&
                        viewProduct.image) ||
                      assets.upload_area
                    }
                    alt={viewProduct.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <span className="px-2 py-0.5 rounded bg-amber-950/25 border border-amber-500/30 text-amber-400 font-bold text-[10px] uppercase">
                    {viewProduct.catName ||
                      viewProduct.category ||
                      "Fashion"}
                  </span>
                  <h4 className="font-black text-white text-base leading-snug">
                    {viewProduct.name}
                  </h4>
                  <p className="text-gray-400 text-xs">
                    Brand:{" "}
                    <strong className="text-gray-200">
                      {viewProduct.brand || "EVALS"}
                    </strong>
                  </p>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-amber-400 font-extrabold text-lg">
                      Rs {viewProduct.price}
                    </span>
                    {viewProduct.oldPrice && (
                      <span className="text-gray-500 text-xs line-through">
                        Rs {viewProduct.oldPrice}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="p-3.5 bg-gray-900/70 border border-gray-800 rounded-2xl">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Description
                </p>
                <p className="text-gray-200 leading-relaxed">
                  {viewProduct.description ||
                    "No description provided for this catalog product."}
                </p>
              </div>

              {/* Meta Grid (SIZES, SUB CATEGORY) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-[10px] text-gray-400 block">
                    Sub Category
                  </span>
                  <strong className="text-amber-400 text-xs">
                    {viewProduct.subCategory || viewProduct.subCat || "—"}
                  </strong>
                </div>
                <div className="p-2.5 bg-gray-900 border border-gray-800 rounded-xl">
                  <span className="text-[10px] text-gray-400 block">
                    Available Sizes
                  </span>
                  <strong className="text-amber-300 text-xs">
                    {parseAttrArray(
                      viewProduct.sizes ||
                        viewProduct.productSize ||
                        viewProduct.size
                    ).join(", ") || "—"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                onClick={() => setViewProduct(null)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const id = viewProduct._id;
                  setViewProduct(null);
                  navigate(`/product-upload?editId=${id}`);
                }}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-amber-500/25 cursor-pointer transition-all"
              >
                Edit Product ✏️
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default List;
