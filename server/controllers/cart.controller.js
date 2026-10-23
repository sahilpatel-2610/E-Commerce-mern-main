import {
  getFirestoreDoc,
  updateFirestoreDocFields,
} from "../config/firebase.js";

// 1. Add product to user cart
export const addToCart = async (req, res) => {
  try {
    const { userId, itemId, size } = req.body;
    if (!userId || !itemId) {
      return res.json({ success: false, message: "User ID and Item ID required" });
    }

    const userData = await getFirestoreDoc("users", userId);
    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    let cartData = userData.cartData || {};
    if (typeof cartData !== "object" || Array.isArray(cartData)) cartData = {};

    const szKey = size || "default";

    if (cartData[itemId]) {
      if (cartData[itemId][szKey]) {
        cartData[itemId][szKey] += 1;
      } else {
        cartData[itemId][szKey] = 1;
      }
    } else {
      cartData[itemId] = {};
      cartData[itemId][szKey] = 1;
    }

    await updateFirestoreDocFields("users", userId, { cartData });

    return res.json({ success: true, message: "Added to cart" });
  } catch (error) {
    console.error("addToCart error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 2. Update user cart
export const updateCart = async (req, res) => {
  try {
    const { userId, itemId, size, quantity } = req.body;
    if (!userId || !itemId) {
      return res.json({ success: false, message: "User ID and Item ID required" });
    }

    const userData = await getFirestoreDoc("users", userId);
    if (!userData) {
      return res.json({ success: false, message: "User not found" });
    }

    let cartData = userData.cartData || {};
    if (typeof cartData !== "object" || Array.isArray(cartData)) cartData = {};

    const szKey = size || "default";
    if (!cartData[itemId]) cartData[itemId] = {};

    if (quantity <= 0) {
      delete cartData[itemId][szKey];
      if (Object.keys(cartData[itemId]).length === 0) {
        delete cartData[itemId];
      }
    } else {
      cartData[itemId][szKey] = quantity;
    }

    await updateFirestoreDocFields("users", userId, { cartData });

    return res.json({ success: true, message: "Cart Updated" });
  } catch (error) {
    console.error("updateCart error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 3. Get userCart data
export const getUserCart = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.json({ success: false, message: "User ID required" });
    }

    const userData = await getFirestoreDoc("users", userId);
    const cartData = (userData && userData.cartData) || {};

    return res.json({ success: true, cartData });
  } catch (error) {
    console.error("getUserCart error:", error);
    return res.json({ success: false, message: error.message });
  }
};
