import React, { useEffect, useRef } from "react";
import { useShopContext } from "../context/ShopContext";
import {
  HiMagnifyingGlass,
  HiXMark,
  HiOutlineSparkles,
  HiArrowRight,
} from "react-icons/hi2";
import { useNavigate } from "react-router-dom";

function SearchBar() {
  const { showSearch, setShowSearch, search, setSearch, products, currency } =
    useShopContext();
  const navigate = useNavigate();
  const inputRef = useRef(null);

  // Auto focus input when search opens & handle Escape key
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      const handleKeyDown = (e) => {
        if (e.key === "Escape") {
          setShowSearch(false);
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [showSearch, setShowSearch]);

  if (!showSearch) return null;

  // Filter products live
  const searchTrimmed = search.trim().toLowerCase();
  const filteredProducts = searchTrimmed
    ? (products || []).filter((p) => {
        const title = (p.name || "").toLowerCase();
        const category = (p.category || "").toLowerCase();
        const subCategory = (p.subCategory || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        return (
          title.includes(searchTrimmed) ||
          category.includes(searchTrimmed) ||
          subCategory.includes(searchTrimmed) ||
          desc.includes(searchTrimmed)
        );
      })
    : [];

  const handleProductClick = (productId) => {
    setShowSearch(false);
    navigate(`/product/${productId}`);
  };

  const handleViewAllInCollection = () => {
    setShowSearch(false);
    navigate("/collection");
  };

  const quickTags = [
    "Gurkha Pant",
    "Korean Fit",
    "Festive Kurta",
    "Formal Shirt",
    "Cotton Pant",
    "Suit",
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex flex-col items-center pt-16 sm:pt-24 px-4 select-none animate-in fade-in duration-200"
      onClick={() => setShowSearch(false)}
    >
      {/* Search Container */}
      <div
        className="w-full max-w-2xl bg-zinc-950/95 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-2xl backdrop-blur-2xl flex flex-col gap-5 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest">
            <HiOutlineSparkles className="text-base text-amber-400" />
            <span>Search Luxury Collection</span>
          </div>
          <button
            type="button"
            onClick={() => setShowSearch(false)}
            className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-gray-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors text-sm"
            title="Close Search (Esc)"
          >
            <HiXMark />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="relative flex items-center">
          <HiMagnifyingGlass className="absolute left-4 text-gray-400 text-lg pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleViewAllInCollection();
              }
            }}
            placeholder="Search shirts, gurkha pants, kurtas, suits..."
            className="w-full pl-11 pr-10 py-3.5 bg-zinc-900/90 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-2xl text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3.5 w-6 h-6 rounded-full bg-zinc-800 text-gray-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Quick Suggestion Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">
            Trending:
          </span>
          {quickTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSearch(tag)}
              className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-900 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/40 transition-all cursor-pointer"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Dynamic Search Results */}
        <div className="max-h-[50vh] overflow-y-auto no-scrollbar space-y-2.5 pt-1">
          {searchTrimmed ? (
            filteredProducts.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-xs text-gray-400 px-1">
                  <span>Found {filteredProducts.length} matching products</span>
                  <button
                    type="button"
                    onClick={handleViewAllInCollection}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all in Collection</span>
                    <HiArrowRight className="text-xs" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {filteredProducts.slice(0, 8).map((product) => {
                    const imgUrl = Array.isArray(product.image)
                      ? product.image[0]
                      : product.image;
                    const discount =
                      product.oldPrice && product.oldPrice > product.price
                        ? Math.round(
                            ((product.oldPrice - product.price) /
                              product.oldPrice) *
                              100
                          )
                        : null;

                    return (
                      <div
                        key={product._id || product.id}
                        onClick={() =>
                          handleProductClick(product._id || product.id)
                        }
                        className="flex items-center gap-3 p-2.5 bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 rounded-2xl cursor-pointer transition-all duration-200 group shadow-md"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-zinc-800">
                          <img
                            src={imgUrl}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors truncate">
                            {product.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 block truncate">
                            {product.category} • {product.subCategory}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-black text-amber-400">
                              {currency}
                              {product.price}
                            </span>
                            {product.oldPrice && (
                              <span className="text-[10px] text-gray-500 line-through">
                                {currency}
                                {product.oldPrice}
                              </span>
                            )}
                            {discount && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                {discount}% OFF
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <p className="text-sm font-bold text-white">
                  No matching garments found for "{search}"
                </p>
                <p className="text-xs text-gray-500">
                  Try searching for "Gurkha", "Shirt", "Pant", or "Kurta"
                </p>
              </div>
            )
          ) : (
            <div className="py-6 text-center text-gray-500 text-xs">
              Type keywords above to search all menswear styles instantly
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SearchBar;
