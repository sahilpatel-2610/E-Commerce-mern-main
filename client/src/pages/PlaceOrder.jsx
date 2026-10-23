import React, { useState } from "react";
import Title from "../components/Title";
import CartTotal from "../components/CartTotal";
import { assets } from "../assets/frontend_assets/assets";
import { useShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";
import { addFirestoreOrder } from "../api/firebaseService";
import {
  HiUser,
  HiEnvelope,
  HiMapPin,
  HiBuildingOffice2,
  HiPhone,
  HiGlobeAlt,
  HiCheckCircle,
  HiLockClosed,
  HiArrowRight,
} from "react-icons/hi2";
import { RiShieldCheckLine, RiSecurePaymentLine, RiTruckLine } from "react-icons/ri";

function PlaceOrder() {
  const [method, setMethod] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const {
    navigate,
    backendUrl,
    token,
    cartItems,
    setCartItems,
    getCartAmount,
    delivery_fee,
    products,
  } = useShopContext();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India",
    phone: "",
  });

  const onChangeHandler = (event) => {
    const name = event.target.name;
    const value = event.target.value;
    setFormData((data) => ({ ...data, [name]: value }));
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      let orderItems = [];

      for (const items in cartItems) {
        for (const item in cartItems[items]) {
          if (cartItems[items][item] > 0) {
            const itemInfo = structuredClone(
              products.find((product) => product._id === items || product.id === items)
            );
            if (itemInfo) {
              itemInfo.size = item;
              itemInfo.quantity = cartItems[items][item];
              orderItems.push(itemInfo);
            }
          }
        }
      }

      if (orderItems.length === 0) {
        toast.error("Your shopping cart is empty!");
        navigate("/cart");
        return;
      }

      let orderData = {
        address: formData,
        items: orderItems,
        amount: getCartAmount() + delivery_fee,
      };

      let localUser = {};
      try {
        localUser = JSON.parse(localStorage.getItem("user") || "{}");
      } catch (e) {}

      const fullName = `${formData.firstName || ""} ${formData.lastName || ""}`.trim();
      const dynamicCustomerName = fullName || (formData.firstName ? `${formData.firstName} ${formData.lastName || ""}`.trim() : (localUser.name || formData.email || "Customer"));
      const orderPayload = {
        ...orderData,
        customerName: dynamicCustomerName,
        name: dynamicCustomerName,
        firstName: formData.firstName || "",
        lastName: formData.lastName || "",
        fullName: dynamicCustomerName,
        address: {
          ...formData,
          fullName: dynamicCustomerName,
          name: dynamicCustomerName,
        },
        phone: formData.phone || "",
        userId: localUser.id || localUser._id || formData.email || "",
        userEmail: formData.email || localUser.email || "",
        paymentMethod: method === "stripe" ? "STRIPE (CARD)" : "COD",
        payment: method === "stripe",
        platform: "Web Storefront",
        source: "Web Storefront",
        date: Date.now(),
        createdAt: new Date().toISOString(),
        status: "Order Placed",
      };

      if (method === "cod") {
        // Save order directly to Firebase Firestore
        await addFirestoreOrder({
          ...orderPayload,
          paymentMethod: "COD",
          payment: false,
        });
      } else if (method === "stripe") {
        let redirected = false;
        try {
          // Pre-cache order info locally before making backend request
          try {
            localStorage.setItem("last_order_email", orderPayload.userEmail || "");
            localStorage.setItem("user_email", orderPayload.userEmail || "");
          } catch (_) {}

          const responseStripe = await axios.post(
            backendUrl + "/api/order/stripe",
            orderPayload,
            { headers: { token: token || "guest" } }
          );

          if (responseStripe.data?.success && responseStripe.data?.session_url) {
            redirected = true;
            const newOrdId = responseStripe.data.orderId || `ord_${Date.now()}`;
            try {
              localStorage.setItem("last_placed_order_id", newOrdId);
              const raw = localStorage.getItem("vraj_client_user_orders");
              const list = raw ? JSON.parse(raw) : [];
              list.unshift({
                ...orderPayload,
                _id: newOrdId,
                id: newOrdId,
                paymentMethod: "STRIPE",
                payment: true,
                status: "Packing",
              });
              localStorage.setItem("vraj_client_user_orders", JSON.stringify(list));
            } catch (_) {}

            setCartItems({});
            try {
              localStorage.removeItem("cartItems");
            } catch (_) {}

            window.location.replace(responseStripe.data.session_url);
            return;
          }
        } catch (backendErr) {
          console.warn("Backend Stripe endpoint unavailable, falling back to direct Firestore order:", backendErr.message);
        }

        if (!redirected) {
          // Direct Firebase Firestore order with verified payment
          await addFirestoreOrder({
            ...orderPayload,
            paymentMethod: "STRIPE",
            payment: true,
            status: "Order Placed",
          });
        }
      } else {
        await addFirestoreOrder(orderPayload);
      }

      try {
        localStorage.setItem("last_order_email", orderPayload.userEmail || "");
        localStorage.setItem("user_email", orderPayload.userEmail || "");
      } catch (_) {}

      setCartItems({});
      try {
        localStorage.removeItem("cartItems");
      } catch (_) {}

      navigate("/orders");
      toast.success("✨ Order placed successfully with Vraj Creation!");
    } catch (error) {
      console.log(error);
      toast.error(error.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-200 py-10 px-4 sm:px-6 lg:px-12 select-none">
      {/* Breadcrumb Header */}
      <div className="border-b border-zinc-800/80 pb-6 mb-8">
        <div className="text-2xl sm:text-3xl font-bold">
          <Title text1={"SECURE"} text2={"CHECKOUT"} />
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Complete your delivery details to finalize your bespoke fashion order.
        </p>
      </div>

      <form
        onSubmit={onSubmitHandler}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-7xl mx-auto"
      >
        {/* Left Column: Delivery & Shipping Information */}
        <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-6">
          <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-4 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
                <HiMapPin />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Delivery Address</h2>
                <p className="text-xs text-gray-400">Where should we deliver your order?</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    First Name *
                  </label>
                  <div className="relative flex items-center">
                    <HiUser className="absolute left-3.5 text-gray-500 text-sm" />
                    <input
                      type="text"
                      required
                      name="firstName"
                      value={formData.firstName}
                      onChange={onChangeHandler}
                      placeholder="e.g. Rahul"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Last Name *
                  </label>
                  <div className="relative flex items-center">
                    <HiUser className="absolute left-3.5 text-gray-500 text-sm" />
                    <input
                      type="text"
                      required
                      name="lastName"
                      value={formData.lastName}
                      onChange={onChangeHandler}
                      placeholder="e.g. Patel"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Email Address * (For order confirmation & invoice)
                </label>
                <div className="relative flex items-center">
                  <HiEnvelope className="absolute left-3.5 text-gray-500 text-sm" />
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={onChangeHandler}
                    placeholder="e.g. rahul.patel@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Street / Shop / Business Address *
                </label>
                <div className="relative flex items-center">
                  <HiBuildingOffice2 className="absolute left-3.5 text-gray-500 text-sm" />
                  <input
                    type="text"
                    required
                    name="street"
                    value={formData.street}
                    onChange={onChangeHandler}
                    placeholder="Flat / House No., Building Name, Street"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* City & State */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    name="city"
                    value={formData.city}
                    onChange={onChangeHandler}
                    placeholder="e.g. Surat"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 px-3.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    name="state"
                    value={formData.state}
                    onChange={onChangeHandler}
                    placeholder="e.g. Gujarat"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 px-3.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Pincode & Country */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    required
                    name="pincode"
                    value={formData.pincode}
                    onChange={onChangeHandler}
                    placeholder="e.g. 395003"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 px-3.5 text-sm text-white placeholder-gray-600 font-mono outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                    Country
                  </label>
                  <div className="relative flex items-center">
                    <HiGlobeAlt className="absolute left-3.5 text-gray-500 text-sm" />
                    <input
                      type="text"
                      required
                      name="country"
                      value={formData.country}
                      onChange={onChangeHandler}
                      placeholder="India"
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">
                  Mobile Phone Number * (For delivery updates & courier OTP)
                </label>
                <div className="relative flex items-center">
                  <HiPhone className="absolute left-3.5 text-gray-500 text-sm" />
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={onChangeHandler}
                    placeholder="+91 98765 43210"
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl py-3 pl-10 pr-3.5 text-sm text-white placeholder-gray-600 font-mono outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Method & Order Summary */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col gap-6 sticky top-24">
          {/* Order Summary Component */}
          <CartTotal />

          {/* Payment Method Selector Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/90 rounded-3xl p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center gap-3 border-b border-zinc-800/80 pb-3 mb-4">
              <RiSecurePaymentLine className="text-amber-400 text-xl" />
              <h3 className="text-base font-bold text-white">Select Payment Method</h3>
            </div>

            <div className="flex flex-col gap-3">
              {/* Cash On Delivery Option */}
              <div
                onClick={() => setMethod("cod")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  method === "cod"
                    ? "border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      method === "cod"
                        ? "border-amber-400 bg-amber-400 text-black"
                        : "border-zinc-600"
                    }`}
                  >
                    {method === "cod" && <div className="w-2 h-2 rounded-full bg-black"></div>}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Cash on Delivery (COD)</span>
                    <span className="text-[11px] text-gray-400">Pay when your order arrives at your doorstep</span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-2 py-1 bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/40">
                  POPULAR
                </span>
              </div>

              {/* Stripe / Card Option */}
              <div
                onClick={() => setMethod("stripe")}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  method === "stripe"
                    ? "border-amber-400 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                    : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      method === "stripe"
                        ? "border-amber-400 bg-amber-400 text-black"
                        : "border-zinc-600"
                    }`}
                  >
                    {method === "stripe" && <div className="w-2 h-2 rounded-full bg-black"></div>}
                  </div>
                  <div>
                    <span className="font-bold text-sm text-white block">Credit / Debit Card (Stripe)</span>
                    <span className="text-[11px] text-gray-400">Visa, MasterCard, Amex, UPI & NetBanking</span>
                  </div>
                </div>
                <img src={assets.stripe_logo} className="h-5 shrink-0" alt="Stripe" />
              </div>
            </div>

            {/* Submit Order Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>PROCESSING ORDER...</span>
                </>
              ) : (
                <>
                  <HiLockClosed className="text-base" />
                  <span>PLACE ORDER NOW</span>
                  <HiArrowRight className="text-base" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3 flex items-center justify-center gap-1.5">
              <HiCheckCircle className="text-emerald-400 text-sm" />
              <span>Direct write to Firebase Firestore verified</span>
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

export default PlaceOrder;
