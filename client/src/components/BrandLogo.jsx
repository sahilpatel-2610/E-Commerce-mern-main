import React from "react";
import { Link } from "react-router-dom";
import { assets } from "../assets/frontend_assets/assets";

function BrandLogo({ className = "", to = "/" }) {
  const logoContent = (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src={assets.logo}
        alt="Vraj Creation"
        className="h-20 sm:h-24 md:h-28 w-auto object-contain transition-transform duration-200 hover:scale-105 drop-shadow-lg"
      />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}

export default BrandLogo;
