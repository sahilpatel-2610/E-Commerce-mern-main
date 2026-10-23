import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMobileNotifications } from "../api/firebase";
import { showToast } from "../utils/luxuryToast";

export const ShopContext = createContext();

export const ShopContextProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState({});
  const [wishlistItems, setWishlistItems] = useState({});
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const currency = "₹";
  const deliveryFee = 0;

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      const savedCart = await AsyncStorage.getItem("vraj_rn_cart");
      if (savedCart) setCartItems(JSON.parse(savedCart));

      const savedWishlist = await AsyncStorage.getItem("vraj_rn_wishlist");
      if (savedWishlist) setWishlistItems(JSON.parse(savedWishlist));

      const savedUser = await AsyncStorage.getItem("vraj_rn_active_user");
      if (savedUser) setUser(JSON.parse(savedUser));

      const notifs = await getMobileNotifications();
      setNotifications(notifs);
      setUnreadNotifCount(notifs.length);
    } catch (_) {}
  };

  const saveCart = async (newCart) => {
    try {
      await AsyncStorage.setItem("vraj_rn_cart", JSON.stringify(newCart));
    } catch (_) {}
  };

  const addToCart = (product, size = "M", qty = 1) => {
    const itemId = product._id || product.id;
    setCartItems((prev) => {
      const updated = { ...prev };
      if (!updated[itemId]) {
        updated[itemId] = {
          product,
          sizes: { [size]: qty },
        };
      } else {
        const curr = updated[itemId].sizes?.[size] || 0;
        updated[itemId].sizes = {
          ...(updated[itemId].sizes || {}),
          [size]: curr + qty,
        };
      }
      saveCart(updated);
      showToast(`${product.name} (${size}) added to your bag!`, "ADDED TO BAG", "success");
      return updated;
    });
  };

  const updateQuantity = (itemId, size, delta) => {
    setCartItems((prev) => {
      const updated = { ...prev };
      if (!updated[itemId] || !updated[itemId].sizes) return prev;

      const next = (updated[itemId].sizes[size] || 0) + delta;
      if (next <= 0) {
        delete updated[itemId].sizes[size];
        if (Object.keys(updated[itemId].sizes).length === 0) {
          delete updated[itemId];
        }
      } else {
        updated[itemId].sizes[size] = next;
      }
      saveCart(updated);
      return updated;
    });
  };

  const removeFromCart = (itemId, size) => {
    setCartItems((prev) => {
      const updated = { ...prev };
      if (updated[itemId]?.sizes?.[size]) {
        delete updated[itemId].sizes[size];
        if (Object.keys(updated[itemId].sizes).length === 0) {
          delete updated[itemId];
        }
      }
      saveCart(updated);
      showToast("Item removed from bag", "BAG UPDATED", "info");
      return updated;
    });
  };

  const clearCart = () => {
    setCartItems({});
    saveCart({});
  };

  const getCartCount = () => {
    let count = 0;
    for (const id in cartItems) {
      for (const size in cartItems[id]?.sizes || {}) {
        count += cartItems[id].sizes[size];
      }
    }
    return count;
  };

  const getCartTotal = () => {
    let total = 0;
    for (const id in cartItems) {
      const p = cartItems[id]?.product;
      const price = Number(p?.price) || 0;
      for (const size in cartItems[id]?.sizes || {}) {
        total += price * cartItems[id].sizes[size];
      }
    }
    return total;
  };

  const toggleWishlist = (product) => {
    const pId = product._id || product.id;
    setWishlistItems((prev) => {
      const updated = { ...prev };
      if (updated[pId]) {
        delete updated[pId];
        showToast(`${product.name} removed from Wishlist`, "WISHLIST", "info");
      } else {
        updated[pId] = product;
        showToast(`${product.name} added to Wishlist!`, "WISHLIST", "success");
      }
      AsyncStorage.setItem("vraj_rn_wishlist", JSON.stringify(updated));
      return updated;
    });
  };

  const isInWishlist = (productId) => !!wishlistItems[productId];

  const loginUser = (userData) => {
    setUser(userData);
    AsyncStorage.setItem("vraj_rn_active_user", JSON.stringify(userData));
    showToast(`Welcome, ${userData.name}!`, "AUTHENTICATED", "success");
  };

  const logoutUser = () => {
    setUser(null);
    AsyncStorage.removeItem("vraj_rn_active_user");
    showToast("Signed out successfully", "ACCOUNT", "info");
  };

  const markNotificationsRead = () => {
    setUnreadNotifCount(0);
  };

  return (
    <ShopContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCartCount,
        getCartTotal,
        currency,
        deliveryFee,
        wishlistItems,
        toggleWishlist,
        isInWishlist,
        user,
        loginUser,
        logoutUser,
        notifications,
        unreadNotifCount,
        markNotificationsRead,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShopContext = () => useContext(ShopContext);
