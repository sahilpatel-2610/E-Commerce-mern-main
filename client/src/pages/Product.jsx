import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import {
  HiMagnifyingGlassPlus,
  HiMagnifyingGlassMinus,
  HiXMark,
} from "react-icons/hi2";
import { useShopContext } from "../context/ShopContext";
import { assets } from "../assets/frontend_assets/assets";
import RelatedProducts from "../components/RelatedProducts";
import { toast } from "react-toastify";
import {
  getFirestoreReviews,
  addFirestoreReview,
  getFirestoreProduct,
} from "../api/firebaseService";

function Product() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { products, currency, addToCart, token } = useShopContext();
  const [productData, setProductData] = useState(() => {
    if (products && products.length > 0) {
      return (
        products.find(
          (item) => item._id === productId || item.id === productId
        ) || false
      );
    }
    try {
      const cached = sessionStorage.getItem("cached_products");
      if (cached) {
        const list = JSON.parse(cached);
        return (
          list.find(
            (item) => item._id === productId || item.id === productId
          ) || false
        );
      }
    } catch (e) {}
    return false;
  });

  const [image, setImage] = useState("");
  const [size, setSize] = useState("");
  const [ram, setRam] = useState("");
  const [weight, setWeight] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");

  // Full-Screen Image Zoom Lightbox State
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1.5);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  // Reviews State - 100% dynamic from Firebase Firestore
  const [allReviews, setAllReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);

  // Current logged in user info
  const currentUser = useMemo(() => {
    try {
      const u = localStorage.getItem("user");
      if (u) return JSON.parse(u);
    } catch (e) {}
    return null;
  }, [token]);

  const applyProductData = (item) => {
    if (!item) return;
    setProductData(item);
    const imgList = Array.isArray(item.image)
      ? item.image
      : [item.image || assets.p_img1];
    setImage(imgList[0] || assets.p_img1);

    if (item.sizes && item.sizes.length > 0) {
      setSize(item.sizes[0]);
    }
    if (item.ram && item.ram.length > 0) {
      setRam(item.ram[0]);
    }
    if (item.weight && item.weight.length > 0) {
      setWeight(item.weight[0]);
    }
    if (item.colors && item.colors.length > 0) {
      setColor(item.colors[0]);
    }
  };

  const fetchProductReviews = async () => {
    try {
      setReviewsLoading(true);
      const revs = await getFirestoreReviews();
      if (Array.isArray(revs)) {
        setAllReviews(revs);
      }
    } catch (err) {
      console.log("Error loading reviews:", err);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchProductData = async () => {
    // 1. Check in context products
    if (products && products.length > 0) {
      const found = products.find(
        (item) => item._id === productId || item.id === productId
      );
      if (found) {
        applyProductData(found);
        return;
      }
    }

    // 2. Check session cache
    try {
      const cached = sessionStorage.getItem("cached_products");
      if (cached) {
        const list = JSON.parse(cached);
        const found = list.find(
          (item) => item._id === productId || item.id === productId
        );
        if (found) {
          applyProductData(found);
          return;
        }
      }
    } catch (e) {}

    // 3. Direct Firestore single product lookup (ultra fast 0-latency direct fetch)
    try {
      const doc = await getFirestoreProduct(productId);
      if (doc) {
        applyProductData(doc);
        return;
      }
    } catch (err) {
      console.log("Direct Firestore product fetch error:", err);
    }
  };

  useEffect(() => {
    fetchProductData();
    fetchProductReviews();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId, products]);

  if (!productData) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-amber-400 gap-4 max-w-7xl mx-auto px-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-300">Loading product details from Firebase...</p>
      </div>
    );
  }

  // Parse image array safely
  const imageList = Array.isArray(productData.image)
    ? productData.image
    : [productData.image];

  // Helper arrays for variants
  const sizeList = Array.isArray(productData.sizes) ? productData.sizes : [];
  const ramList = Array.isArray(productData.ram) ? productData.ram : [];
  const weightList = Array.isArray(productData.weight) ? productData.weight : [];
  const colorList = Array.isArray(productData.colors) ? productData.colors : [];

  // Category name handler (if populated object or string)
  const categoryName =
    typeof productData.category === "object" && productData.category !== null
      ? productData.category.name
      : productData.category || "Fashion";

  // Calculate discount percentage if old price exists
  const discountPercent =
    productData.oldPrice && productData.oldPrice > productData.price
      ? Math.round(
          ((productData.oldPrice - productData.price) / productData.oldPrice) *
            100
        )
      : null;

  const thumbnailContainerRef = useRef(null);
  const mainImageRef = useRef(null);

  // Live Ultra-Fast GPU Mouse Hover Zoom on Main Image (Amazon / Myntra style)
  const handleMainMouseMove = (e) => {
    if (!mainImageRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    mainImageRef.current.style.transformOrigin = `${x}% ${y}%`;
    mainImageRef.current.style.transform = "scale(2.5)";
  };

  const handleMainMouseEnter = (e) => {
    if (!mainImageRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    mainImageRef.current.style.transformOrigin = `${x}% ${y}%`;
    mainImageRef.current.style.transform = "scale(2.5)";
  };

  const handleMainMouseLeave = () => {
    if (!mainImageRef.current) return;
    mainImageRef.current.style.transform = "scale(1)";
    mainImageRef.current.style.transformOrigin = "center center";
  };

  // Mouse Drag / Grab to Scroll for Thumbnails
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleThumbMouseDown = (e) => {
    setIsMouseDown(true);
    if (thumbnailContainerRef.current) {
      setStartX(e.pageX - thumbnailContainerRef.current.offsetLeft);
      setScrollLeftState(thumbnailContainerRef.current.scrollLeft);
    }
  };

  const handleThumbMouseUpOrLeave = () => {
    setIsMouseDown(false);
  };

  const handleThumbMouseMove = (e) => {
    if (!isMouseDown || !thumbnailContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - thumbnailContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    thumbnailContainerRef.current.scrollLeft = scrollLeftState - walk;
  };

  const modalImgRef = useRef(null);

  const handleModalMouseMove = (e) => {
    if (!modalImgRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    modalImgRef.current.style.transformOrigin = `${x}% ${y}%`;
  };

  // Keyboard shortcut listener for modal
  useEffect(() => {
    if (!isZoomOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsZoomOpen(false);
      } else if (e.key === "ArrowLeft") {
        handlePrevImage();
      } else if (e.key === "ArrowRight") {
        handleNextImage();
      } else if (e.key === "+" || e.key === "=") {
        setZoomScale((s) => Math.min(4, +(s + 0.5).toFixed(1)));
      } else if (e.key === "-") {
        setZoomScale((s) => Math.max(1, +(s - 0.5).toFixed(1)));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isZoomOpen, imageList, image]);

  const handlePrevImage = () => {
    if (!imageList || !imageList.length) return;
    const currentImg = image || imageList[0];
    const currentIndex = imageList.indexOf(currentImg);
    const prevIndex = currentIndex <= 0 ? imageList.length - 1 : currentIndex - 1;
    setImage(imageList[prevIndex]);
  };

  const handleNextImage = () => {
    if (!imageList || !imageList.length) return;
    const currentImg = image || imageList[0];
    const currentIndex = imageList.indexOf(currentImg);
    const nextIndex = (currentIndex + 1) % imageList.length;
    setImage(imageList[nextIndex]);
  };

  const scrollThumbnails = (direction) => {
    if (thumbnailContainerRef.current) {
      const scrollAmount = direction === "left" ? -180 : 180;
      thumbnailContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const handleAddToCart = () => {
    addToCart(productData._id, size);
  };

  // Product Reviews filtered from Firebase
  const productReviews = useMemo(() => {
    return allReviews.filter(
      (r) =>
        r.productId === productId ||
        (r.productName &&
          productData?.name &&
          r.productName.toLowerCase().trim() ===
            productData.name.toLowerCase().trim())
    );
  }, [allReviews, productId, productData]);

  const avgRating = useMemo(() => {
    if (productReviews.length === 0)
      return (Number(productData?.rating) || 5.0).toFixed(1);
    const sum = productReviews.reduce(
      (acc, r) => acc + Number(r.rating || r.customerRating || 5),
      0
    );
    return (sum / productReviews.length).toFixed(1);
  }, [productReviews, productData]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error("Please Sign In first to write a review!");
      navigate("/login");
      return;
    }

    if (!newComment.trim()) {
      toast.error("Please write your review feedback!");
      return;
    }

    try {
      setSubmittingReview(true);
      const userObj = currentUser || {};
      const authorName =
        userObj.name ||
        (userObj.email ? userObj.email.split("@")[0] : "Verified Customer");
      const authorEmail = userObj.email || "";
      const authorId = userObj.id || userObj._id || "";

      const reviewPayload = {
        productId: productData._id || productId,
        productName: productData.name || "Product",
        customerName: authorName,
        customerEmail: authorEmail,
        userId: authorId,
        rating: Number(newRating),
        comment: newComment.trim(),
        platform: "Web Storefront",
        date: Date.now(),
        createdAt: new Date().toISOString(),
      };

      const res = await addFirestoreReview(reviewPayload);
      if (res.success) {
        toast.success("✨ Your review has been saved to Firebase!");
        setNewComment("");
        setNewRating(5);
        setShowReviewForm(false);
        fetchProductReviews();
      } else {
        toast.error(res.message || "Failed to submit review");
      }
    } catch (err) {
      toast.error(err.message || "Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="pt-8 transition-opacity ease-in duration-500 opacity-100 max-w-7xl mx-auto px-4 sm:px-6 select-none">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-6 flex-wrap">
        <Link to="/" className="hover:text-amber-400 transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link to="/collection" className="hover:text-amber-400 transition-colors">
          Catalog
        </Link>
        <span>/</span>
        <span className="text-gray-200 font-medium truncate max-w-[200px] sm:max-w-none">
          {productData.name}
        </span>
      </div>

      {/* Main Product Section: Gallery + Details */}
      <div className="flex gap-8 sm:gap-12 flex-col lg:flex-row items-start">
        {/* Gallery Column (Compact Main Image on TOP, Smooth Thumbnails Strip on BOTTOM) */}
        <div className="w-full lg:w-[460px] flex flex-col gap-3 shrink-0">
          {/* 1. Main Feature Image Container (Live Ultra-Smooth GPU Hover Zoom) */}
          <div
            onMouseEnter={handleMainMouseEnter}
            onMouseLeave={handleMainMouseLeave}
            onMouseMove={handleMainMouseMove}
            className="w-full h-[360px] sm:h-[400px] rounded-3xl overflow-hidden border border-zinc-800 bg-zinc-900 shadow-2xl relative group flex items-center justify-center cursor-crosshair select-none"
          >
            <img
              ref={mainImageRef}
              key={image || imageList[0]}
              src={image || imageList[0]}
              alt={productData.name}
              className="w-full h-full object-cover rounded-3xl pointer-events-none transition-transform duration-100 ease-out will-change-transform"
              style={{ transform: "scale(1)", transformOrigin: "center center" }}
            />

            {/* Bestseller Badge */}
            {productData.bestseller && (
              <span className="absolute top-4 left-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-xl z-10 flex items-center gap-1.5 pointer-events-none">
                <span>★</span>
                <span>BESTSELLER</span>
              </span>
            )}

            {/* Interactive Zoom Icon Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsZoomOpen(true);
                setZoomScale(1.5);
              }}
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/85 hover:bg-amber-400 text-white hover:text-black border border-zinc-700/90 hover:border-amber-400 flex items-center justify-center transition-all duration-200 shadow-2xl cursor-pointer hover:scale-110 z-10 group/zoom"
              title="Click for Fullscreen Inspection"
              aria-label="Zoom Image"
            >
              <HiMagnifyingGlassPlus className="text-lg transition-transform group-hover/zoom:scale-120" />
            </button>
          </div>

          {/* 2. Thumbnails Carousel BELOW Main Image (Mouse Drag & Wheel Scroll, NO Scrollbar) */}
          {imageList.length > 1 && (
            <div
              ref={thumbnailContainerRef}
              onMouseDown={handleThumbMouseDown}
              onMouseUp={handleThumbMouseUpOrLeave}
              onMouseLeave={handleThumbMouseUpOrLeave}
              onMouseMove={handleThumbMouseMove}
              className="w-full flex items-center overflow-x-auto gap-2.5 py-1 px-0.5 scroll-smooth no-scrollbar cursor-grab active:cursor-grabbing select-none"
            >
              {imageList.map((item, index) => {
                const isCurrent = (image || imageList[0]) === item;
                return (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setImage(item)}
                    className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all p-0.5 bg-zinc-900 flex-shrink-0 w-18 h-18 sm:w-20 sm:h-20 aspect-square relative shadow-md ${
                      isCurrent
                        ? "border-amber-400 ring-2 ring-amber-400/50 shadow-lg shadow-amber-500/30 scale-105"
                        : "border-zinc-800 hover:border-zinc-600 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={item}
                      alt={`${productData.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded-xl pointer-events-none select-none"
                      draggable="false"
                    />
                    {isCurrent && (
                      <div className="absolute inset-0 bg-amber-400/10 pointer-events-none rounded-xl"></div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full-Screen Ultra-HD Lightbox Zoom Modal */}
        <AnimatePresence>
          {isZoomOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col justify-between p-4 sm:p-6 select-none"
              onClick={() => setIsZoomOpen(false)}
            >
              {/* Top Bar: Title, Zoom Scale Presets & Close Button */}
              <div
                className="flex items-center justify-between z-20 gap-3 bg-zinc-900/80 border border-zinc-800 p-3 sm:px-5 sm:py-3 rounded-2xl backdrop-blur-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-lg shadow-amber-400/50"></span>
                  <div>
                    <h3 className="text-white font-bold text-sm sm:text-base line-clamp-1">
                      {productData.name}
                    </h3>
                    <span className="text-xs text-amber-400 font-mono flex items-center gap-2">
                      <span>🔍 Zoom: {Math.round(zoomScale * 100)}%</span>
                      <span className="hidden sm:inline text-zinc-500">• Scroll Wheel / Move Mouse to Inspect</span>
                    </span>
                  </div>
                </div>

                {/* Preset Scale Buttons & Close */}
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-1">
                    <button
                      type="button"
                      onClick={() => setZoomScale(1)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        zoomScale === 1
                          ? "bg-amber-400 text-black shadow-md"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      1x Fit
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(2)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        zoomScale === 2
                          ? "bg-amber-400 text-black shadow-md"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      2x HD
                    </button>
                    <button
                      type="button"
                      onClick={() => setZoomScale(3.5)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        zoomScale === 3.5
                          ? "bg-amber-400 text-black shadow-md"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      3.5x Ultra
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.max(1, +(s - 0.5).toFixed(1)))}
                    className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-amber-400 border border-zinc-700 hover:border-amber-400 text-gray-200 hover:text-black rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Zoom Out (-)"
                  >
                    <HiMagnifyingGlassMinus className="text-base" />
                    <span className="hidden md:inline">Zoom Out</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZoomScale((s) => Math.min(4, +(s + 0.5).toFixed(1)))}
                    className="p-2 sm:px-3 sm:py-2 bg-zinc-800 hover:bg-amber-400 border border-zinc-700 hover:border-amber-400 text-gray-200 hover:text-black rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                    title="Zoom In (+)"
                  >
                    <HiMagnifyingGlassPlus className="text-base" />
                    <span className="hidden md:inline">Zoom In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(false)}
                    className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-800 hover:bg-rose-500 border border-zinc-700 hover:border-rose-500 text-gray-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-lg ml-1"
                    title="Close (Esc)"
                  >
                    <HiXMark className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Center: Ultra-Crisp GPU Zoomable Image Canvas */}
              <div
                className="flex-1 flex items-center justify-center overflow-hidden relative cursor-crosshair my-2"
                onClick={(e) => e.stopPropagation()}
                onMouseMove={handleModalMouseMove}
                onWheel={(e) => {
                  e.stopPropagation();
                  if (e.deltaY < 0) {
                    setZoomScale((s) => Math.min(4, +(s + 0.3).toFixed(1)));
                  } else {
                    setZoomScale((s) => Math.max(1, +(s - 0.3).toFixed(1)));
                  }
                }}
                onDoubleClick={() => setZoomScale((s) => (s > 1.5 ? 1 : 2.5))}
              >
                <img
                  ref={modalImgRef}
                  key={image || imageList[0]}
                  src={image || imageList[0]}
                  alt={productData.name}
                  style={{
                    transform: `scale(${zoomScale})`,
                    transformOrigin: "center center",
                  }}
                  className="max-h-[72vh] max-w-[88vw] object-contain rounded-2xl transition-transform duration-100 ease-out will-change-transform shadow-2xl pointer-events-none select-none"
                />
              </div>

              {/* Bottom: Floating Photo Strip inside Zoom Modal */}
              {imageList.length > 1 && (
                <div
                  className="flex items-center justify-center gap-3 overflow-x-auto py-2 z-20 no-scrollbar"
                  onClick={(e) => e.stopPropagation()}
                >
                  {imageList.map((item, idx) => {
                    const isCurrent = (image || imageList[0]) === item;
                    return (
                      <div
                        key={idx}
                        onClick={() => setImage(item)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden border-2 cursor-pointer transition-all p-0.5 bg-zinc-900 shrink-0 ${
                          isCurrent
                            ? "border-amber-400 ring-2 ring-amber-400/50 scale-110 shadow-lg shadow-amber-500/40"
                            : "border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600"
                        }`}
                      >
                        <img
                          src={item}
                          alt="thumb"
                          className="w-full h-full object-cover rounded-lg pointer-events-none select-none"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Product Details Column */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            {/* Brand / Category Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs uppercase px-2.5 py-1 bg-amber-500/10 text-amber-400 font-bold rounded-lg border border-amber-500/30">
                {categoryName}
              </span>
              {productData.subCategory && (
                <span className="text-xs uppercase px-2.5 py-1 bg-zinc-800/80 text-gray-300 rounded-lg border border-zinc-700">
                  {productData.subCategory}
                </span>
              )}
              {productData.brand && (
                <span className="text-xs px-2.5 py-1 bg-zinc-800/80 text-gray-300 rounded-lg border border-zinc-700">
                  Brand: {productData.brand}
                </span>
              )}
            </div>

            {/* Product Title */}
            <h1 className="font-extrabold text-2xl sm:text-3xl text-white mt-1 leading-snug tracking-tight">
              {productData.name}
            </h1>

            {/* Ratings and Reviews summary */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span
                    key={i}
                    className={`text-sm ${
                      i < Math.round(Number(avgRating))
                        ? "text-amber-400"
                        : "text-zinc-700"
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-amber-400 font-bold text-sm">
                {avgRating}
              </span>
              <span className="text-gray-400 text-sm">
                ({productReviews.length} {productReviews.length === 1 ? "review" : "reviews"})
              </span>
            </div>

            {/* Price Section */}
            <div className="flex items-baseline gap-4 mt-6">
              <p className="text-3xl sm:text-4xl font-black text-white">
                {currency}
                {productData.price}
              </p>
              {productData.oldPrice && productData.oldPrice > productData.price && (
                <p className="text-lg sm:text-xl text-gray-500 line-through">
                  {currency}
                  {productData.oldPrice}
                </p>
              )}
              {discountPercent && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold px-2.5 py-1 rounded-md">
                  {discountPercent}% OFF
                </span>
              )}
            </div>

            {/* Short Description */}
            <p className="mt-5 text-gray-300 text-sm sm:text-base leading-relaxed line-clamp-3">
              {productData.description}
            </p>

            {/* Size Selector */}
            {sizeList.length > 0 && (
              <div className="my-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-200">Select Size</span>
                  <span className="text-xs text-gray-400">Selected: <strong className="text-amber-400">{size || "None"}</strong></span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {sizeList.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setSize(item)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        item === size
                          ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400"
                          : "bg-zinc-900 hover:bg-zinc-800 text-gray-200 border border-zinc-700"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color Selector */}
            {colorList.length > 0 && (
              <div className="my-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-200">Color</span>
                  <span className="text-xs text-gray-400">Selected: <strong className="text-amber-400">{color || "None"}</strong></span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {colorList.map((item, index) => (
                    <button
                      key={index}
                      onClick={() => setColor(item)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                        item === color
                          ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400"
                          : "bg-zinc-900 hover:bg-zinc-800 text-gray-200 border border-zinc-700"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector & Add to Cart */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 my-6">
              {/* Quantity Counter */}
              <div className="flex items-center border border-zinc-700 rounded-xl bg-zinc-900 px-3 py-1.5 w-fit">
                <span className="text-xs text-gray-400 mr-3">Qty:</span>
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-zinc-800 rounded-lg cursor-pointer font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center text-sm font-bold text-white">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-7 h-7 flex items-center justify-center text-gray-300 hover:bg-zinc-800 rounded-lg cursor-pointer font-bold"
                >
                  +
                </button>
              </div>

              {/* Add to Cart Button in Luxury Amber Gold */}
              <button
                onClick={handleAddToCart}
                className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold px-8 py-3.5 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200 cursor-pointer text-sm sm:text-base active:scale-95"
              >
                🛒 ADD TO CART
              </button>
            </div>
          </div>

          {/* Perks & Trust Badges */}
          <div className="border-t border-zinc-800 pt-5 mt-4 text-xs sm:text-sm text-gray-400 space-y-2">
            <p className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">✓</span> 100% Authentic & Quality Guaranteed
            </p>
            <p className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">✓</span> Cash on Delivery (COD) & Wholesale Orders
            </p>
            <p className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">✓</span> Easy 7-Day Hassle-Free Returns & Exchanges
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-20 border-t border-zinc-800 pt-10">
        <div className="flex border-b border-zinc-800 gap-4 sm:gap-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab("description")}
            className={`pb-3 text-sm sm:text-base font-bold cursor-pointer transition-colors border-b-2 ${
              activeTab === "description"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Description & Specifications
          </button>
          <button
            onClick={() => setActiveTab("reviews")}
            className={`pb-3 text-sm sm:text-base font-bold cursor-pointer transition-colors border-b-2 ${
              activeTab === "reviews"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Customer Reviews ({productReviews.length})
          </button>
          <button
            onClick={() => setActiveTab("shipping")}
            className={`pb-3 text-sm sm:text-base font-bold cursor-pointer transition-colors border-b-2 ${
              activeTab === "shipping"
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Shipping & Return Policy
          </button>
        </div>

        {/* Tab Content */}
        <div className="py-6 text-sm text-gray-300 leading-relaxed">
          {activeTab === "description" && (
            <div className="space-y-4">
              <p>{productData.long_desc || productData.description}</p>
              
              <h4 className="text-base font-bold text-white mt-8 mb-4">⚙️ Product Specifications</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800">
                {productData.brand && (
                  <div>
                    <span className="text-gray-500 block text-xs uppercase">Brand</span>
                    <span className="text-white font-medium">{productData.brand}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Category</span>
                  <span className="text-white font-medium">{categoryName}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Sub Category</span>
                  <span className="text-white font-medium">{productData.subCategory || "General"}</span>
                </div>
                {sizeList.length > 0 && (
                  <div>
                    <span className="text-gray-500 block text-xs uppercase">Available Sizes</span>
                    <span className="text-white font-medium">{sizeList.join(", ")}</span>
                  </div>
                )}
                {colorList.length > 0 && (
                  <div>
                    <span className="text-gray-500 block text-xs uppercase">Colors</span>
                    <span className="text-white font-medium">{colorList.join(", ")}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 block text-xs uppercase">Stock Status</span>
                  <span className="text-amber-400 font-bold">
                    {productData.countInStock ? `${productData.countInStock} Units in Stock` : "In Stock"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reviews" && (
            <div className="space-y-6">
              {/* Review Header Banner */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    ⭐ Customer Feedback
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Based on {productReviews.length} real reviews in Firebase
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-3xl font-black text-amber-400">{avgRating}</span>
                    <span className="text-xs text-gray-500 block">out of 5.0</span>
                  </div>

                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  >
                    {showReviewForm ? "✕ Cancel Review" : "✍️ Write a Review"}
                  </button>
                </div>
              </div>

              {/* Review Submission Form */}
              {showReviewForm && (
                <div className="bg-zinc-900/80 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                  {token ? (
                    <form onSubmit={handleReviewSubmit} className="space-y-5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-zinc-800 pb-4">
                        <div>
                          <h4 className="text-base font-extrabold text-white">
                            Write Your Product Review
                          </h4>
                          <p className="text-xs text-gray-400">
                            Posting as: <strong className="text-amber-400">{currentUser?.name || currentUser?.email || "Signed In User"}</strong>
                          </p>
                        </div>

                        {/* Interactive Star Rating */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400 mr-2">Your Rating:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              onClick={() => setNewRating(star)}
                              className="text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                            >
                              <span
                                className={`${
                                  star <= (hoverRating || newRating)
                                    ? "text-amber-400"
                                    : "text-zinc-700"
                                }`}
                              >
                                ★
                              </span>
                            </button>
                          ))}
                          <span className="text-xs font-bold text-amber-400 ml-2">
                            {hoverRating || newRating} / 5
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                          Your Feedback & Experience
                        </label>
                        <textarea
                          rows={4}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Tell us what you liked about this product, fabric quality, fitting, delivery..."
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm text-gray-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400 transition-colors"
                          required
                        />
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setShowReviewForm(false)}
                          className="px-4 py-2.5 text-xs font-bold text-gray-400 hover:text-white rounded-xl border border-zinc-800 hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={submittingReview}
                          className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
                        >
                          {submittingReview ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                              <span>Saving to Firebase...</span>
                            </>
                          ) : (
                            <span>🚀 Submit Review</span>
                          )}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-6 space-y-4">
                      <p className="text-gray-300 text-sm">
                        🔒 You need to sign in to write a verified customer review.
                      </p>
                      <Link
                        to="/login"
                        className="inline-block px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/25"
                      >
                        Sign In Now
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Reviews List */}
              {reviewsLoading ? (
                <div className="py-12 flex justify-center items-center gap-3 text-amber-400 text-sm">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading reviews from Firebase...</span>
                </div>
              ) : productReviews.length === 0 ? (
                <div className="text-center py-12 bg-zinc-900/30 rounded-3xl border border-zinc-800/80 p-8 space-y-3">
                  <div className="text-4xl">🌟</div>
                  <h4 className="text-base font-bold text-white">No Reviews Yet</h4>
                  <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                    Be the first verified customer to write a review for <strong className="text-gray-300">{productData.name}</strong>.
                  </p>
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="mt-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs rounded-xl border border-amber-500/30 cursor-pointer"
                  >
                    ✍️ Write the First Review
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {productReviews.map((rev, index) => {
                    const rRating = Number(rev.rating || rev.customerRating || 5);
                    const rName = rev.customerName || rev.name || "Verified Customer";
                    const rDate = rev.createdAt || rev.date
                      ? new Date(rev.createdAt || rev.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Recently";

                    return (
                      <div
                        key={rev._id || `rev_${index}`}
                        className="bg-zinc-900/50 p-5 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-amber-400/10 text-amber-400 font-bold text-xs flex items-center justify-center border border-amber-400/30">
                              {rName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-bold text-white text-sm">
                              {rName}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">{rDate}</span>
                        </div>

                        <div className="flex items-center gap-1 mb-2.5">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-xs ${
                                i < rRating ? "text-amber-400" : "text-zinc-700"
                              }`}
                            >
                              ★
                            </span>
                          ))}
                          <span className="text-[11px] text-amber-400/90 ml-2 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                            ✓ Verified Buyer
                          </span>
                        </div>

                        <p className="text-gray-300 text-xs sm:text-sm leading-relaxed">
                          {rev.comment || rev.review}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="space-y-3">
              <p>🚚 <strong>Standard Delivery:</strong> Delivered within 3-5 business days across India.</p>
              <p>💵 <strong>Payment Options:</strong> Cash on Delivery (COD) and Online Payment available.</p>
              <p>🔄 <strong>7 Days Easy Return:</strong> If you are not satisfied, return or exchange hassle-free within 7 days.</p>
              <p>📞 <strong>Customer Support:</strong> 24/7 assistance available for tracking and inquiries.</p>
            </div>
          )}
        </div>
      </div>

      {/* Related Products Display */}
      <RelatedProducts
        category={productData.category}
        subCategory={productData.subCategory}
        currentProductId={productData._id}
      />
    </div>
  );
}

export default Product;
