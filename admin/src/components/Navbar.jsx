import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { backendUrl } from "../App";
import BrandLogo from "./BrandLogo";

function Navbar({ setToken, sidebarOpen, setSidebarOpen }) {
  const [adminName, setAdminName] = useState(
    localStorage.getItem("admin_name") || "Admin"
  );
  const [adminEmail, setAdminEmail] = useState(
    localStorage.getItem("admin_email") || "admin@vrajcreation.com"
  );

  // Smart dynamic Storefront URL resolution (Netlify production vs local dev)
  const clientUrl =
    import.meta.env.VITE_CLIENT_URL ||
    (typeof window !== "undefined" && window.location.hostname.includes("netlify.app")
      ? "https://mernfashion-store.netlify.app"
      : "http://localhost:5175");

  useEffect(() => {
    const storedName = localStorage.getItem("admin_name");
    const storedEmail = localStorage.getItem("admin_email");
    if (storedName) setAdminName(storedName);
    if (storedEmail) setAdminEmail(storedEmail);

    const fetchAdminInfo = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const { data } = await axios.get(`${backendUrl}/api/user/profile`, {
          headers: { token },
        });
        if (data.success && data.user) {
          if (data.user.name) {
            setAdminName(data.user.name);
            localStorage.setItem("admin_name", data.user.name);
          }
          if (data.user.email) {
            setAdminEmail(data.user.email);
            localStorage.setItem("admin_email", data.user.email);
          }
        }
      } catch (e) {
        console.log("Navbar profile fetch error:", e);
      }
    };
    fetchAdminInfo();
  }, []);

  const openStorefront = (e) => {
    e.preventDefault();
    window.open(clientUrl, "_blank");
  };

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#09090b] backdrop-blur-md border-b border-zinc-800 sticky top-0 z-40 select-none">
      {/* Left: Pure Brand Logo & Sidebar Toggle Button */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Brand Logo without any 'Admin' badge */}
        <BrandLogo showAdminBadge={false} />

        {/* Sidebar Toggle Button */}
        <button
          type="button"
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="w-10 h-10 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-amber-400/50 flex items-center justify-center cursor-pointer shadow-lg transition-all group"
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {sidebarOpen ? (
            <svg
              className="w-5 h-5 text-white transition-transform group-hover:scale-105"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3.5" y1="6" x2="15" y2="6" />
              <line x1="3.5" y1="12" x2="9.5" y2="12" />
              <line x1="3.5" y1="18" x2="15" y2="18" />
              <polyline points="20 7.5 15.5 12 20 16.5" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-white transition-transform group-hover:scale-105"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3.5" y1="6" x2="20.5" y2="6" />
              <line x1="3.5" y1="12" x2="20.5" y2="12" />
              <line x1="3.5" y1="18" x2="20.5" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* User Profile Card */}
        <div className="h-11 px-4 flex items-center gap-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl shadow-sm">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 border border-amber-300/40 flex items-center justify-center text-black font-black text-xs shrink-0 shadow-md">
            {adminName ? adminName.charAt(0).toUpperCase() : "A"}
          </div>
          <div className="flex flex-col justify-center text-left leading-tight min-w-0">
            <span className="font-bold text-xs sm:text-sm text-white tracking-wide truncate">
              {adminName}
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-400 truncate">
              {adminEmail}
            </span>
          </div>
        </div>

        {/* View Storefront Link */}
        <button
          type="button"
          onClick={openStorefront}
          className="h-11 px-4 hidden sm:flex items-center gap-2 rounded-2xl text-xs font-semibold text-gray-300 hover:text-amber-300 bg-zinc-900/90 border border-zinc-800 hover:border-amber-500/40 transition-all shadow-sm cursor-pointer"
          title="Open Customer Storefront"
        >
          <svg
            className="w-4 h-4 text-amber-400 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span>View Storefront</span>
          <span className="text-[10px] text-gray-500 font-mono">↗</span>
        </button>

        {/* Logout Button */}
        <button
          onClick={() => {
            localStorage.removeItem("token");
            localStorage.removeItem("admin_name");
            localStorage.removeItem("admin_email");
            if (setToken) setToken("");
          }}
          className="h-11 px-4 bg-rose-500/15 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500/30 hover:border-rose-500 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer shrink-0"
          title="Logout from Admin Panel"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;