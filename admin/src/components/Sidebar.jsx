import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  HiOutlineEnvelopeOpen,
  HiOutlineFilm,
  HiOutlineBookOpen,
  HiOutlinePhone,
  HiStar,
} from "react-icons/hi2";

function Sidebar() {
  const [productOpen, setProductOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);

  return (
    <aside className="w-64 h-full bg-[#09090b] border-r border-zinc-800 flex flex-col justify-between py-5 px-3 select-none text-gray-300 shrink-0 overflow-y-auto">
      <div className="flex flex-col gap-1.5">
        {/* 1. Dashboard */}
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            <span>Dashboard</span>
          </div>
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </NavLink>

        {/* 2. Products Dropdown */}
        <div>
          <button
            type="button"
            onClick={() => setProductOpen(!productOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              productOpen ? "bg-zinc-900/90 text-amber-300 border border-zinc-800" : "hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                P
              </span>
              <span className="font-semibold text-white">Products</span>
            </div>
            {productOpen ? (
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {productOpen && (
            <div className="ml-5 pl-4 border-l border-zinc-800 flex flex-col gap-1 my-1.5 text-xs">
              <NavLink
                to="/product-list"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-zinc-900"
                  }`
                }
              >
                Product List
              </NavLink>
              <NavLink
                to="/product-upload"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-zinc-900"
                  }`
                }
              >
                Product Upload
              </NavLink>
              <NavLink
                to="/product-sizes"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-zinc-900"
                  }`
                }
              >
                Product Sizes
              </NavLink>
            </div>
          )}
        </div>

        {/* 3. Category Dropdown */}
        <div>
          <button
            type="button"
            onClick={() => setCategoryOpen(!categoryOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all cursor-pointer ${
              categoryOpen ? "bg-zinc-900/90 text-amber-300 border border-zinc-800" : "hover:bg-zinc-900 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                C
              </span>
              <span className="font-semibold text-white">Categories</span>
            </div>
            {categoryOpen ? (
              <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>

          {categoryOpen && (
            <div className="ml-5 pl-4 border-l border-zinc-800 flex flex-col gap-1 my-1.5 text-xs">
              <NavLink
                to="/category-list"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-zinc-900"
                  }`
                }
              >
                Category List
              </NavLink>
              <NavLink
                to="/add-category"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-zinc-900"
                  }`
                }
              >
                Add Category
              </NavLink>
              <NavLink
                to="/sub-category-list"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-zinc-900"
                  }`
                }
              >
                Sub Category List
              </NavLink>
              <NavLink
                to="/add-sub-category"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition-colors ${
                    isActive
                      ? "text-amber-300 font-bold bg-amber-500/15 border border-amber-500/30"
                      : "text-gray-400 hover:text-gray-200 hover:bg-zinc-900"
                  }`
                }
              >
                Add Sub Category
              </NavLink>
            </div>
          )}
        </div>

        {/* 4. Orders */}
        <NavLink
          to="/orders"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z" />
            </svg>
            <span>Orders</span>
          </div>
        </NavLink>

        {/* 5. Reviews */}
        <NavLink
          to="/reviews"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <HiStar className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Product Reviews</span>
          </div>
        </NavLink>

        {/* 6. Users */}
        <NavLink
          to="/users"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
            </svg>
            <span>Users</span>
          </div>
        </NavLink>

        {/* 7. Newsletter Subscribers */}
        <NavLink
          to="/subscribers"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <HiOutlineEnvelopeOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Subscribers</span>
          </div>
        </NavLink>

        {/* 8. Hero Banners & Video Studio */}
        <NavLink
          to="/banners"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <HiOutlineFilm className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Hero Videos / Banners</span>
          </div>
        </NavLink>

        {/* 9. About Lookbook Studio */}
        <NavLink
          to="/about-cms"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <HiOutlineBookOpen className="w-5 h-5 text-amber-400 shrink-0" />
            <span>About Studio</span>
          </div>
        </NavLink>

        {/* 10. Contact Manager */}
        <NavLink
          to="/contact-cms"
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 ${
              isActive
                ? "bg-amber-500/15 text-amber-300 border border-amber-500/40 font-bold shadow-md shadow-amber-950/30"
                : "hover:bg-zinc-900 hover:text-white"
            }`
          }
        >
          <div className="flex items-center gap-3">
            <HiOutlinePhone className="w-5 h-5 text-amber-400 shrink-0" />
            <span>Contact Manager</span>
          </div>
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
