import React from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/admin_assets/assets";

function BrandLogo({ className = "", to = "/dashboard", showAdminBadge = false, imgClassName = "" }) {
  const logoContent = (
    <div className={`inline-flex items-center justify-center select-none ${className}`}>
      <img
        src={assets.logo}
        alt="Vraj Creation"
        className={imgClassName || "h-16 sm:h-18 md:h-22 w-auto object-contain transition-transform duration-200 hover:scale-105 drop-shadow-2xl"}
      />
      {showAdminBadge && (
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 shadow-sm ml-2">
          Admin
        </span>
      )}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center justify-center">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

export default BrandLogo;
