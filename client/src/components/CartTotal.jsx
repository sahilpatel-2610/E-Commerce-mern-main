import React from "react";
import { useShopContext } from "../context/ShopContext";
import Title from "./Title";
import { RiShieldCheckLine, RiTruckLine } from "react-icons/ri";

function CartTotal() {
  const { currency, delivery_fee, getCartAmount } = useShopContext();
  const subtotal = getCartAmount();
  const shipping = subtotal === 0 ? 0 : delivery_fee;
  const grandTotal = subtotal === 0 ? 0 : subtotal + shipping;

  return (
    <div className="w-full bg-zinc-900/70 border border-zinc-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl select-none">
      <div className="flex items-center justify-between mb-4 border-b border-zinc-800/80 pb-3">
        <div className="text-xl font-bold">
          <Title text1={"ORDER"} text2={"SUMMARY"} />
        </div>
        <span className="text-xs font-mono px-2.5 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/30">
          VRAJ CHECKOUT
        </span>
      </div>

      <div className="flex flex-col gap-3 text-sm text-gray-300">
        <div className="flex justify-between items-center py-1">
          <span className="text-gray-400">Subtotal</span>
          <span className="font-medium text-white font-mono">
            {currency}{subtotal.toLocaleString()}.00
          </span>
        </div>

        <div className="flex justify-between items-center py-1">
          <span className="text-gray-400 flex items-center gap-1.5">
            <span>Shipping & Handling</span>
            {shipping === 0 && subtotal > 0 && (
              <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                Free
              </span>
            )}
          </span>
          <span className="font-medium text-white font-mono">
            {shipping === 0 ? "FREE" : `${currency}${shipping}.00`}
          </span>
        </div>

        <div className="border-t border-zinc-800 my-1"></div>

        <div className="flex justify-between items-center pt-1 text-base sm:text-lg">
          <span className="font-bold text-white">Grand Total</span>
          <span className="font-black text-amber-400 text-xl font-mono">
            {currency}{grandTotal.toLocaleString()}.00
          </span>
        </div>
      </div>

      {/* Trust guarantees */}
      <div className="mt-5 pt-4 border-t border-zinc-800/80 flex flex-col gap-2 text-xs text-gray-400">
        <div className="flex items-center gap-2 text-zinc-400">
          <RiTruckLine className="text-amber-400 text-base shrink-0" />
          <span>Complimentary Express Shipping Across India</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-400">
          <RiShieldCheckLine className="text-amber-400 text-base shrink-0" />
          <span>100% Genuine Certified Quality Assurance</span>
        </div>
      </div>
    </div>
  );
}

export default CartTotal;
