import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useShopContext } from "../context/ShopContext";
import Title from "./Title";
import ProductItems from "./ProductItems";

function LatestCollection() {
  const { products } = useShopContext();
  const [latestProducts, setLatestProducts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "50px" });

  // Responsive: 2 rows × columns
  useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth < 640) setItemsPerPage(4);       // 2 cols × 2 rows
      else if (window.innerWidth < 768) setItemsPerPage(6);  // 3 cols × 2 rows
      else if (window.innerWidth < 1024) setItemsPerPage(8); // 4 cols × 2 rows
      else setItemsPerPage(10);                               // 5 cols × 2 rows
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (Array.isArray(products) && products.length > 0) {
      setLatestProducts(products);
    } else {
      setLatestProducts([]);
    }
  }, [products]);

  const totalPages = Math.ceil(latestProducts.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentItems = latestProducts.slice(startIdx, startIdx + itemsPerPage);

  // Reset to page 1 if products change
  useEffect(() => {
    setCurrentPage(1);
  }, [latestProducts.length]);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <motion.div
      ref={ref}
      className="my-10 relative"
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="text-center py-8 text-3xl">
        <Title text1={"LATEST"} text2={"COLLECTION"} />
        <p className="w-3/4 m-auto text-xs sm:text-sm md:text-lg text-gray-400">
          Discover our latest fashion collection featuring premium fabrics, trending styles, and elegant designs for every occasion.
        </p>
      </div>

      {/* 2-Row Grid */}
      {latestProducts.length > 0 ? (
        <>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6"
            >
              {currentItems.map((item, index) => (
                <motion.div
                  key={item._id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: Math.min(index * 0.04, 0.4),
                    ease: "easeOut",
                  }}
                >
                  <ProductItems
                    id={item._id}
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
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 select-none">
              {/* Prev */}
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
              </button>

              {/* Page Numbers */}
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => goToPage(page)}
                  className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    currentPage === page
                      ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-md shadow-amber-500/25 scale-105"
                      : "bg-zinc-900 border border-zinc-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/50"
                  }`}
                >
                  {page}
                </button>
              ))}

              {/* Next */}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p className="text-sm">Loading Fashion Catalog from Firebase...</p>
        </div>
      )}
    </motion.div>
  );
}

export default LatestCollection;
