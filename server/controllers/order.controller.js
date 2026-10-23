import {
  getFirestoreDocs,
  getFirestoreDoc,
  setFirestoreDoc,
  addFirestoreDoc,
  updateFirestoreDocFields,
  deleteFirestoreDoc,
  broadcastAdminNotification,
} from "../config/firebase.js";

// 1. Placing order using COD
export const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address, phone, platform, source, customerName, name } = req.body;

    const orderData = {
      userId: userId || "",
      customerName: customerName || name || address?.fullName || (address?.firstName ? `${address.firstName} ${address.lastName || ""}`.trim() : "Customer"),
      name: customerName || name || address?.fullName || (address?.firstName ? `${address.firstName} ${address.lastName || ""}`.trim() : "Customer"),
      items: Array.isArray(items) ? items : [],
      amount: Number(amount) || 0,
      address: address || {},
      phone: phone || address?.phone || "",
      status: "Order Placed",
      paymentMethod: req.body.paymentMethod || "COD",
      payment: false,
      platform: platform || source || "Web Storefront",
      source: source || platform || "Web Storefront",
      date: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const newOrder = await addFirestoreDoc("orders", orderData, "ord");

    // Clear user cart if userId exists
    if (userId) {
      try {
        await updateFirestoreDocFields("users", userId, { cartData: {} });
      } catch (e) {
        console.log("Could not clear user cart:", e.message);
      }
    }

    return res.json({
      success: true,
      message: "Order Placed Successfully in Firebase",
      order: newOrder,
    });
  } catch (error) {
    console.error("placeOrder error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 2. Placing order using Stripe
export const placeOrderStrip = async (req, res) => {
  try {
    const { userId, items, amount, address, platform, source, customerName, name } = req.body;
    const { origin } = req.headers;

    const orderData = {
      userId: userId || "",
      customerName: customerName || name || address?.fullName || (address?.firstName ? `${address.firstName} ${address.lastName || ""}`.trim() : "Customer"),
      name: customerName || name || address?.fullName || (address?.firstName ? `${address.firstName} ${address.lastName || ""}`.trim() : "Customer"),
      items: Array.isArray(items) ? items : [],
      amount: Number(amount) || 0,
      address: address || {},
      status: "Order Placed",
      paymentMethod: req.body.paymentMethod || "STRIPE (CARD)",
      payment: true,
      platform: platform || source || "Web Storefront",
      source: source || platform || "Web Storefront",
      date: Date.now(),
      createdAt: new Date().toISOString(),
    };

    const newOrder = await addFirestoreDoc("orders", orderData, "ord");

    return res.json({
      success: true,
      message: "Stripe order initiated",
      session_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
      orderId: newOrder._id,
    });
  } catch (error) {
    console.error("placeOrderStrip error:", error);
    return res.json({ success: false, message: error.message });
  }
};
export const placeOrderStripe = placeOrderStrip;

// 3. Verify Stripe
export const verifyStripe = async (req, res) => {
  try {
    const { orderId, success, userId } = req.body;

    if (success === "true" || success === true) {
      if (orderId) {
        await updateFirestoreDocFields("orders", orderId, { payment: true, status: "Packing" });
      }
      if (userId) {
        await updateFirestoreDocFields("users", userId, { cartData: {} });
      }
      return res.json({ success: true, message: "Payment verified successfully" });
    } else {
      if (orderId) {
        await deleteFirestoreDoc("orders", orderId);
      }
      return res.json({ success: false, message: "Payment Failed" });
    }
  } catch (error) {
    console.error("verifyStripe error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 4. All Orders (Admin)
export const allOrders = async (req, res) => {
  try {
    const orders = await getFirestoreDocs("orders", 500);
    // Sort by date descending
    const sorted = [...orders].sort(
      (a, b) => (Number(b.date) || 0) - (Number(a.date) || 0)
    );
    return res.json({ success: true, orders: sorted });
  } catch (error) {
    console.error("allOrders error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 5. User Orders
export const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.json({ success: false, message: "User ID required" });
    }

    const all = await getFirestoreDocs("orders", 500);
    const filtered = all
      .filter((o) => String(o.userId) === String(userId))
      .sort((a, b) => (Number(b.date) || 0) - (Number(a.date) || 0));

    return res.json({ success: true, orders: filtered });
  } catch (error) {
    console.error("userOrders error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 6. Update Status (Admin)
export const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    if (!orderId || !status) {
      return res.json({ success: false, message: "orderId and status required" });
    }

    const updated = await updateFirestoreDocFields("orders", orderId, {
      status,
      updatedAt: new Date().toISOString(),
    });

    // Broadcast Live Notification to Mobile Flutter App
    let iconEmoji = "🚚";
    if (status === "Delivered") iconEmoji = "🎉";
    if (status === "Shipped") iconEmoji = "✈️";
    if (status === "Cancelled") iconEmoji = "❌";

    const shortId = orderId.length > 10 ? orderId.substring(0, 10) : orderId;
    broadcastAdminNotification({
      title: `${iconEmoji} ORDER STATUS UPDATED`,
      message: `Your Order #${shortId} status has been updated to "${status}".`,
      type: "order",
      data: { orderId, status },
    });

    return res.json({
      success: true,
      message: "Order Status Updated in Firebase",
      order: updated,
    });
  } catch (error) {
    console.error("updateStatus error:", error);
    return res.json({ success: false, message: error.message });
  }
};
