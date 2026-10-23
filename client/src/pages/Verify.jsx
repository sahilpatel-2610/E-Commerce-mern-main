import React, { useEffect } from "react";
import { useShopContext } from "../context/ShopContext";
import { useSearchParams } from "react-router-dom";
import api from "../api/api";
import { toast } from "react-toastify";
import { updateFirestoreOrderStatus } from "../api/firebaseService";

function Verify() {
  const { navigate, token, setCartItems } = useShopContext();
  const [searchParams] = useSearchParams();

  const success = searchParams.get("success");
  const orderId = searchParams.get("orderId");

  const verifyPayments = async () => {
    try {
      if (success === "true" || success === true) {
        if (orderId) {
          try {
            localStorage.setItem("last_placed_order_id", orderId);
            const raw = localStorage.getItem("vraj_client_user_orders");
            const list = raw ? JSON.parse(raw) : [];
            const existing = list.find((o) => (o._id || o.id) === orderId);
            if (existing) {
              existing.payment = true;
              existing.status = "Packing";
              localStorage.setItem("vraj_client_user_orders", JSON.stringify(list));
            }
          } catch (_) {}
        }

        // Try backend verification
        try {
          await api.post(
            "/api/order/verifyStripe",
            { success, orderId },
            { headers: { token: token || "guest" } }
          );
        } catch (_) {}

        // Also update Firestore directly
        if (orderId) {
          await updateFirestoreOrderStatus(orderId, "Packing").catch(() => {});
        }

        setCartItems({});
        try {
          localStorage.removeItem("cartItems");
        } catch (_) {}

        toast.success("✨ Payment verified successfully! Your order is placed.");
        navigate("/orders");
      } else {
        toast.error("Payment was cancelled or unsuccessful.");
        navigate("/cart");
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message || "Payment verification encountered an issue");
      navigate("/orders");
    }
  };

  useEffect(() => {
    verifyPayments();
  }, []);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-white space-y-4">
      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm font-bold text-amber-400">Verifying your secure payment...</p>
    </div>
  );
}

export default Verify;
