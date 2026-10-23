import { createContext, useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { getFirestoreProducts } from "../api/firebaseService";

export const ShopContext = createContext();
export const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

const ShopContextProvider = (props) => {
  const currency = "₹";
  const delivery_fee = 60;

  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Initialize cart from localStorage so items are always instantly available
  const [cartItems, setCartItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem("cartItems");
      if (savedCart) return JSON.parse(savedCart);
    } catch (e) {}
    return {};
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem("token") || "";
  });
  const navigate = useNavigate();

  // Save cart to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem("cartItems", JSON.stringify(cartItems));
    } catch (e) {}
  }, [cartItems]);

  const addToCart = async (itemId, size) => {
    if (!size) {
      toast.error("Select Product Size");
      return;
    }
    setCartItems((prev) => {
      const cartData = structuredClone(prev);
      if (!cartData[itemId]) cartData[itemId] = {};
      cartData[itemId][size] = (cartData[itemId][size] || 0) + 1;
      return cartData;
    });

    if (token) {
      try {
        await api.post(
          "/api/cart/add",
          { itemId, size },
          { headers: { token } }
        );
      } catch (error) {
        console.log("Cart add sync notice:", error.message);
      }
    }
  };

  const getCartCount = () => {
    let totalCount = 0;
    for (const items in cartItems) {
      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0) {
            totalCount += cartItems[items][item];
          }
        } catch (error) {}
      }
    }
    return totalCount;
  };

  const updateQuantity = async (itemId, size, quantity) => {
    let cartData = structuredClone(cartItems);

    cartData[itemId][size] = quantity;
    setCartItems(cartData);

    if (token) {
      try {
        await api.post(
          "/api/cart/update",
          { itemId, size, quantity },
          { headers: { token } }
        );
      } catch (error) {
        console.log("Cart update sync notice:", error.message);
      }
    }
  };

  const getCartAmount = () => {
    let totalAmount = 0;

    for (const items in cartItems) {
      let itemInfo = products.find((product) => (product._id || product.id) === items);

      for (const item in cartItems[items]) {
        try {
          if (cartItems[items][item] > 0 && itemInfo) {
            totalAmount += itemInfo.price * cartItems[items][item];
          }
        } catch (error) {}
      }
    }
    return totalAmount;
  };

  const getProductData = async () => {
    try {
      // 1. Primary: Fetch directly from Firebase Firestore in real-time
      const firestoreProds = await getFirestoreProducts();
      if (Array.isArray(firestoreProds) && firestoreProds.length > 0) {
        setProducts(firestoreProds);
        return;
      }

      // 2. Direct Backend Sync
      const response = await api.get("/api/product/list");
      if (response.data && response.data.success) {
        setProducts(response.data.products || []);
      }
    } catch (error) {
      console.log("Error loading products:", error.message);
    }
  };

  const getUserCart = async (userToken) => {
    if (!userToken) return;
    try {
      const response = await api.post(
        "/api/cart/get",
        {},
        { headers: { token: userToken } }
      );

      if (response.data && response.data.success && response.data.cartData) {
        setCartItems(response.data.cartData);
      }
    } catch (error) {
      console.log("Cart fetch background sync notice:", error.message);
    }
  };

  useEffect(() => {
    getProductData();
    const handleFocus = () => {
      getProductData();
    };
    window.addEventListener("focus", handleFocus);

    // Real-time catalog sync with Firebase every 4 seconds
    const interval = setInterval(() => {
      getProductData();
    }, 4000);

    return () => {
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      getUserCart(savedToken);
    }
  }, []);

  const value = {
    products,
    getProductData,
    currency,
    delivery_fee,
    showSearch,
    setShowSearch,
    search,
    setSearch,
    cartItems,
    setCartItems,
    addToCart,
    getCartCount,
    updateQuantity,
    getCartAmount,
    navigate,
    backendUrl,
    token,
    setToken,
  };

  return (
    <ShopContext.Provider value={value}>{props.children}</ShopContext.Provider>
  );
};

export const useShopContext = () => {
  const context = useContext(ShopContext);
  return context;
};

export default ShopContextProvider;
