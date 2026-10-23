import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowUp } from "react-icons/fa6";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 320) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          onClick={scrollToTop}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          whileHover={{ scale: 1.15, y: -3 }}
          whileTap={{ scale: 0.9 }}
          className="fixed bottom-7 right-7 z-40 w-12 h-12 rounded-2xl bg-zinc-950/90 hover:bg-gradient-to-tr hover:from-amber-400 hover:to-yellow-500 text-amber-400 hover:text-black border border-amber-500/40 hover:border-amber-400 shadow-2xl shadow-amber-500/25 backdrop-blur-xl flex items-center justify-center cursor-pointer transition-all duration-300 group"
          title="Scroll to Top"
          aria-label="Scroll to Top"
        >
          <FaArrowUp className="w-5 h-5 transition-transform duration-300 group-hover:-translate-y-0.5" />
          {/* Subtle glowing halo behind button */}
          <span className="absolute -inset-0.5 rounded-2xl bg-amber-500/20 blur-sm pointer-events-none group-hover:bg-amber-400/40 transition-colors"></span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
