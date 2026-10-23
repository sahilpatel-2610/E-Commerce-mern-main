import React, { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { assets } from "../assets/frontend_assets/assets";
import Title from "../components/Title";
import { FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaBriefcase } from "react-icons/fa";
import { getFirestoreContactInfo } from "../api/firebaseService";

function Contact() {
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const titleRef = useRef(null);
  const contentRef = useRef(null);

  const isTitleInView = useInView(titleRef, { once: true, margin: "0px" });
  const isContentInView = useInView(contentRef, { once: true, margin: "0px" });

  useEffect(() => {
    const fetchContact = async () => {
      try {
        setLoading(true);
        const firestoreContact = await getFirestoreContactInfo(true);
        if (firestoreContact) {
          setContact(firestoreContact);
        }
      } catch (err) {
        console.warn("Failed to load contact info from Firestore:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContact();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
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
    <div className="text-gray-300 min-h-screen py-16 px-4 lg:px-20 select-none">
      {/* Title Section */}
      <motion.div
        ref={titleRef}
        className="text-2xl text-center"
        initial="hidden"
        animate={isTitleInView ? "visible" : "visible"}
        variants={containerVariants}
      >
        <motion.div variants={itemVariants}>
          <Title text1={"CONTACT"} text2={"US"} />
        </motion.div>
        <motion.p
          className="text-xs sm:text-sm text-gray-400 text-center mt-1 max-w-md mx-auto"
          variants={itemVariants}
        >
          We'd love to connect with you. Reach out for wholesale inquiries, custom orders, or customer support.
        </motion.p>
      </motion.div>

      {/* Content Section */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-400">Loading Contact Information...</p>
        </div>
      ) : contact ? (
        <motion.div
          ref={contentRef}
          className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-12 mt-12 items-stretch"
          initial="hidden"
          animate={isContentInView ? "visible" : "visible"}
          variants={containerVariants}
        >
          {/* Contact Info Cards */}
          <motion.div className="space-y-6" variants={containerVariants}>
            <motion.div
              className="space-y-4 text-gray-300"
              variants={containerVariants}
            >
              {/* Store Location */}
              {contact.officeAddress && (
                <motion.div
                  className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-start gap-4 hover:border-amber-500/40 transition-colors shadow-lg"
                  variants={itemVariants}
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <FaMapMarkerAlt className="text-lg" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {contact.officeTitle || "Office & Showroom"}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1 leading-relaxed">
                      {contact.officeAddress}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Phone */}
              {contact.phone && (
                <motion.div
                  className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-start gap-4 hover:border-amber-500/40 transition-colors shadow-lg"
                  variants={itemVariants}
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <FaPhoneAlt className="text-base" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Wholesale Inquiries</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      <a
                        href={`tel:${contact.phone}`}
                        className="hover:text-amber-400 transition-colors font-medium font-mono"
                      >
                        {contact.phone}
                      </a>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Email */}
              {contact.email && (
                <motion.div
                  className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex items-start gap-4 hover:border-amber-500/40 transition-colors shadow-lg"
                  variants={itemVariants}
                >
                  <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <FaEnvelope className="text-base" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Email Support</h3>
                    <p className="text-xs sm:text-sm text-gray-400 mt-1">
                      <a
                        href={`mailto:${contact.email}`}
                        className="hover:text-amber-400 transition-colors font-medium"
                      >
                        {contact.email}
                      </a>
                    </p>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Careers Section */}
            {contact.careersTitle && (
              <motion.div
                className="p-6 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3"
                variants={itemVariants}
              >
                <div className="flex items-center gap-3">
                  <FaBriefcase className="text-amber-400 text-lg" />
                  <h3 className="text-base font-bold text-white">
                    {contact.careersTitle}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
                  {contact.careersDesc}
                </p>
                <motion.a
                  href={`mailto:${contact.email}?subject=Career Inquiry - Vraj Creation`}
                  className="inline-block mt-2 px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                  variants={itemVariants}
                >
                  {contact.careersBtnText || "Explore Openings"}
                </motion.a>
              </motion.div>
            )}
          </motion.div>

          {/* Brand Image / Video Banner (Enlarged & Stretched) */}
          {(contact.image || contact.videoUrl) && (
            <motion.div
              className="relative overflow-hidden rounded-3xl border border-zinc-800 hover:border-amber-500/30 transition-colors shadow-2xl group min-h-[500px] sm:min-h-[560px] lg:min-h-[620px] h-full flex flex-col justify-end"
              variants={itemVariants}
            >
              {(() => {
                const mediaUrl = contact.videoUrl || contact.image;
                const isVideo =
                  typeof mediaUrl === "string" &&
                  (/\.(mp4|webm|mov|avi|mkv)$/i.test(mediaUrl) ||
                    mediaUrl.includes("/video/upload/"));
                return isVideo ? (
                  <video
                    src={mediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover rounded-3xl"
                  />
                ) : (
                  <motion.img
                    src={mediaUrl}
                    alt="Vraj Creation Showroom"
                    className="absolute inset-0 w-full h-full object-cover rounded-3xl transition-transform duration-700 group-hover:scale-105"
                    variants={itemVariants}
                  />
                );
              })()}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
              <div className="absolute top-5 left-5 right-5 flex items-center justify-between pointer-events-none z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10.5px] sm:text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                  ✨ FLAGSHIP ATELIER
                </span>
                {contact.showroomCity && (
                  <span className="text-amber-300 text-[10.5px] sm:text-xs uppercase font-extrabold tracking-wider bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    {contact.showroomCity}
                  </span>
                )}
              </div>
              <motion.div
                className="relative m-6 bg-black/75 backdrop-blur-md border border-white/10 text-white px-5 py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-2xl flex items-center justify-between z-10"
                variants={itemVariants}
              >
                <span>Vraj Creation — Men's Apparel Manufacturer</span>
                <span className="text-amber-400 text-xs font-semibold">Surat Flagship</span>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}

export default Contact;
