import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { backendUrl } from "../App";
import { toast } from "react-toastify";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { assets } from "../assets/admin_assets/assets";
import {
  addFirestoreProduct,
  updateFirestoreProduct,
  getFirestoreProducts,
  getFirestoreCategories,
  getFirestoreProductSizes,
} from "../api/firebaseService";

function Add({ token }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("editId");
  const fileInputRef = useRef(null);

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [subCategory, setSubcategory] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [isFeatured, setIsFeatured] = useState("None");
  const [stock, setStock] = useState("15");
  const [brand, setBrand] = useState("");
  const [discount, setDiscount] = useState("");
  const [rating, setRating] = useState(5);
  const [location, setLocation] = useState("All Locations");

  // Multi-select attributes
  const [selectedRams, setSelectedRams] = useState([]);
  const [selectedWeights, setSelectedWeights] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);

  // Database options
  const [categoriesTree, setCategoriesTree] = useState([]);
  const [subCategoriesList, setSubCategoriesList] = useState([]);
  const [availableRams, setAvailableRams] = useState([]);
  const [availableWeights, setAvailableWeights] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);

  // Image Upload Files & Previews
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingProduct, setFetchingProduct] = useState(false);

  const locationsList = [
    "All Locations",
    "India",
    "United States",
    "United Kingdom",
    "Canada",
    "Australia",
    "United Arab Emirates",
    "Germany",
    "France",
    "Singapore",
    "Japan",
  ];

  // Fetch all options & edit product details if editId exists
  useEffect(() => {
    const fetchOptionsAndProduct = async () => {
      try {
        const [cats, sizes] = await Promise.all([
          getFirestoreCategories(),
          getFirestoreProductSizes(),
        ]);

        const loadedCats = Array.isArray(cats) ? cats : [];
        setCategoriesTree(loadedCats);
        if (loadedCats.length > 0 && !editId) {
          setCategory(loadedCats[0].name);
          const subs = loadedCats[0].subCategories || loadedCats[0].subcategories || [];
          setSubCategoriesList(subs);
          if (subs.length > 0) setSubcategory(typeof subs[0] === "string" ? subs[0] : subs[0].name);
        }

        if (Array.isArray(sizes)) {
          const sizesFromDb = sizes.map((s) => s.size).filter(Boolean);
          const defaultSizes = ["S", "M", "L", "XL", "XXL", "30", "32", "34", "36", "One Size"];
          setAvailableSizes(Array.from(new Set([...sizesFromDb, ...defaultSizes])));
        }

        // If Editing an existing product, populate the form
        if (editId) {
          setFetchingProduct(true);
          let found = null;
          try {
            const firestoreProds = await getFirestoreProducts();
            if (Array.isArray(firestoreProds)) {
              found = firestoreProds.find((p) => String(p._id) === String(editId));
            }
          } catch (e) {
            console.warn("Firestore product fetch error:", e);
          }

          if (!found) {
            try {
              const prodRes = await axios.get(`${backendUrl}/api/product/list`);
              if (prodRes.data.success) {
                found = (prodRes.data.products || []).find((p) => String(p._id) === String(editId));
              }
            } catch (e) {}
          }

          if (found) {
            setName(found.name || "");
            setDescription(found.description || "");
            setBrand(found.brand || "");
            setPrice(found.price || "");
            setOldPrice(found.oldPrice || "");
            setDiscount(found.discount || "");
            setRating(Number(found.rating || found.ratings || 5));
            setStock(String(found.countInStock || found.stock || "15"));
            setIsFeatured(found.bestseller || found.isFeatured ? "Yes" : "No");
            setLocation(found.location || "All Locations");

            const cat = found.catName || (typeof found.category === "object" ? found.category?.name : found.category) || "Fashion";
            setCategory(cat);

            const matchingCatObj = loadedCats.find((c) => c.name === cat);
            if (matchingCatObj) {
              const subs = matchingCatObj.subCategories || matchingCatObj.subcategories || [];
              setSubCategoriesList(subs);
            }
            setSubcategory(found.subCategory || found.subCat || "");

            if (Array.isArray(found.sizes)) setSelectedSizes(found.sizes);
            if (Array.isArray(found.productRam)) setSelectedRams(found.productRam);
            if (Array.isArray(found.productWeight)) setSelectedWeights(found.productWeight);

            const imgs =
              (Array.isArray(found.image) && found.image) ||
              (Array.isArray(found.images) && found.images) ||
              (typeof found.image === "string" && found.image ? [found.image] : []);
            setExistingImages(imgs);
            setImagePreviews(imgs);
          }
        }
      } catch (err) {
        console.log("Error loading options:", err);
      } finally {
        setFetchingProduct(false);
      }
    };
    fetchOptionsAndProduct();
  }, [editId]);

  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    const catObj = categoriesTree.find((c) => c.name === newCat);
    if (catObj) {
      const subs = catObj.subCategories || catObj.subcategories || [];
      setSubCategoriesList(subs);
      if (subs.length > 0) {
        setSubcategory(typeof subs[0] === "string" ? subs[0] : subs[0].name);
      } else {
        setSubcategory("");
      }
    } else {
      setSubCategoriesList([]);
      setSubcategory("");
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };
  const handleFilesSelected = handleImageChange;

  const removeImageAt = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleAttribute = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product title is required");
      return;
    }
    if (!price) {
      toast.error("Price is required");
      return;
    }

    try {
      setLoading(true);

      // Upload newly chosen files to Cloudinary
      let finalImages = [...existingImages];
      if (uploadedFiles.length > 0) {
        toast.info("Uploading images to Cloudinary...");
        for (const file of uploadedFiles) {
          const imgFormData = new FormData();
          imgFormData.append("file", file);
          try {
            const uploadRes = await axios.post(`${backendUrl}/api/admin/upload`, imgFormData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            if (uploadRes.data.success && uploadRes.data.url) {
              finalImages.push(uploadRes.data.url);
            }
          } catch (uploadErr) {
            console.warn("Image upload error:", uploadErr);
          }
        }
      }

      if (finalImages.length === 0 && imagePreviews.length > 0) {
        finalImages = imagePreviews.filter((url) => !url.startsWith("blob:"));
      }

      // 1. Write or Update product in Firebase Firestore & Backend
      const productPayload = {
        name: name.trim(),
        description: description.trim(),
        category: category.trim() || "General",
        subCategory: subCategory.trim() || "",
        price: Number(price) || 0,
        oldPrice: oldPrice !== undefined && oldPrice !== "" ? Number(oldPrice) : null,
        brand: brand.trim() || "",
        discount: discount !== undefined && discount !== "" ? Number(discount) : 0,
        rating: Number(rating) || 5.0,
        bestseller: isFeatured === "Yes",
        stock: Number(stock) || 15,
        sizes: selectedSizes,
        productRam: selectedRams,
        productWeight: selectedWeights,
        image: finalImages,
        images: finalImages,
        date: Date.now(),
      };

      if (editId) {
        await updateFirestoreProduct(editId, productPayload);
        try {
          await axios.post(
            `${backendUrl}/api/product/add`,
            { ...productPayload, id: editId, _id: editId, skipBroadcast: true, isEdit: true },
            { headers: { token } }
          );
        } catch (_) {}
      } else {
        const res = await addFirestoreProduct(productPayload);
        try {
          await axios.post(
            `${backendUrl}/api/product/add`,
            { ...productPayload, _id: res.product?._id, id: res.product?._id, skipBroadcast: true, isEdit: false },
            { headers: { token } }
          );
        } catch (_) {}
      }

      setLoading(false);
      toast.success(
        editId
          ? "✨ Product updated successfully!"
          : "✨ Product added successfully!"
      );
      navigate("/product-list");
    } catch (err) {
      setLoading(false);
      console.error("handleSubmit error:", err);
      toast.error(err.message || "Failed to save product");
    }
  };

  return (
    <div className="w-full space-y-6 select-none pb-12">
      {/* 1. Header & Navigation Breadcrumbs */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>{editId ? "PRODUCT EDITOR" : "NEW PRODUCT CREATOR"}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {editId ? "✏️ Edit Product Details" : "➕ Upload New Product"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Fill in catalog details, upload gallery images, and configure pricing & attributes.
          </p>
        </div>

        <Link
          to="/product-list"
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-colors"
        >
          ← Back to Catalog
        </Link>
      </div>

      {fetchingProduct && (
        <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center gap-3 text-sm text-gray-300">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading existing product details for editing...</span>
        </div>
      )}

      {/* 2. Main 2-Column Responsive Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (7 Cols): Basic Info & Specifications */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Essential Information */}
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white tracking-wide pb-2 border-b border-gray-800 flex items-center gap-2">
              <span>📝</span>
              <span>General Information</span>
            </h2>

            {/* PRODUCT NAME */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Product Title *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Vintage Oversized Denim Jacket"
                className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
              />
            </div>

            {/* DESCRIPTION */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Detailed Description *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe material, fit, features, craftsmanship..."
                className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors resize-none"
              />
            </div>

            {/* Brand & Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* BRAND */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g. Geloura, EVALS"
                  className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* CATEGORY */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Category *
                </label>
                {categoriesTree.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none cursor-pointer transition-colors"
                    >
                      <option value="">Select Existing Category</option>
                      {categoriesTree.map((c) => (
                        <option key={c._id || c.id || c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Or type custom category name..."
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-800 focus:border-amber-400 rounded-xl text-white text-xs"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. Festive Wear, Sarees"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
                  />
                )}
              </div>

              {/* SUB CATEGORY */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Sub Category
                </label>
                {subCategoriesList.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={subCategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none cursor-pointer transition-colors"
                    >
                      <option value="">Select Subcategory</option>
                      {subCategoriesList.map((s, i) => {
                        const nameVal = typeof s === "string" ? s : s.name;
                        return (
                          <option key={i} value={nameVal}>
                            {nameVal}
                          </option>
                        );
                      })}
                    </select>
                    <input
                      type="text"
                      placeholder="Or type custom subcategory..."
                      value={subCategory}
                      onChange={(e) => setSubcategory(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-900 border border-gray-800 focus:border-amber-400 rounded-xl text-white text-xs"
                    />
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder="e.g. Silk, Cotton, Designer"
                    value={subCategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
                  />
                )}
              </div>
            </div>

            {/* LOCATION */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Origin / Shipping Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none cursor-pointer transition-colors"
              >
                {locationsList.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Card 2: Selectable Variants (RAM, Weights, Sizes) */}
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white tracking-wide pb-2 border-b border-gray-800 flex items-center gap-2">
              <span>⚙️</span>
              <span>Product Specifications & Variant Tags</span>
            </h2>

            {/* SIZES */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Available Sizes ({selectedSizes.length} Selected)
                </label>
                <Link
                  to="/product-sizes"
                  className="text-xs text-amber-400 hover:underline font-semibold"
                >
                  + Add New Size Tag ↗
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSizes.map((sz) => {
                  const isSel = selectedSizes.includes(sz);
                  return (
                    <button
                      type="button"
                      key={sz}
                      onClick={() => toggleAttribute(selectedSizes, setSelectedSizes, sz)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSel
                          ? "bg-amber-400 text-black shadow-md shadow-amber-500/25 scale-105"
                          : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-amber-500/40"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (5 Cols): Media Upload, Pricing & Live Storefront Preview */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 3: Media Upload */}
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
            <div className="flex justify-between items-center pb-2 border-b border-gray-800">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>🖼️</span>
                <span>Product Gallery</span>
              </h2>
              {imagePreviews.length > 0 && (
                <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-full">
                  {imagePreviews.length} Image{imagePreviews.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Drag & Drop Upload Zone */}
            <label
              htmlFor="multiImageInput"
              className="border-2 border-dashed border-gray-700 hover:border-amber-400 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-gray-800/40 hover:bg-gray-800/70 transition-all group text-center"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                ➕
              </div>
              <span className="text-xs font-bold text-white group-hover:text-amber-400">
                Click to Browse Images
              </span>
              <span className="text-[10px] text-gray-400 mt-0.5">
                PNG, JPG, WEBP supported (Up to 4 images)
              </span>
              <input
                ref={fileInputRef}
                id="multiImageInput"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageChange}
                hidden
              />
            </label>

            {/* Previews Grid */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 pt-2">
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-xl overflow-hidden border border-gray-800 bg-gray-900 group shadow-md"
                  >
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-1.5 left-1.5 px-1.5 py-0.2 bg-black/75 text-[9px] font-bold text-white rounded">
                      #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeImageAt(index)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 4: Pricing & Inventory */}
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-xl">
            <h2 className="text-base font-bold text-white tracking-wide pb-2 border-b border-gray-800 flex items-center gap-2">
              <span>💳</span>
              <span>Pricing & Stock</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              {/* SALE PRICE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Sale Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 999"
                  className="w-full px-4 py-2.5 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* REGULAR PRICE */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Regular Price (₹)
                </label>
                <input
                  type="number"
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder="e.g. 1499"
                  className="w-full px-4 py-2.5 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* STOCK QUANTITY */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Stock Units
                </label>
                <input
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  placeholder="15"
                  className="w-full px-4 py-2.5 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none transition-colors"
                />
              </div>

              {/* FEATURED / BESTSELLER */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Featured Item
                </label>
                <select
                  value={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-800/90 border border-gray-700 hover:border-gray-600 focus:border-amber-400 rounded-xl text-white text-sm focus:outline-none cursor-pointer transition-colors"
                >
                  <option value="None">None</option>
                  <option value="Yes">Yes (Bestseller)</option>
                  <option value="No">No</option>
                </select>
              </div>
            </div>

            {/* RATINGS */}
            <div className="space-y-1.5 pt-2 border-t border-gray-800/80">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                Product Rating ({rating} Stars)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`text-2xl transition-transform hover:scale-125 cursor-pointer ${
                      star <= rating ? "text-amber-400" : "text-gray-600"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Card 5: Live Storefront Card Preview */}
          <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl space-y-3 backdrop-blur-xl">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              👁️ Real-Time Customer Store Preview
            </span>
            <div className="bg-black/60 border border-gray-800 rounded-2xl p-4 flex gap-4 items-center">
              <div className="w-16 h-16 rounded-xl bg-gray-900 border border-gray-800 overflow-hidden flex items-center justify-center shrink-0">
                <img
                  src={imagePreviews[0] || assets.upload_area}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <span className="px-2 py-0.2 rounded bg-amber-950/25 text-amber-400 text-[10px] font-bold">
                  {category || "Category"}
                </span>
                <h4 className="font-bold text-white text-xs truncate">
                  {name || "Untitled Product"}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-amber-400 font-black text-sm">
                    Rs {price || "0"}
                  </span>
                  {oldPrice && Number(oldPrice) > Number(price) && (
                    <span className="text-gray-500 text-xs line-through">
                      Rs {oldPrice}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                <span>Publishing to Firebase...</span>
              </div>
            ) : (
              <span>{editId ? "💾 Save Changes" : "🚀 Publish Product to Store"}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Add;
