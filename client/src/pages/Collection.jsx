import React, { useEffect, useMemo, useState } from "react";
import { useShopContext } from "../context/ShopContext";
import { FaAngleRight, FaChevronDown, FaChevronRight } from "react-icons/fa6";
import Title from "../components/Title";
import ProductItems from "../components/ProductItems";
import api from "../api/api";
import {
  getFirestoreCategories,
  getFirestoreSubCategories,
} from "../api/firebaseService";

function Collection() {
  const { products, search, showSearch } = useShopContext();
  const [showFilter, setShowFilter] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [filterProducts, setFilterProducts] = useState([]);
  const [selected, setSelected] = useState("Relevant");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [expandedCats, setExpandedCats] = useState(new Set());

  const options = [
    "Relevant",
    "Price: Low to High",
    "Price: High to Low",
    "Highest Rated",
  ];

  // 1. Fetch live Category Tree directly from Firebase Firestore & API
  useEffect(() => {
    const fetchCategoryTree = async () => {
      try {
        // 1. Primary: Direct from Firebase Firestore
        const [cats, subs] = await Promise.all([
          getFirestoreCategories(),
          getFirestoreSubCategories(),
        ]);

        if (Array.isArray(cats) && cats.length > 0) {
          const builtTree = cats.map((cat) => {
            const catId = cat._id || cat.id;
            const catName = cat.name || "General";
            const explicitSubs = (cat.subCategories || cat.subcategories || []).map(
              (s) => ({
                _id: typeof s === "string" ? s : s._id || s.name,
                name: typeof s === "string" ? s : s.name,
              })
            );
            const matchedSubs = (subs || [])
              .filter(
                (s) =>
                  s.parentId === catId ||
                  (s.parentId &&
                    String(s.parentId).toLowerCase() === catName.toLowerCase())
              )
              .map((s) => ({ _id: s._id || s.id || s.name, name: s.name }));

            const combinedSubs = [...explicitSubs];
            matchedSubs.forEach((ms) => {
              if (!combinedSubs.some((cs) => cs.name?.toLowerCase() === ms.name?.toLowerCase())) {
                combinedSubs.push(ms);
              }
            });

            return {
              _id: catId,
              name: catName,
              color: cat.color || "#10b981",
              subcategories: combinedSubs,
            };
          });

          setCategoryTree(builtTree);
          setExpandedCats(new Set(builtTree.map((c) => c.name)));
          return;
        }

        // 2. Direct API Sync
        const { data } = await api.get("/api/product/category-tree");
        if (
          data &&
          data.success &&
          Array.isArray(data.categories) &&
          data.categories.length > 0
        ) {
          setCategoryTree(data.categories);
          setExpandedCats(new Set(data.categories.map((c) => c.name)));
        }
      } catch (err) {
        console.log("Category tree fetch notice:", err.message);
      }
    };

    fetchCategoryTree();

    const handleFocus = () => {
      fetchCategoryTree();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [products]);

  // Dynamic Category Tree (merges Firestore categories with distinct categories from live products)
  const activeCategoryTree = useMemo(() => {
    const treeMap = new Map();

    // Add categories from Firestore tree
    categoryTree.forEach((c) => {
      const cName = c.name?.trim();
      if (cName) {
        const subSet = new Set((c.subcategories || []).map((s) => s.name?.trim()).filter(Boolean));
        treeMap.set(cName, { _id: c._id || cName, name: cName, color: c.color, subSet });
      }
    });

    // Extract dynamic categories and subcategories from active live products
    products.forEach((p) => {
      const cat =
        p.catName ||
        (typeof p.category === "object" ? p.category?.name : p.category) ||
        "";
      const catName = typeof cat === "string" ? cat.trim() : "";
      if (catName) {
        if (!treeMap.has(catName)) {
          treeMap.set(catName, { _id: catName, name: catName, color: "#f59e0b", subSet: new Set() });
        }
        const sub =
          p.subCategory ||
          p.subCat ||
          (typeof p.subCat === "object" ? p.subCat?.name : null);
        if (sub && typeof sub === "string" && sub.trim()) {
          treeMap.get(catName).subSet.add(sub.trim());
        }
      }
    });

    if (treeMap.size === 0) {
      return [];
    }

    return Array.from(treeMap.values()).map((c) => ({
      _id: c._id,
      name: c.name,
      color: c.color,
      subcategories: Array.from(c.subSet).map((s) => ({ _id: s, name: s })),
    }));
  }, [categoryTree, products]);

  // 2. Compute exact dynamic counts from live Firebase products
  const categoryCounts = useMemo(() => {
    const counts = {};
    const norm = (s) => (typeof s === "string" ? s.trim().toLowerCase() : "");
    products.forEach((p) => {
      const cat =
        p.catName ||
        (typeof p.category === "object" ? p.category?.name : p.category);
      if (cat && typeof cat === "string") {
        const cKey = norm(cat);
        counts[cKey] = (counts[cKey] || 0) + 1;
      }
      const sub = p.subCategory || p.subCat;
      if (sub && typeof sub === "string") {
        const sKey = norm(sub);
        counts[sKey] = (counts[sKey] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // 3. Extract exact live Brands from Firebase products
  const dynamicBrands = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (p.brand && typeof p.brand === "string" && p.brand.trim()) {
        const cleaned = p.brand.trim();
        map.set(cleaned, (map.get(cleaned) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [products]);

  const toggleExpand = (catName, e) => {
    if (e) e.stopPropagation();
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) {
        next.delete(catName);
      } else {
        next.add(catName);
      }
      return next;
    });
  };

  const toggleCategory = (catName) => {
    setSelectedCategories((prev) =>
      prev.includes(catName)
        ? prev.filter((c) => c !== catName)
        : [...prev, catName]
    );
  };

  const toggleSubCategory = (subName) => {
    setSelectedSubcategories((prev) =>
      prev.includes(subName)
        ? prev.filter((s) => s !== subName)
        : [...prev, subName]
    );
  };

  const toggleBrand = (brandName) => {
    setSelectedBrands((prev) =>
      prev.includes(brandName)
        ? prev.filter((b) => b !== brandName)
        : [...prev, brandName]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    setSelectedBrands([]);
  };

  // Filter and Sort logic
  const applyFilter = () => {
    let productsCopy = products.slice();

    // 1. Search Query Filter
    if (showSearch && search) {
      productsCopy = productsCopy.filter((item) =>
        (item.name || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    // 2. Multi-Category Filter
    if (selectedCategories.length > 0) {
      productsCopy = productsCopy.filter((item) => {
        const itemCat = (
          item.catName ||
          (typeof item.category === "object"
            ? item.category?.name
            : item.category) ||
          ""
        ).toLowerCase().trim();
        return selectedCategories.some(
          (sc) => sc.toLowerCase().trim() === itemCat
        );
      });
    }

    // 3. Multi-Subcategory Filter
    if (selectedSubcategories.length > 0) {
      productsCopy = productsCopy.filter((item) => {
        const itemSub = (
          item.subCategory ||
          item.subCat ||
          (typeof item.subCat === "object" ? item.subCat?.name : null) ||
          ""
        ).toLowerCase();
        return selectedSubcategories.some(
          (ss) => ss.toLowerCase() === itemSub || item.name.toLowerCase().includes(ss.toLowerCase())
        );
      });
    }

    // 4. Multi-Brand Filter
    if (selectedBrands.length > 0) {
      productsCopy = productsCopy.filter((item) =>
        selectedBrands.some(
          (sb) => (item.brand || "").toLowerCase() === sb.toLowerCase()
        )
      );
    }

    setFilterProducts(productsCopy);
  };

  const sortProduct = () => {
    let fpCopy = filterProducts.slice();

    switch (selected) {
      case "Price: Low to High":
        setFilterProducts(fpCopy.sort((a, b) => (a.price || 0) - (b.price || 0)));
        break;
      case "Price: High to Low":
        setFilterProducts(fpCopy.sort((a, b) => (b.price || 0) - (a.price || 0)));
        break;
      case "Highest Rated":
        setFilterProducts(
          fpCopy.sort((a, b) => (b.rating || 0) - (a.rating || 0))
        );
        break;
      default:
        applyFilter();
        break;
    }
  };

  useEffect(() => {
    applyFilter();
  }, [
    selectedCategories,
    selectedSubcategories,
    selectedBrands,
    search,
    showSearch,
    products,
  ]);

  useEffect(() => {
    sortProduct();
  }, [selected]);

  return (
    <div className="flex flex-col sm:flex-row gap-1 sm:gap-10 pt-10 border-t border-zinc-800 select-none">
      {/* Filter Options Left Sidebar */}
      <div className="min-w-60">
        <div className="flex items-center justify-between">
          <p
            onClick={() => setShowFilter(!showFilter)}
            className="text-lg font-semibold flex items-center gap-2 cursor-pointer text-white"
          >
            FILTERS
            <FaAngleRight
              className={`sm:hidden transition-transform duration-200 ${
                showFilter ? "rotate-90" : ""
              }`}
            />
          </p>
          {(selectedCategories.length > 0 ||
            selectedSubcategories.length > 0 ||
            selectedBrands.length > 0) && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-amber-400 hover:underline cursor-pointer"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Dynamic Category Tree Accordion directly from Firebase */}
        <div
          className={`border border-zinc-800 rounded-2xl p-4 my-4 bg-zinc-950/80 shadow-xl ${
            showFilter ? "block" : "hidden"
          } sm:block`}
        >
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">
            CATEGORIES
          </p>
          <div className="flex flex-col gap-2 text-sm text-gray-300">
            {activeCategoryTree.length === 0 ? (
              <p className="text-xs text-zinc-500 py-1.5 italic">
                No categories added yet
              </p>
            ) : (
              activeCategoryTree.map((cat) => {
                const isExpanded = expandedCats.has(cat.name);
                const subs = cat.subcategories || cat.subCategories || [];
                const hasSub = subs.length > 0;
                const count = categoryCounts[cat.name.trim().toLowerCase()] || 0;

                return (
                  <div key={cat._id || cat.name} className="flex flex-col">
                    {/* Category Header Row */}
                    <div className="flex items-center justify-between py-1.5 px-2 rounded-xl hover:bg-zinc-900 transition-colors group cursor-pointer">
                      <label className="flex items-center gap-2.5 cursor-pointer flex-1 select-none">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
                          checked={selectedCategories.includes(cat.name)}
                          onChange={() => toggleCategory(cat.name)}
                        />
                        <span
                          className={`text-sm ${
                            selectedCategories.includes(cat.name)
                              ? "text-amber-400 font-semibold"
                              : "text-gray-300 group-hover:text-white"
                          }`}
                        >
                          {cat.name}
                        </span>
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-800">
                          {count}
                        </span>
                        {hasSub && (
                          <button
                            type="button"
                            onClick={(e) => toggleExpand(cat.name, e)}
                            className="text-gray-400 hover:text-white p-1"
                          >
                            {isExpanded ? (
                              <FaChevronDown className="w-3 h-3 text-amber-400" />
                            ) : (
                              <FaChevronRight className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Subcategories directly from Firebase */}
                    {hasSub && isExpanded && (
                      <div className="ml-5 pl-2 border-l border-zinc-800 flex flex-col gap-1 mt-1">
                        {subs.map((sub) => {
                          const subName =
                            typeof sub === "object" ? sub.name : sub;
                          const subId =
                            typeof sub === "object" ? sub._id : subName;
                          const subCount =
                            categoryCounts[subName.trim().toLowerCase()] || 0;
                          const isChecked =
                            selectedSubcategories.includes(subName);

                          return (
                            <label
                              key={subId}
                              className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-zinc-900 text-xs cursor-pointer select-none group"
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
                                  checked={isChecked}
                                  onChange={() => toggleSubCategory(subName)}
                                />
                                <span
                                  className={`${
                                    isChecked
                                      ? "text-amber-300 font-semibold"
                                      : "text-gray-400 group-hover:text-gray-200"
                                  }`}
                                >
                                  {subName}
                                </span>
                              </div>
                              {subCount > 0 && (
                                <span className="text-[10px] text-gray-500">
                                  {subCount}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Dynamic Brands Filter from Firebase Products */}
        {dynamicBrands.length > 0 && (
          <div
            className={`border border-zinc-800 rounded-2xl p-4 my-4 bg-zinc-950/80 shadow-xl ${
              showFilter ? "block" : "hidden"
            } sm:block`}
          >
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-amber-400">
              BRANDS
            </p>
            <div className="flex flex-col gap-1.5 text-xs text-gray-400 max-h-48 overflow-y-auto pr-1">
              {dynamicBrands.map(({ name, count }) => {
                const isChecked = selectedBrands.includes(name);
                return (
                  <label
                    key={name}
                    className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-zinc-900 cursor-pointer select-none group"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
                        checked={isChecked}
                        onChange={() => toggleBrand(name)}
                      />
                      <span
                        className={`${
                          isChecked
                            ? "text-amber-300 font-semibold"
                            : "text-gray-400 group-hover:text-gray-200"
                        }`}
                      >
                        {name}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right Side Product Grid */}
      <div className="flex-1">
        <div className="flex justify-between items-center text-base sm:text-2xl mb-4">
          <Title text1={"ALL"} text2={"COLLECTIONS"} />

          {/* Product Sort Dropdown */}
          <div className="relative text-sm">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-zinc-900 text-gray-300 hover:text-white border border-zinc-700 hover:border-amber-400/40 px-3 py-2 rounded-xl flex items-center justify-between w-48 shadow-sm"
            >
              <span className="text-xs truncate">{selected}</span>
              <FaChevronDown
                className={`ml-2 text-xs transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-amber-400" : ""
                }`}
              />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-1 w-48 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-20 overflow-hidden">
                {options.map((option) => (
                  <div
                    key={option}
                    onClick={() => {
                      setSelected(option);
                      setIsOpen(false);
                    }}
                    className={`px-4 py-2.5 text-xs cursor-pointer transition-colors ${
                      selected === option
                        ? "bg-amber-500/15 text-amber-300 font-bold"
                        : "text-gray-300 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    {option}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Map Products */}
        {filterProducts.length === 0 ? (
          <div className="text-center py-20 px-4 bg-zinc-950/40 border border-zinc-900 rounded-3xl space-y-2">
            <span className="text-3xl block">📦</span>
            <p className="text-gray-300 text-sm font-semibold">
              {products.length === 0
                ? "No products added yet"
                : "No products found matching your filters"}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {products.length === 0
                ? "Add your first product from the Admin Panel to display it live here."
                : "Try selecting different categories or clearing search filters."}
            </p>
            {(selectedCategories.length > 0 ||
              selectedSubcategories.length > 0 ||
              selectedBrands.length > 0 ||
              search) && (
              <button
                onClick={clearAllFilters}
                className="mt-3 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-amber-400 text-xs font-bold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 gap-y-6">
            {filterProducts.map((item) => (
              <ProductItems
                key={item._id || item.id}
                id={item._id || item.id}
                image={item.image}
                images={item.images}
                name={item.name}
                price={item.price}
                oldPrice={item.oldPrice}
                discount={item.discount}
                brand={item.brand}
                category={item.category || item.catName}
                rating={item.rating}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Collection;
