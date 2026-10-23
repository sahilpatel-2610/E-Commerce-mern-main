import React, { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import Title from "../components/Title";
import { GiClothes, GiSewingNeedle } from "react-icons/gi";
import { RiSparklingFill, RiShieldCheckLine, RiTruckLine, RiCustomerService2Line } from "react-icons/ri";
import { HiOutlineSparkles } from "react-icons/hi2";
import { toast } from "react-toastify";
import { addFirestoreSubscriber, getFirestoreAboutSlides } from "../api/firebaseService";

function About() {
  const [slides, setSlides] = useState([]);
  const [slidesLoading, setSlidesLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Fetch 100% dynamic About Lookbook slides directly from Firebase Firestore
  useEffect(() => {
    const fetchSlides = async () => {
      try {
        setSlidesLoading(true);
        const firestoreSlides = await getFirestoreAboutSlides(true);
        setSlides(Array.isArray(firestoreSlides) ? firestoreSlides : []);
      } catch (err) {
        console.warn("Failed to load about slides from Firestore:", err);
      } finally {
        setSlidesLoading(false);
      }
    };
    fetchSlides();
  }, []);

  // Smart auto-scroll: If Video -> plays completely until onEnded; If Image -> auto-scrolls continuously every 3.5s
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const currentMediaSrc =
      slides[currentSlide]?.src || slides[currentSlide]?.image || "";
    const isCurrentSlideVideo =
      typeof currentMediaSrc === "string" &&
      (/\.(mp4|webm|mov|avi|mkv)$/i.test(currentMediaSrc) ||
        currentMediaSrc.includes("/video/upload/"));

    // For videos: Do NOT use timer. The video will trigger handleNext() onEnded!
    if (isCurrentSlideVideo) {
      return;
    }

    // For images: Auto-scroll every 3.5 seconds
    const timer = setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 3500);

    return () => clearTimeout(timer);
  }, [isPaused, slides, currentSlide]);

  const handleNext = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    if (slides.length === 0) return;
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleForm = async (event) => {
    event.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      const res = await addFirestoreSubscriber(email.trim());
      if (res.success) {
        setSubscribed(true);
        toast.success("✨ Subscribed successfully to Vraj Creation VIP Drops!");
        setEmail("");
        setTimeout(() => setSubscribed(false), 5000);
      } else {
        if (res.isAlreadySubscribed) {
          toast.info("ℹ️ You are already subscribed to Vraj Creation!");
        } else {
          toast.error(res.message || "Failed to subscribe");
        }
      }
    } catch (err) {
      toast.error(err.message || "Failed to subscribe");
    } finally {
      setLoading(false);
    }
  };

  // Refs for each section
  const aboutRef = useRef(null);
  const highlightsRef = useRef(null);
  const whyChooseUsRef = useRef(null);
  const newsletterRef = useRef(null);

  // In-view hooks
  const isAboutInView = useInView(aboutRef, { once: true, margin: "0px" });
  const isHighlightsInView = useInView(highlightsRef, { once: true, margin: "0px" });
  const isWhyChooseUsInView = useInView(whyChooseUsRef, { once: true, margin: "0px" });
  const isNewsletterInView = useInView(newsletterRef, { once: true, margin: "0px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="my-10 select-none">
      {/* 1. About Header Section */}
      <motion.div
        ref={aboutRef}
        className="text-2xl text-center"
        initial="hidden"
        animate={isAboutInView ? "visible" : "visible"}
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Title text1={"ABOUT"} text2={"OUR BRAND"} />
        </motion.div>
        <motion.p
          className="text-sm sm:text-base text-gray-400 text-center mt-2 max-w-lg mx-auto leading-relaxed"
          variants={itemVariants}
        >
          Crafting distinguished apparel for discerning style—premium fabrics, perfect fits, and timeless elegance by Vraj Creation.
        </motion.p>
      </motion.div>

      {/* 2. Highlights Section with Continuous 5-Image Auto Slider */}
      <motion.div
        ref={highlightsRef}
        className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 px-4 md:px-0 py-12"
        initial="hidden"
        animate={isHighlightsInView ? "visible" : "visible"}
        variants={containerVariants}
      >
        {/* Left: 5-Image Auto-Scrolling Slider */}
        <div
          className="relative w-full max-w-lg lg:max-w-xl min-h-[480px] sm:min-h-[520px] aspect-[4/5] rounded-3xl overflow-hidden border border-zinc-800 hover:border-amber-500/40 transition-colors bg-[#09090b] shadow-2xl group select-none"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <AnimatePresence mode="wait">
            {slides.length > 0 && slides[currentSlide] && (
              <motion.div
                key={slides[currentSlide]._id || slides[currentSlide].id || currentSlide}
                className="absolute inset-0 w-full h-full"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.65, ease: "easeInOut" }}
              >
                {(() => {
                  const mediaSrc = slides[currentSlide].src || slides[currentSlide].image;
                  const isVideo =
                    typeof mediaSrc === "string" &&
                    (/\.(mp4|webm|mov|avi|mkv)$/i.test(mediaSrc) ||
                      mediaSrc.includes("/video/upload/"));
                  return isVideo ? (
                    <video
                      key={mediaSrc}
                      src={mediaSrc}
                      autoPlay
                      muted
                      playsInline
                      onEnded={() => {
                        if (!isPaused) {
                          handleNext();
                        }
                      }}
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <img
                      src={mediaSrc}
                      alt={slides[currentSlide].title}
                      className="w-full h-full object-cover object-center"
                    />
                  );
                })()}
                {/* Luxury Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent pointer-events-none" />

                {/* Slide Info & Badges */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-7 space-y-2 z-10">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10.5px] sm:text-xs font-bold uppercase tracking-wider mb-1 backdrop-blur-md">
                    <HiOutlineSparkles className="w-3 h-3 text-amber-300" />
                    <span>{slides[currentSlide].tag || `LOOKBOOK 0${currentSlide + 1}`}</span>
                  </div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white drop-shadow-md tracking-tight">
                    {slides[currentSlide].title}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 drop-shadow leading-relaxed">
                    {slides[currentSlide].caption}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>


          {/* Dynamic Dots Indicator */}
          <div className="absolute top-4 right-4 flex items-center gap-1.5 z-20 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  currentSlide === i
                    ? "w-6 h-2 bg-amber-400 shadow-sm shadow-amber-500/50"
                    : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
                title={`Go to Look ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Right: Highlights Cards with Luxury Styling */}
        <motion.div className="flex-1 space-y-6" variants={containerVariants}>
          <div>
            <div className="text-2xl sm:text-3xl font-bold">
              <Title text1={"OUR LATEST"} text2={"HIGHLIGHTS"} />
            </div>
            <motion.p
              className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed"
              variants={itemVariants}
            >
              Discover bespoke men's apparel crafted with perfection — breathable fabrics, signature silhouettes, and timeless craftsmanship by Vraj Creation.
            </motion.p>
          </div>

          <motion.div className="flex flex-col gap-4" variants={containerVariants}>
            {/* Card 1 */}
            <motion.div
              className="relative p-4 sm:p-5 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl select-none transition-all duration-300 shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 group backdrop-blur-md"
              variants={itemVariants}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-amber-400 transition-all shadow-md">
                  <GiClothes className="text-2xl text-amber-400" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Fine Fabrics
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    Artisanal Weaves & All-Day Comfort
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Finest handpicked cottons and luxury blends offering breathable, all-day ease with an ultra-premium feel.
                  </p>
                </div>
              </div>
              <span className="absolute top-4 right-4 text-xs font-black font-mono text-zinc-700 group-hover:text-amber-400/60 transition-colors">
                01
              </span>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              className="relative p-4 sm:p-5 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl select-none transition-all duration-300 shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 group backdrop-blur-md"
              variants={itemVariants}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-amber-400 transition-all shadow-md">
                  <GiSewingNeedle className="text-2xl text-amber-400" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Master Tailoring
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    Precision Fit & Structured Silhouette
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Master-cut patterns designed to deliver a sharp, tailored drape for both formal elegance and casual luxury.
                  </p>
                </div>
              </div>
              <span className="absolute top-4 right-4 text-xs font-black font-mono text-zinc-700 group-hover:text-amber-400/60 transition-colors">
                02
              </span>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              className="relative p-4 sm:p-5 bg-gradient-to-br from-zinc-900/80 to-zinc-950/90 border border-zinc-800/90 hover:border-amber-500/50 rounded-2xl select-none transition-all duration-300 shadow-xl hover:shadow-amber-500/5 hover:-translate-y-0.5 group backdrop-blur-md"
              variants={itemVariants}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 via-yellow-500/15 to-transparent border border-amber-500/30 flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:border-amber-400 transition-all shadow-md">
                  <RiSparklingFill className="text-2xl text-amber-400" />
                </div>
                <div className="flex-1 pr-6">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      Signature Trends
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                    Korean & Modern Urban Aesthetics
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    From trendsetting Korean ankle fits to statement coordinates, curated to elevate your everyday presence.
                  </p>
                </div>
              </div>
              <span className="absolute top-4 right-4 text-xs font-black font-mono text-zinc-700 group-hover:text-amber-400/60 transition-colors">
                03
              </span>
            </motion.div>
          </motion.div>

          {/* Quick Assurance Badges */}
          <motion.div
            className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-center"
            variants={itemVariants}
          >
            <div className="p-2 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
              <span className="block text-[11px] font-extrabold text-amber-400">100% In-House</span>
              <span className="text-[10px] text-gray-500">Manufacturing</span>
            </div>
            <div className="p-2 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
              <span className="block text-[11px] font-extrabold text-amber-400">Surat Heritage</span>
              <span className="text-[10px] text-gray-500">Textile Capital</span>
            </div>
            <div className="p-2 bg-zinc-900/40 rounded-xl border border-zinc-800/50">
              <span className="block text-[11px] font-extrabold text-amber-400">Custom Fit</span>
              <span className="text-[10px] text-gray-500">Quality Checked</span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* 3. Why Choose Us Section with Luxury Fashion Badges */}
      <motion.div
        ref={whyChooseUsRef}
        className="text-2xl py-8 text-center"
        initial="hidden"
        animate={isWhyChooseUsInView ? "visible" : "visible"}
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Title text1={"WHY"} text2={"CHOOSE US"} />
        </motion.div>
        <motion.p
          className="text-xs sm:text-sm text-gray-400 text-center mt-1 max-w-md mx-auto"
          variants={itemVariants}
        >
          Dedicated to quality, authenticity, and unmatched customer delight.
        </motion.p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-20 px-4 md:px-0"
        variants={containerVariants}
        initial="hidden"
        animate={isWhyChooseUsInView ? "visible" : "visible"}
      >
        {/* Card 1 */}
        <motion.div
          className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 flex flex-col gap-4 hover:border-amber-500/40 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl group"
          variants={itemVariants}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <RiShieldCheckLine className="text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
              Authentic Quality Assurance
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              Every garment undergoes rigorous quality checks to guarantee authentic materials, flawless stitching, and enduring luxury.
            </p>
          </div>
        </motion.div>

        {/* Card 2 */}
        <motion.div
          className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 flex flex-col gap-4 hover:border-amber-500/40 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl group"
          variants={itemVariants}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <RiTruckLine className="text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
              Fast & Reliable Delivery
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              Carefully packed and dispatched swiftly with secure tracking so your wardrobe additions arrive right on time.
            </p>
          </div>
        </motion.div>

        {/* Card 3 */}
        <motion.div
          className="border border-zinc-800 bg-zinc-900/50 backdrop-blur-md rounded-2xl p-6 sm:p-8 flex flex-col gap-4 hover:border-amber-500/40 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl group"
          variants={itemVariants}
        >
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
            <RiCustomerService2Line className="text-2xl" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors">
              Dedicated Fashion Support
            </h3>
            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
              Our styling and customer support team is always ready to assist with sizing, styling tips, and hassle-free resolutions.
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* 4. Newsletter Section with Luxury Styling */}
      <motion.div
        ref={newsletterRef}
        className="flex flex-col items-center justify-center text-center space-y-4 max-w-4xl mx-auto px-6 py-12 border border-zinc-800/90 bg-gradient-to-b from-[#111116] via-[#09090d] to-[#050508] rounded-3xl shadow-2xl relative overflow-hidden"
        initial="hidden"
        animate={isNewsletterInView ? "visible" : "visible"}
        variants={containerVariants}
      >
        {/* Subtle background glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold uppercase tracking-wider">
          <HiOutlineSparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>VRAJ CREATION EXCLUSIVE</span>
        </div>

        <motion.h1
          className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
          variants={itemVariants}
        >
          Never Miss a Drop!
        </motion.h1>
        <motion.p
          className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed"
          variants={itemVariants}
        >
          Subscribe to receive exclusive lookbook releases, seasonal couture updates, and member-only privileges directly in your inbox.
        </motion.p>

        {subscribed ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-semibold text-sm"
          >
            ✓ Thank you for subscribing to Vraj Creation!
          </motion.div>
        ) : (
          <motion.form
            onSubmit={handleForm}
            className="flex flex-col sm:flex-row items-center gap-2 max-w-lg w-full mt-3"
            variants={itemVariants}
          >
            <input
              className="border border-zinc-700/80 bg-black/70 rounded-xl sm:rounded-l-xl sm:rounded-r-none h-12 outline-none w-full px-4 text-sm text-white placeholder-gray-500 focus:border-amber-400 transition-colors"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 h-12 text-black font-bold text-sm bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all cursor-pointer rounded-xl sm:rounded-r-xl sm:rounded-l-none shrink-0 shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Subscribe</span>
              )}
            </button>
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}

export default About;
