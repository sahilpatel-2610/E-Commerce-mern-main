import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { getFirestoreBanners } from "../api/firebaseService";

const Hero = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [[currentSlide, direction], setSlide] = useState([0, 0]);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const firestoreBanners = await getFirestoreBanners(true);
        if (Array.isArray(firestoreBanners) && firestoreBanners.length > 0) {
          setSlides(firestoreBanners);
          return;
        }

        const backendUrl =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
        const res = await fetch(`${backendUrl}/api/admin/banners`);
        const data = await res.json();
        if (data.success && Array.isArray(data.banners) && data.banners.length > 0) {
          setSlides(data.banners);
        }
      } catch (err) {
        console.error("Error loading hero banners:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBanners();
  }, []);

  const displaySlides = slides;
  const activeIndex = currentSlide >= displaySlides.length ? 0 : currentSlide;
  const activeSlide = displaySlides[activeIndex] || {};

  const isVideo =
    activeSlide.mediaType === "video" ||
    !!activeSlide.video ||
    (typeof activeSlide.imageUrl === "string" &&
      (activeSlide.imageUrl.endsWith(".mp4") ||
        activeSlide.imageUrl.endsWith(".webm") ||
        activeSlide.imageUrl.includes("/video/upload/")));

  // Slide navigation - continuous cyclic scrolling
  const paginate = (newDirection) => {
    if (displaySlides.length === 0) return;
    setSlide(([curr]) => {
      let nextIndex = curr + newDirection;
      if (nextIndex < 0) nextIndex = displaySlides.length - 1;
      if (nextIndex >= displaySlides.length) nextIndex = 0;
      return [nextIndex, newDirection];
    });
  };

  // Continuous auto advance for images (4s) and safety timer for videos
  useEffect(() => {
    if (displaySlides.length <= 1) return;

    if (!isVideo) {
      const interval = setInterval(() => {
        paginate(1);
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [currentSlide, displaySlides.length, isVideo]);

  if (loading) {
    return null;
  }

  if (slides.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 p-8 sm:p-14 my-6 shadow-2xl select-none">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            ✨ Exclusive Fashion Store
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Discover Elegance with <span className="text-amber-400">Vraj Creation</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400">
            Explore our handcrafted luxury attire, festive collections, and trending styles curated for every celebration.
          </p>
          <div className="pt-2">
            <Link
              to="/collection"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-xl transition-all shadow-lg hover:shadow-amber-500/25 cursor-pointer"
            >
              <span>Explore Collection</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Video transition animations
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? "100%" : "-100%",
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
      },
    },
    exit: (direction) => ({
      x: direction < 0 ? "100%" : "-100%",
      opacity: 0,
      transition: {
        x: { type: "spring", stiffness: 300, damping: 30 },
        opacity: { duration: 0.4 },
      },
    }),
  };

  // Text animation variants
  const textVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut", delay: 0.1 },
    },
  };

  if (loading && displaySlides.length === 0) {
    return (
      <div className="relative min-h-[500px] md:min-h-[520px] rounded-3xl mt-5 md:mt-8 overflow-hidden shadow-2xl border border-zinc-800/80 bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-amber-400">
          <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Loading Hero Showcase...
          </span>
        </div>
      </div>
    );
  }

  if (displaySlides.length === 0) {
    return null;
  }

  const optimizeMediaUrl = (url) => {
    if (!url || typeof url !== "string") return url;
    // Optimize Cloudinary video/image URLs for HD quality
    if (url.includes("res.cloudinary.com") && url.includes("/video/upload/")) {
      return url.replace("/video/upload/", "/video/upload/q_auto:best,vc_auto/");
    }
    if (url.includes("res.cloudinary.com") && url.includes("/image/upload/")) {
      return url.replace("/image/upload/", "/image/upload/q_auto:best,f_auto/");
    }
    return url;
  };

  const rawSource =
    activeSlide.video ||
    activeSlide.imageUrl ||
    activeSlide.image ||
    "/Fashion_saiaagaman.mp4";

  const mediaSource = optimizeMediaUrl(rawSource);

  return (
    <div className="relative h-[380px] sm:h-[440px] md:h-[480px] lg:h-[520px] rounded-3xl mt-4 sm:mt-6 md:mt-8 overflow-hidden shadow-2xl border border-zinc-800/80 bg-zinc-950 select-none">
      {/* Invisible Background Preload for all other slides to eliminate video buffering delay */}
      <div className="hidden pointer-events-none" aria-hidden="true">
        {displaySlides.map((s, i) => {
          const src = optimizeMediaUrl(s.video || s.imageUrl || s.image);
          if (!src || i === activeIndex) return null;
          const isV = typeof src === "string" && (src.endsWith(".mp4") || src.endsWith(".webm") || src.includes("/video/upload/"));
          return isV ? (
            <video key={src} src={src} preload="auto" muted playsInline className="hidden" />
          ) : (
            <img key={src} src={src} loading="eager" className="hidden" alt="preload" />
          );
        })}
      </div>

      {/* 1. Animated Video / Image Slide Container (HD Cinematic Quality) */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={activeSlide._id || activeSlide.id || activeIndex}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0 w-full h-full"
        >
          {isVideo ? (
            <video
              key={mediaSource}
              src={mediaSource}
              autoPlay
              muted
              playsInline
              preload="auto"
              onEnded={() => {
                paginate(1);
              }}
              className="w-full h-full object-cover object-center pointer-events-none transform scale-[1.01] will-change-transform"
            />
          ) : (
            <img
              src={mediaSource}
              alt={activeSlide.name || activeSlide.title1 || "Banner"}
              className="w-full h-full object-cover object-center pointer-events-none transform scale-[1.01]"
            />
          )}
          {/* Subtle Light Gradient Overlay (Preserves 100% video HD brightness & clarity) */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none" />
        </motion.div>
      </AnimatePresence>

      {/* 2. Text Content Overlay (Flush to edges with refined soft typography) */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between h-full px-2 sm:px-3 md:px-4 pointer-events-none">
        {/* Left Side: Subtitle, Main Title & Call-To-Action (Flush to Left edge) */}
        <div className="w-full md:w-3/5 text-left py-8 sm:py-10 md:py-12 pointer-events-auto pl-0 ml-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={(activeSlide._id || activeSlide.id || activeIndex) + "-text"}
              variants={textVariants}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            >
              {/* Subtitle Badge */}
              {(activeSlide.subtitle || activeSlide.tag || activeSlide.badgeTag) && (
                <div className="flex items-center justify-start gap-1.5 mb-2 pl-0.5">
                  <div className="h-[1px] w-5 bg-amber-400/60" />
                  <p className="font-medium text-[11px] sm:text-xs tracking-[0.22em] uppercase text-amber-300/80 drop-shadow-sm">
                    {activeSlide.subtitle || activeSlide.tag || activeSlide.badgeTag}
                  </p>
                </div>
              )}

              {/* Main Heading */}
              <h1 className="text-2xl sm:text-4xl md:text-4xl lg:text-5xl font-bold leading-tight mb-4 tracking-tight">
                <span className="text-zinc-100/90 drop-shadow-sm">
                  {activeSlide.title1 || activeSlide.name || activeSlide.bannerTitle || "Exclusive Collection"}
                </span>
                {activeSlide.title2 && (
                  <>
                    <br />
                    <span className="text-amber-300/85 font-extrabold drop-shadow-sm">
                      {activeSlide.title2}
                    </span>
                  </>
                )}
              </h1>

              {/* Shop Now Action */}
              <div className="flex items-center justify-start gap-3">
                <Link
                  to={activeSlide.link || "/collection"}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-400/90 to-yellow-500/90 hover:from-amber-300 hover:to-yellow-400 text-zinc-950 font-bold text-xs sm:text-sm tracking-wide transition-all shadow-md shadow-amber-500/20 hover:scale-105 active:scale-95 cursor-pointer"
                >
                  Shop Now →
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Side: Soft Subtle Tagline */}
        {(activeSlide.tagline || activeSlide.description) && (
          <div className="hidden md:flex w-full md:w-2/5 justify-end text-right pointer-events-auto pr-0 mr-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={(activeSlide._id || activeSlide.id || activeIndex) + "-tagline"}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="max-w-xs space-y-1"
              >
                <p className="text-xs sm:text-sm lg:text-base text-zinc-200/75 italic font-normal leading-relaxed tracking-wide drop-shadow-sm">
                  "{activeSlide.tagline || activeSlide.description}"
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 3. Slide Pagination Indicators */}
      {displaySlides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10">
          {displaySlides.map((slide, index) => (
            <button
              key={slide._id || slide.id || index}
              onClick={() => setSlide([index, index > activeIndex ? 1 : -1])}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                activeIndex === index
                  ? "w-6 h-1.5 bg-amber-400 shadow-sm shadow-amber-400/50"
                  : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
              }`}
              title={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Hero;