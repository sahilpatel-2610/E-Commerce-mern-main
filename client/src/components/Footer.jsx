import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import {
  HiOutlinePhone,
  HiOutlineEnvelope,
  HiOutlineMapPin,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineShieldCheck,
  HiOutlineTruck,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { FaInstagram, FaFacebookF } from "react-icons/fa6";
import { getFirestoreContactInfo } from "../api/firebaseService";

export default function Footer() {
  const [contact, setContact] = useState({
    phone: "+91 98765 43210",
    email: "contact@vrajcreation.com",
    officeAddress: "105, Kuberji Textile Park-2, Near Torrent Power, Delhigate, Surat, Gujarat",
    officeTitle: "Showroom & Workshop",
    workingHours: "Mon - Sat (10:00 AM - 8:30 PM)",
  });

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const data = await getFirestoreContactInfo();
        if (data) {
          setContact((prev) => ({
            phone: data.phone || prev.phone,
            email: data.email || prev.email,
            officeAddress: data.officeAddress || prev.officeAddress,
            officeTitle: data.officeTitle || prev.officeTitle,
            workingHours: data.workingHours || prev.workingHours,
          }));
        }
      } catch (err) {
        console.log("Footer contact fetch error:", err);
      }
    };
    fetchContact();
  }, []);
  return (
    <footer className="w-full text-gray-400 pt-16 sm:pt-20 select-none mt-12">
      {/* Top Value Propositions Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-12 border-b border-zinc-800/80">
        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-amber-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl shrink-0 border border-amber-500/20">
            <HiOutlineTruck />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Express Pan-India Shipping
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Fast, tracked delivery across all pincodes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-amber-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl shrink-0 border border-amber-500/20">
            <HiOutlineShieldCheck />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Artisanal Fabric Guarantee
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              100% premium in-house manufactured weaves
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-amber-500/30 transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center text-xl shrink-0 border border-amber-500/20">
            <HiOutlineLockClosed />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              100% Secure Checkout
            </h4>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Encrypted payments with Razorpay & Cash on Delivery
            </p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 py-12 border-b border-zinc-800/80">
        {/* Col 1: Brand & Bio (5 cols) */}
        <div className="md:col-span-5 space-y-4">
          <div className="flex items-center gap-3">
            <BrandLogo />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
            <HiOutlineSparkles className="text-xs text-amber-400" />
            <span>Bespoke Menswear • Surat Heritage</span>
          </div>

          <p className="text-xs sm:text-sm text-gray-400 leading-relaxed pr-4">
            Vraj Creation is an elite men's apparel manufacturer & wholesaler. We craft bespoke shirts, gurkha pants, festive kurtas, and modern silhouettes engineered for distinction.
          </p>

          <div className="flex items-center gap-2 pt-1 text-xs text-gray-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Surat Showroom Open for B2B & Retail Inquiries</span>
          </div>
        </div>

        {/* Col 2: Navigation Links (3 cols) */}
        <div className="md:col-span-3 space-y-3.5">
          <h3 className="font-bold text-amber-400 text-xs sm:text-sm tracking-[0.2em] uppercase">
            QUICK NAVIGATION
          </h3>
          <ul className="text-xs sm:text-sm space-y-2.5 text-gray-300 font-medium">
            <li>
              <Link to="/" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span>›</span>
                <span>Home Page</span>
              </Link>
            </li>
            <li>
              <Link to="/collection" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span>›</span>
                <span>Luxury Collection</span>
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span>›</span>
                <span>About Our Craftsmanship</span>
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span>›</span>
                <span>Contact & Showroom</span>
              </Link>
            </li>
            <li>
              <Link to="/orders" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
                <span>›</span>
                <span>Track My Orders</span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Col 3: Get In Touch (4 cols) */}
        <div className="md:col-span-4 space-y-3.5">
          <h3 className="font-bold text-amber-400 text-xs sm:text-sm tracking-[0.2em] uppercase">
            GET IN TOUCH
          </h3>
          <div className="space-y-3 text-xs sm:text-sm text-gray-300">
            <a
              href={`tel:${contact.phone?.replace(/[^0-9+]/g, "")}`}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-amber-500/40 hover:text-amber-300 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-sm shrink-0 group-hover:scale-110 transition-transform">
                <HiOutlinePhone />
              </div>
              <span className="font-bold font-mono">{contact.phone}</span>
            </a>

            <a
              href={`mailto:${contact.email}`}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-amber-500/40 hover:text-amber-300 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-sm shrink-0 group-hover:scale-110 transition-transform">
                <HiOutlineEnvelope />
              </div>
              <span className="truncate">{contact.email}</span>
            </a>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800 text-gray-400 text-xs leading-relaxed">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center text-sm shrink-0 mt-0.5">
                <HiOutlineMapPin />
              </div>
              <div>
                <span className="font-bold text-white block mb-0.5">{contact.officeTitle || "Showroom & Workshop"}</span>
                <span>{contact.officeAddress}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 pt-1">
              <HiOutlineClock className="text-amber-400 text-sm" />
              <span>Working Hours: {contact.workingHours || "Mon - Sat (10:00 AM - 8:30 PM)"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright & Social Media Links */}
      <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 font-medium">
        <p>
          Copyright 2025 © <span className="text-amber-400 font-bold">Vraj Creation</span>. All Rights Reserved.
        </p>

        {/* Facebook & Instagram Icons in Project Gold Theme */}
        <div className="flex items-center gap-3.5">
          <a
            href="https://www.instagram.com"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-zinc-900/90 text-amber-400 hover:text-black border border-amber-500/30 hover:border-amber-400 hover:bg-gradient-to-tr hover:from-amber-400 hover:via-yellow-400 hover:to-amber-500 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-amber-950/50 hover:shadow-amber-500/30 cursor-pointer group"
            title="Follow Vraj Creation on Instagram"
          >
            <FaInstagram className="text-lg sm:text-xl group-hover:scale-110 transition-transform" />
          </a>

          <a
            href="https://www.facebook.com"
            target="_blank"
            rel="noreferrer"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-zinc-900/90 text-amber-400 hover:text-black border border-amber-500/30 hover:border-amber-400 hover:bg-gradient-to-tr hover:from-amber-400 hover:via-yellow-400 hover:to-amber-500 flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg shadow-amber-950/50 hover:shadow-amber-500/30 cursor-pointer group"
            title="Follow Vraj Creation on Facebook"
          >
            <FaFacebookF className="text-base sm:text-lg group-hover:scale-110 transition-transform" />
          </a>
        </div>
      </div>
    </footer>
  );
}
