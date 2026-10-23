import React, { useEffect, useState } from "react";
import { useShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";
import BrandLogo from "../components/BrandLogo";

import {
  registerFirestoreUser,
  loginFirestoreUser,
} from "../api/firebaseService";

function Login() {
  const [currentState, setCurrentState] = useState("Sign In");
  const { token, setToken, navigate } = useShopContext();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const backendUrl =
        import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

      if (currentState === "Sign Up") {
        // 1. Direct Firebase Firestore Registration
        const firestoreRes = await registerFirestoreUser({
          name,
          phone,
          email,
          password,
          platform: "Web Storefront",
        });

        // 2. Direct Backend Sync
        try {
          await axios.post(`${backendUrl}/api/user/register`, {
            name,
            phone,
            phoneNumber: phone,
            email,
            password,
            platform: "Web Storefront",
          });
        } catch (e) {}

        if (firestoreRes && firestoreRes.success) {
          toast.success("Account created successfully! Please Sign In.");
          setCurrentState("Sign In");
          setPassword("");
        } else {
          toast.error(firestoreRes?.message || "Failed to create account");
        }
      } else {
        // 1. Direct Firebase Firestore Login
        const firestoreLogin = await loginFirestoreUser({ email, password });
        if (firestoreLogin && firestoreLogin.success) {
          toast.success("Logged in successfully!");
          setToken(firestoreLogin.token);
          localStorage.setItem("token", firestoreLogin.token);
          if (firestoreLogin.user) {
            localStorage.setItem("user", JSON.stringify(firestoreLogin.user));
          }

          // Sync to Backend
          try {
            await axios.post(`${backendUrl}/api/user/register`, {
              name: firestoreLogin.user?.name || "Web Customer",
              phone: firestoreLogin.user?.phone || "",
              phoneNumber: firestoreLogin.user?.phone || "",
              email,
              password,
              platform: "Web Storefront",
            });
          } catch (e) {}

          window.scrollTo(0, 0);
          navigate("/");
          return;
        }

        // 2. Fallback to Backend API if available
        try {
          const { data } = await axios.post(`${backendUrl}/api/user/login`, {
            email,
            password,
          });
          if (data && data.success) {
            toast.success("Logged in successfully!");
            setToken(data.token);
            localStorage.setItem("token", data.token);
            if (data.user) {
              localStorage.setItem("user", JSON.stringify(data.user));
            }
            window.scrollTo(0, 0);
            navigate("/");
            return;
          }
        } catch (apiErr) {}

        toast.error(
          firestoreLogin?.message ||
            "Invalid email or password. Please check your credentials or Sign Up."
        );
      }
    } catch (error) {
      console.log("Auth error:", error);
      toast.error(error.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setPhone("");
    setEmail("");
    setPassword("");
    navigate("/");
  };

  useEffect(() => {
    if (token) {
      navigate("/");
    }
  }, [token, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 select-none relative">
      {/* Centered Auth Card in Luxury Dark Metallic Theme */}
      <div className="w-full max-w-md bg-zinc-950/90 border border-zinc-800/90 rounded-3xl p-7 sm:p-9 shadow-2xl backdrop-blur-xl space-y-6 relative overflow-hidden">
        {/* Subtle Ambient Shimmer */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 blur-3xl pointer-events-none rounded-full" />

        {/* Top Logo */}
        <div className="flex justify-center pt-1 pb-1">
          <BrandLogo />
        </div>

        {/* Title */}
        <div className="text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
            {currentState === "Sign In" ? "Sign In" : "Sign Up"}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {currentState === "Sign In"
              ? "Welcome back to Vraj Creation Wholesale Portal."
              : "Create your wholesale account to start ordering."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmitHandler} className="space-y-4">
          {currentState === "Sign In" ? (
            <>
              {/* Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/80 border-b-2 border-zinc-700 focus:border-amber-400 rounded-t-lg text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/80 border-b-2 border-zinc-700 focus:border-amber-400 rounded-t-lg text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Forgot Password */}
              <div className="text-left pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Please contact store support at +91 98765 43210 to reset your password.")
                  }
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Row 1: Name and Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-300">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900/80 border-b-2 border-zinc-700 focus:border-amber-400 rounded-t-lg text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-300">
                    Phone No. *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-900/80 border-b-2 border-zinc-700 focus:border-amber-400 rounded-t-lg text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Row 2: Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/80 border-b-2 border-zinc-700 focus:border-amber-400 rounded-t-lg text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>

              {/* Row 3: Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-900/80 border-b-2 border-zinc-700 focus:border-amber-400 rounded-t-lg text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="text-left pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Please contact store support to reset your password.")
                  }
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors font-medium cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
            </>
          )}

          {/* Action Buttons in Luxury Gold & Amber Gradient */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
              ) : currentState === "Sign In" ? (
                "Sign In"
              ) : (
                "Sign Up"
              )}
            </button>

            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 py-3 px-5 rounded-xl border border-zinc-800 hover:bg-zinc-900 text-gray-300 hover:text-white font-bold text-xs transition-all duration-200 cursor-pointer text-center"
            >
              Cancel
            </button>
          </div>
        </form>

        {/* Switch Link */}
        <div className="text-left text-xs text-gray-400 pt-1">
          {currentState === "Sign In" ? (
            <p>
              Not Registered?{" "}
              <button
                type="button"
                onClick={() => setCurrentState("Sign Up")}
                className="text-amber-400 hover:text-amber-300 font-bold ml-1 cursor-pointer transition-colors"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setCurrentState("Sign In")}
                className="text-amber-400 hover:text-amber-300 font-bold ml-1 cursor-pointer transition-colors"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* Social Login Divider & Button */}
        <div className="space-y-3 pt-2 border-t border-zinc-800/80">
          <p className="text-center text-xs text-gray-400 font-medium">
            Or continue with social account
          </p>

          <button
            type="button"
            onClick={() => toast.info("Google Sign-In ready")}
            className="w-full py-2.5 bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Sign In With Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;
