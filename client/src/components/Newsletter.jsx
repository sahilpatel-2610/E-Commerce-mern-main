import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { HiOutlineSparkles } from "react-icons/hi2";
import { FaArrowRight } from "react-icons/fa6";
import { FaMapMarkerAlt, FaBoxes, FaTshirt } from "react-icons/fa";
import { toast } from "react-toastify";
import { addFirestoreSubscriber } from "../api/firebaseService";

function Newsletter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

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

  const featuresRef = useRef(null);
  const newsletterRef = useRef(null);
  const isFeaturesInView = useInView(featuresRef, { once: true, margin: "0px" });
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

  const sectionVariants = {
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
    <div className="py-12 space-y-12 select-none">
      {/* 1. Vraj Creation Business Showcase Card */}
      <motion.div
        ref={featuresRef}
        className="max-w-6xl mx-auto px-6 py-12 sm:py-16 flex flex-col items-center justify-center text-center bg-gradient-to-b from-[#181822] via-[#0e0e14] to-[#08080c] border border-zinc-800 rounded-3xl text-white shadow-2xl relative overflow-hidden group"
        initial="hidden"
        animate={isFeaturesInView ? "visible" : "visible"}
        variants={containerVariants}
      >
        {/* Subtle Ambient Shimmer */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-amber-500/10 blur-[100px] pointer-events-none rounded-full" />

        {/* Category Pill */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-300 backdrop-blur-md mb-3"
          variants={sectionVariants}
        >
          <HiOutlineSparkles className="w-3.5 h-3.5" />
          <span>Apparel & Clothing</span>
        </motion.div>

        {/* Main Headline */}
        <motion.h2
          className="text-2xl sm:text-4xl md:text-5xl font-extrabold max-w-4xl leading-tight tracking-tight mb-6"
          variants={sectionVariants}
        >
          👔 Premium Men's Apparel <br />
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            Manufacturer & Wholesaler
          </span>
        </motion.h2>

        {/* Business Attributes Grid */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-3xl mb-8"
          variants={sectionVariants}
        >
          {/* Location & Shipping */}
          <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md text-gray-200 text-xs sm:text-sm font-medium">
            <FaMapMarkerAlt className="text-red-400 text-base shrink-0" />
            <span>Surat, Gujarat | Shipping Pan-India 🇮🇳</span>
          </div>

          {/* B2B Badge */}
          <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md text-amber-300 text-xs sm:text-sm font-semibold">
            <FaBoxes className="text-amber-400 text-base shrink-0" />
            <span>📦 B2B Only. 🚫 No Retail</span>
          </div>

          {/* Products Badge */}
          <div className="flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-md text-emerald-300 text-xs sm:text-sm font-medium">
            <FaTshirt className="text-emerald-400 text-base shrink-0" />
            <span>Shirts, T-Shirts, Denim & Trousers</span>
          </div>
        </motion.div>

        {/* Action CTA Button */}
        <motion.div variants={sectionVariants}>
          <Link
            to={"/collection"}
            className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full text-sm font-bold text-black bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 transition-all shadow-lg shadow-amber-500/20 hover:scale-105 cursor-pointer"
          >
            <span>Explore Wholesale Collections</span>
            <FaArrowRight className="w-3.5 h-3.5" />
          </Link>
        </motion.div>
      </motion.div>

      {/* 2. Newsletter Section */}
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

        <motion.h3
          className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
          variants={sectionVariants}
        >
          Never Miss a Drop!
        </motion.h3>
        <motion.p
          className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto leading-relaxed"
          variants={sectionVariants}
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
            variants={sectionVariants}
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

export default Newsletter;
