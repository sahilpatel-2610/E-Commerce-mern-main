import React from "react";
import { useShopContext } from "../context/ShopContext";
import { Link } from "react-router-dom";
import { assets } from "../assets/frontend_assets/assets";

function ProductItems({
  id,
  image,
  images,
  name,
  price,
  oldPrice,
  discount,
  brand,
  category,
  rating,
}) {
  const { currency } = useShopContext();

  const isHexId = (str) =>
    typeof str === "string" && /^[0-9a-fA-F]{24}$/.test(str.trim());

  const getImgSrc = () => {
    if (
      Array.isArray(image) &&
      image.length > 0 &&
      typeof image[0] === "string" &&
      image[0].trim()
    ) {
      return image[0];
    }
    if (
      Array.isArray(images) &&
      images.length > 0 &&
      typeof images[0] === "string" &&
      images[0].trim()
    ) {
      return images[0];
    }
    if (typeof image === "string" && image.trim()) {
      return image;
    }
    if (typeof images === "string" && images.trim()) {
      return images;
    }
    return assets.p_img1;
  };

  const imgSrc = getImgSrc();

  const numPrice = Number(price) || 0;
  const numOldPrice = Number(oldPrice) || 0;

  const discountPercent =
    discount ||
    (numOldPrice > numPrice
      ? Math.round(((numOldPrice - numPrice) / numOldPrice) * 100)
      : null);

  const cleanBrand = brand && !isHexId(brand) ? brand.trim() : null;
  let displayCategory = "";
  if (category && typeof category === "object" && category.name && !isHexId(category.name)) {
    displayCategory = category.name;
  } else if (typeof category === "string" && category.trim() && !isHexId(category)) {
    displayCategory = category.trim();
  } else if (cleanBrand) {
    displayCategory = cleanBrand;
  }

  const formattedPrice = numPrice.toLocaleString("en-IN");
  const formattedOldPrice =
    numOldPrice > numPrice ? numOldPrice.toLocaleString("en-IN") : null;

  return (
    <Link
      to={`/product/${id}`}
      className="group bg-[#0f0f11] hover:bg-[#141417] border border-[#222225] hover:border-[#38383c] rounded-2xl p-3 transition-all duration-300 hover:shadow-xl hover:shadow-black/70 hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer relative"
    >
      {/* 1. Image Container */}
      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-[#18181a] flex items-center justify-center p-1 border border-[#222225] group-hover:border-[#38383c] transition-colors">
        {/* Soft Muted Discount Badge (Not Stark White) */}
        {discountPercent > 0 && (
          <span className="absolute top-2 left-2 bg-[#202024]/90 backdrop-blur-md border border-[#333338] text-gray-300 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm z-10">
            {discountPercent}% OFF
          </span>
        )}

        {/* Product Image */}
        <img
          src={imgSrc}
          className="w-full h-full object-cover rounded-lg group-hover:scale-105 transition-transform duration-500 ease-out"
          alt={name}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = assets.p_img1;
          }}
        />

        {/* Subtle Quick View Overlay */}
        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl">
          <span className="px-3 py-1.5 bg-[#1a1a1e]/90 backdrop-blur-md text-gray-200 text-[11px] font-medium rounded-lg border border-[#333338] shadow-md transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
            View Details ↗
          </span>
        </div>
      </div>

      {/* 2. Product Details Body (Pleasant Muted Silver / Soft Light Gray) */}
      <div className="pt-3 flex flex-col justify-between flex-1 space-y-1.5">
        <div>
          {/* Dynamic Category (only rendered if present) */}
          {displayCategory && (
            <p className="text-[11px] font-normal text-amber-400/80 capitalize truncate tracking-wide">
              {displayCategory}
            </p>
          )}

          {/* Product Title in Soft Muted Light Gray (Not Harsh Pure White) */}
          <h3 className="text-xs sm:text-sm font-medium text-gray-300 group-hover:text-white line-clamp-1 transition-colors capitalize mt-0.5">
            {name}
          </h3>

          {/* Rating Pill */}
          <div className="flex items-center gap-1.5 mt-1">
            <div className="flex items-center text-amber-400 text-xs">
              <span>★</span>
              <span className="text-[11px] font-medium text-gray-400 ml-1">
                {rating ? Number(rating).toFixed(1) : "5.0"}
              </span>
            </div>
            <span className="text-[10px] text-gray-600 font-normal">
              (Reviews)
            </span>
          </div>
        </div>

        {/* 3. Pricing Row in Balanced Soft Gray-White */}
        <div className="pt-2 border-t border-[#222225] flex items-baseline gap-2 mt-auto">
          <span className="text-sm sm:text-base font-semibold text-gray-200 group-hover:text-white transition-colors">
            {currency}{formattedPrice}
          </span>
          {formattedOldPrice && (
            <span className="text-xs text-gray-600 line-through font-normal">
              {currency}{formattedOldPrice}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default ProductItems;
