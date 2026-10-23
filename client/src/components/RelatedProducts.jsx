import React, { useEffect, useState } from "react";
import { useShopContext } from "../context/ShopContext";
import Title from "./Title";
import ProductItems from "./ProductItems";

function RelatedProducts({ category, subCategory, currentProductId }) {
  const { products } = useShopContext();
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (products.length > 0) {
      // Filter out current product first
      let pool = products.filter((item) => item._id !== currentProductId);

      let matched = [];
      if (category) {
        matched = pool.filter(
          (item) =>
            (typeof item.category === "string" &&
              item.category.toLowerCase() === String(category).toLowerCase()) ||
            (typeof item.category === "object" &&
              item.category?.name?.toLowerCase() === String(category).toLowerCase())
        );
      }

      if (subCategory && matched.length > 0) {
        const subMatched = matched.filter(
          (item) =>
            String(item.subCategory).toLowerCase() === String(subCategory).toLowerCase()
        );
        if (subMatched.length >= 4) {
          matched = subMatched;
        }
      }

      // If matched is less than 5, fill with remaining products from catalog
      if (matched.length < 5) {
        const remaining = pool.filter((item) => !matched.some((m) => m._id === item._id));
        matched = [...matched, ...remaining];
      }

      setRelated(matched.slice(0, 5));
    }
  }, [products, category, subCategory, currentProductId]);

  if (!related || related.length === 0) {
    return null;
  }

  return (
    <div className="my-20">
      <div className="text-center text-3xl py-2">
        <Title text1={"RELATED"} text2={"PRODUCTS"} />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6">
        {related.map((item, index) => (
          <ProductItems
            key={item._id || index}
            image={item.image}
            images={item.images}
            name={item.name}
            id={item._id}
            price={item.price}
            oldPrice={item.oldPrice}
            discount={item.discount}
            brand={item.brand}
            category={item.category || item.catName}
            rating={item.rating}
            bestseller={item.bestseller}
            sizes={item.sizes}
            productRam={item.productRam}
          />
        ))}
      </div>
    </div>
  );
}

export default RelatedProducts;
