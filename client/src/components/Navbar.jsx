import React, { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useShopContext } from "../context/ShopContext";
import BrandLogo from "./BrandLogo";
import {
  HiOutlineUser,
  HiOutlineShoppingBag,
  HiMagnifyingGlass,
  HiBars3,
  HiXMark,
  HiArrowTopRightOnSquare,
  HiOutlineClipboardDocumentList,
  HiArrowRightOnRectangle,
  HiOutlineSparkles,
} from "react-icons/hi2";

function Navbar() {
  const [visible, setVisible] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const location = useLocation();

  // Smart dynamic Admin URL resolution (Netlify production vs local dev)
  const adminUrl =
    import.meta.env.VITE_ADMIN_URL ||
    (typeof window !== "undefined" && window.location.hostname.includes("netlify.app")
      ? "https://mernfashion-admin.netlify.app"
      : "http://localhost:5174");

  const {
    setShowSearch,
    getCartCount,
    token,
    setToken,
    setCartItems,
    navigate,
  } = useShopContext();

  // Close dropdown and drawer on route change
  useEffect(() => {
    setProfileOpen(false);
    setVisible(false);
  }, [location.pathname]);

  const logout = () => {
    navigate("/login");
    localStorage.removeItem("token");
    setToken("");
    setCartItems({});
  };

  const cartCount = getCartCount();

  // Read user info for quick avatar display
  const getUserData = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };
  const user = getUserData();

  const navItems = [
    { to: "/", label: "HOME" },
    { to: "/collection", label: "COLLECTION" },
    { to: "/about", label: "ABOUT" },
    { to: "/contact", label: "CONTACT" },
  ];

  return (
    <header className="w-full select-none z-40 py-3 sm:py-4">
      <div className="flex items-center justify-between gap-4">
        {/* 1. Left: Brand Logo (Kept unchanged as requested) */}
        <div className="flex items-center">
          <BrandLogo />
        </div>

        {/* 2. Center: Ultra-Luxury Floating Island with Gliding Motion Pill */}
        <nav className="hidden sm:flex items-center bg-gradient-to-r from-amber-500/20 via-zinc-800/80 to-amber-500/20 p-[1px] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <ul className="flex items-center gap-1 bg-zinc-950/85 rounded-full p-1.5 backdrop-blur-xl">
            {navItems.map((item) => {
              const isActive =
                item.to === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(item.to);

              return (
                <li key={item.to} className="relative">
                  <NavLink
                    to={item.to}
                    className={`relative z-10 px-4 sm:px-5 py-2 rounded-full text-xs font-black uppercase tracking-[0.18em] transition-colors duration-200 flex items-center justify-center cursor-pointer ${
                      isActive
                        ? "text-black"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </NavLink>

                  {/* Smooth Spring Gliding Pill */}
                  {isActive && (
                    <motion.div
                      layoutId="navbar-active-pill"
                      className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 rounded-full shadow-[0_0_18px_rgba(245,158,11,0.6)]"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 3. Right: Luxury Action Island */}
        <div className="flex items-center bg-gradient-to-r from-amber-500/20 via-zinc-800/80 to-amber-500/20 p-[1px] rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <div className="flex items-center gap-1.5 bg-zinc-950/85 rounded-full p-1.5 backdrop-blur-xl">
            {/* Search Button */}
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/80 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-400 border border-zinc-800/80 hover:border-amber-500/40 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105"
              title="Search Products (Live)"
            >
              <HiMagnifyingGlass className="text-base sm:text-lg" />
            </button>

            {/* Profile Dropdown */}
            <div className="group relative">
              <button
                type="button"
                onClick={() => (token ? setProfileOpen(!profileOpen) : navigate("/login"))}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/80 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-400 border border-zinc-800/80 hover:border-amber-500/40 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105 overflow-hidden"
                title="My Account"
              >
                {token && user.image && !user.image.match(/\.(mp4|webm|mov)$/i) ? (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <HiOutlineUser className="text-base sm:text-lg" />
                )}
              </button>

              {/* Dropdown Menu */}
              {token && (
                <div className="group-hover:block hidden absolute right-0 top-full pt-3 z-50 animate-in fade-in duration-200">
                  <div className="flex flex-col gap-2 w-52 py-3.5 px-4 bg-zinc-950/95 border border-zinc-800 rounded-2xl text-gray-300 shadow-2xl backdrop-blur-2xl">
                    {/* User Details */}
                    {user.name && (
                      <div className="pb-2.5 mb-1 border-b border-zinc-800/80">
                        <span className="text-xs font-bold text-white truncate block">
                          {user.name}
                        </span>
                        <span className="text-[10px] text-gray-500 truncate block">
                          {user.email || ""}
                        </span>
                      </div>
                    )}

                    <p
                      onClick={() => navigate("/profile")}
                      className="cursor-pointer hover:text-amber-300 transition-colors text-xs font-medium flex items-center gap-2.5 py-1.5"
                    >
                      <HiOutlineUser className="text-amber-400 text-sm" />
                      <span>My Profile</span>
                    </p>

                    <p
                      onClick={() => navigate("/orders")}
                      className="cursor-pointer hover:text-amber-300 transition-colors text-xs font-medium flex items-center gap-2.5 py-1.5"
                    >
                      <HiOutlineClipboardDocumentList className="text-amber-400 text-sm" />
                      <span>My Orders</span>
                    </p>

                    <a
                      href={adminUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cursor-pointer text-amber-300 hover:text-amber-200 font-bold flex items-center justify-between text-xs py-1.5"
                    >
                      <span className="flex items-center gap-2.5">
                        <HiOutlineSparkles className="text-amber-400 text-sm" />
                        <span>Admin Panel</span>
                      </span>
                      <HiArrowTopRightOnSquare className="text-xs" />
                    </a>

                    <p
                      onClick={logout}
                      className="cursor-pointer text-rose-400 hover:text-rose-300 transition-colors pt-2.5 border-t border-zinc-800 text-xs font-bold flex items-center gap-2.5"
                    >
                      <HiArrowRightOnRectangle className="text-sm" />
                      <span>Sign Out</span>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Cart Bag */}
            <Link
              to="/cart"
              className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-zinc-900/80 hover:bg-amber-500/20 text-zinc-300 hover:text-amber-400 border border-zinc-800/80 hover:border-amber-500/40 flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-105"
              title="View Shopping Cart"
            >
              <HiOutlineShoppingBag className="text-base sm:text-lg" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black text-[9px] rounded-full shadow-lg shadow-amber-500/50 flex items-center justify-center font-mono animate-pulse">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Mobile Menu Hamburger */}
            <button
              type="button"
              onClick={() => setVisible(true)}
              className="w-9 h-9 rounded-full bg-zinc-900/80 text-amber-400 flex sm:hidden items-center justify-center cursor-pointer border border-zinc-800/80"
              title="Open Navigation Menu"
            >
              <HiBars3 className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {visible && (
        <div className="fixed inset-0 z-50 sm:hidden flex justify-end">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setVisible(false)}
          />
          <div className="relative w-72 h-full bg-zinc-950 border-l border-zinc-800 p-6 flex flex-col justify-between z-10 animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
                <BrandLogo />
                <button
                  type="button"
                  onClick={() => setVisible(false)}
                  className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 text-gray-400 flex items-center justify-center cursor-pointer"
                >
                  <HiXMark className="text-base" />
                </button>
              </div>

              <div className="flex flex-col gap-2 pt-6">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setVisible(false)}
                    className={({ isActive }) =>
                      `py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                        isActive
                          ? "bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-lg shadow-amber-500/20"
                          : "text-gray-300 hover:text-white hover:bg-zinc-900"
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800 space-y-2">
              {token ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setVisible(false)}
                    className="w-full py-2.5 px-4 bg-zinc-900 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <HiOutlineUser className="text-amber-400" />
                    <span>My Profile</span>
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setVisible(false)}
                    className="w-full py-2.5 px-4 bg-zinc-900 text-gray-300 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <HiOutlineClipboardDocumentList className="text-amber-400" />
                    <span>My Orders</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setVisible(false);
                    }}
                    className="w-full py-2.5 px-4 bg-rose-500/10 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-2"
                  >
                    <HiArrowRightOnRectangle />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setVisible(false)}
                  className="w-full py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-xl text-xs font-extrabold uppercase tracking-wider text-center block shadow-lg shadow-amber-500/20"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
