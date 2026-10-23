import React, { useEffect, useState } from "react";
import { useShopContext } from "../context/ShopContext";
import Title from "../components/Title";
import { assets } from "../assets/frontend_assets/assets";
import CartTotal from "../components/CartTotal";
import { Link } from "react-router-dom";
import { HiOutlineTrash, HiPlus, HiMinus, HiShoppingBag, HiArrowRight, HiTag } from "react-icons/hi2";
import { RiShieldCheckLine, RiTruckLine, RiSecurePaymentLine } from "react-icons/ri";

function Cart() {
  const { products, currency, cartItems, updateQuantity, navigate } = useShopContext();
  const [cartData, setCartData] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);

  const getCartData = () => {
    const tempData = [];
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        if (cartItems[items][item] > 0) {
          tempData.push({
            _id: items,
            size: item,
            quantity: cartItems[items][item],
          });
        }
      }
    }
    setCartData(tempData);
  };

  useEffect(() => {
    if (products.length > 0) {
      getCartData();
    }
  }, [cartItems, products]);

  const totalItemsCount = cartData.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen text-gray-200 py-10 px-4 sm:px-6 lg:px-12 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6 mb-8">
        <div>
          <div className="text-2xl sm:text-3xl font-bold">
            <Title text1={"SHOPPING"} text2={"BAG"} />
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Review your selected bespoke apparel before proceeding to secure checkout.
          </p>
        </div>
        {totalItemsCount > 0 && (
          <span className="self-start sm:self-auto px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-2">
            <HiShoppingBag className="text-sm" />
            <span>{totalItemsCount} {totalItemsCount === 1 ? "Item" : "Items"} in Bag</span>
          </span>
        )}
      </div>

      {/* Main Cart Grid */}
      {cartData.length === 0 ? (
        /* Empty State */
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-8 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl backdrop-blur-xl">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-3xl mb-4 shadow-xl shadow-amber-500/10">
            <HiShoppingBag />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Your Shopping Bag is Empty</h2>
          <p className="text-sm text-gray-400 max-w-md mb-6">
            Looks like you haven't added any luxury pieces yet. Explore our curated collections to discover exceptional designs.
          </p>
          <Link
            to="/collection"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-extrabold text-sm uppercase tracking-wider shadow-lg hover:shadow-amber-500/25 hover:scale-105 transition-all flex items-center gap-2"
          >
            <span>Explore Collection</span>
            <HiArrowRight />
          </Link>
        </div>
      ) : (
        /* Items & Summary Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Cart Items List */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
            {cartData.map((item, index) => {
              const productData = products.find(
                (product) => product._id === item._id || product.id === item._id
              );
              if (!productData) return null;

              const imgSrc =
                (Array.isArray(productData.image) && productData.image[0]) ||
                (Array.isArray(productData.images) && productData.images[0]) ||
                productData.image ||
                assets.p_img1;

              const itemTotal = productData.price * item.quantity;

              return (
                <div
                  key={index}
                  className="bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:border-zinc-700 transition-all shadow-xl backdrop-blur-md group"
                >
                  {/* Product Info & Thumbnail */}
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <Link
                      to={`/product/${productData._id || productData.id}`}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 p-1 group-hover:border-amber-500/40 transition-colors relative"
                    >
                      <img
                        src={imgSrc}
                        className="w-full h-full object-cover rounded-xl"
                        alt={productData.name}
                        onError={(e) => {
                          e.target.src = assets.p_img1;
                        }}
                      />
                    </Link>

                    <div className="flex-1">
                      <Link
                        to={`/product/${productData._id || productData.id}`}
                        className="text-base sm:text-lg font-bold text-white hover:text-amber-400 transition-colors line-clamp-1"
                      >
                        {productData.name}
                      </Link>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {productData.category && (
                          <span className="text-[11px] uppercase px-2 py-0.5 rounded-md bg-zinc-800 text-gray-300 font-semibold border border-zinc-700">
                            {typeof productData.category === "object"
                              ? productData.category.name
                              : productData.category}
                          </span>
                        )}

                        {item.size && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            Size: {item.size}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-sm font-semibold text-gray-400">
                        Price:{" "}
                        <span className="text-white font-mono font-bold">
                          {currency}{productData.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controller & Price Total */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                    {/* Stepper Buttons */}
                    <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-xl p-1 gap-1">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, item.size, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-gray-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Decrease Quantity"
                      >
                        <HiMinus className="text-xs" />
                      </button>

                      <span className="w-9 text-center font-mono font-bold text-sm text-amber-400">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item._id, item.size, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-amber-400 text-gray-300 hover:text-black flex items-center justify-center transition-colors cursor-pointer"
                        title="Increase Quantity"
                      >
                        <HiPlus className="text-xs" />
                      </button>
                    </div>

                    {/* Total for this item */}
                    <div className="text-right min-w-[90px]">
                      <div className="text-[11px] text-gray-400">Item Total</div>
                      <div className="text-base sm:text-lg font-black text-amber-400 font-mono">
                        {currency}{itemTotal.toLocaleString()}.00
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => updateQuantity(item._id, item.size, 0)}
                      className="w-9 h-9 rounded-xl bg-zinc-950 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-zinc-800 hover:border-rose-500/40 flex items-center justify-center transition-all cursor-pointer"
                      title="Remove Item"
                    >
                      <HiOutlineTrash className="text-base" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Order Summary Sidebar */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5 sticky top-24">
            {/* Promo Code Input Card */}
            <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-5 shadow-xl backdrop-blur-xl">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <HiTag className="text-amber-400 text-sm" />
                <span>Have a Promo Code?</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon code..."
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase tracking-wider font-mono outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (promoCode.trim()) {
                      setPromoApplied(true);
                    }
                  }}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-amber-400 text-white hover:text-black font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0"
                >
                  APPLY
                </button>
              </div>
              {promoApplied && (
                <p className="text-[11px] text-emerald-400 font-semibold mt-2 flex items-center gap-1">
                  ✓ Promo coupon applied for checkout.
                </p>
              )}
            </div>

            {/* Cart Totals Component */}
            <CartTotal />

            {/* Checkout Action CTA Button */}
            <button
              type="button"
              onClick={() => cartData.length > 0 && navigate("/place-order")}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>PROCEED TO CHECKOUT</span>
              <HiArrowRight className="text-base" />
            </button>

            {/* Security Guarantee Box */}
            <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 flex items-center justify-around text-center text-gray-400 text-[11px]">
              <div className="flex flex-col items-center gap-1">
                <RiSecurePaymentLine className="text-amber-400 text-lg" />
                <span>256-Bit SSL Encrypted</span>
              </div>
              <div className="h-6 w-px bg-zinc-800"></div>
              <div className="flex flex-col items-center gap-1">
                <RiTruckLine className="text-amber-400 text-lg" />
                <span>Fast 24h Dispatch</span>
              </div>
              <div className="h-6 w-px bg-zinc-800"></div>
              <div className="flex flex-col items-center gap-1">
                <RiShieldCheckLine className="text-amber-400 text-lg" />
                <span>Buyer Protected</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cart;
