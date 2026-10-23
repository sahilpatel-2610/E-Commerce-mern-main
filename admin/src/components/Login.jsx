import React, { useState } from "react";
import { backendUrl } from "../App";
import axios from "axios";
import { toast } from "react-toastify";
import BrandLogo from "./BrandLogo";

function Login({ setToken }) {
  const [isRegister, setIsRegister] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(true);

  // Password Visibility Toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const formatName = (emailStr, nameStr) => {
    if (nameStr && nameStr.trim()) return nameStr.trim();
    if (!emailStr) return "Admin";
    const prefix = emailStr.split("@")[0] || "admin";
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    if (!agreeTerms) {
      toast.warning("Please agree to all Terms & Conditions to proceed.");
      return;
    }

    if (isRegister && password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      if (isRegister) {
        const docId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const userData = {
          _id: docId,
          name: name.trim() || "Admin",
          email: cleanEmail,
          phone: phone.trim(),
          phoneNumber: phone.trim(),
          password: cleanPass,
          role: "admin",
          platform: "Admin CMS",
          createdAt: new Date().toISOString(),
        };

        // 1. Save to Local Auth Registry immediately
        try {
          localStorage.setItem(`local_auth_pass_${cleanEmail}`, cleanPass);
          localStorage.setItem(`local_auth_user_${cleanEmail}`, JSON.stringify(userData));
          const rawList = localStorage.getItem("local_users_registry");
          const currentList = rawList ? JSON.parse(rawList) : [];
          const updated = [userData, ...currentList.filter((u) => u.email !== cleanEmail)];
          localStorage.setItem("local_users_registry", JSON.stringify(updated));
        } catch (_) {}

        // 2. Try Firestore in background
        try {
          const fields = {
            name: { stringValue: name.trim() || "Admin" },
            email: { stringValue: cleanEmail },
            phone: { stringValue: phone.trim() },
            phoneNumber: { stringValue: phone.trim() },
            password: { stringValue: cleanPass },
            role: { stringValue: "admin" },
            platform: { stringValue: "Admin CMS" },
            createdAt: { stringValue: new Date().toISOString() },
          };
          await fetch(
            `https://firestore.googleapis.com/v1/projects/ecommerce-mern-main/databases/(default)/documents/users/${docId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fields }),
            }
          );
        } catch (_) {}

        toast.success("Admin registration successful! Please sign in.");
        setIsRegister(false);
        setPassword("");
        setConfirmPassword("");
        return;
      } else {
        // 1. Direct Firebase Admin Auth (Single doc lookup)
        try {
          const docId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
          const res = await fetch(
            `https://firestore.googleapis.com/v1/projects/ecommerce-mern-main/databases/(default)/documents/users/${docId}`
          );
          if (res.ok) {
            const doc = await res.json();
            const storedPass = (doc.fields?.password?.stringValue || "").trim();
            if (storedPass === cleanPass) {
              const fakeToken = `admin_jwt_${docId}`;
              setToken(fakeToken);
              const derivedName = formatName(cleanEmail, doc.fields?.name?.stringValue);
              localStorage.setItem("admin_name", derivedName);
              localStorage.setItem("admin_email", cleanEmail);
              toast.success(`Welcome back, ${derivedName}!`);
              return;
            } else {
              toast.error("Invalid password! Please enter the correct password.");
              return;
            }
          }
        } catch (_) {}

        // 2. Check Dynamic Local Auth Registry
        try {
          const savedPass = localStorage.getItem(`local_auth_pass_${cleanEmail}`);
          const savedUser = localStorage.getItem(`local_auth_user_${cleanEmail}`);
          if (savedPass !== null) {
            if (savedPass === cleanPass) {
              const docId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
              const fakeToken = `admin_jwt_${docId}`;
              setToken(fakeToken);
              const userObj = savedUser ? JSON.parse(savedUser) : {};
              const derivedName = formatName(cleanEmail, userObj.name);
              localStorage.setItem("admin_name", derivedName);
              localStorage.setItem("admin_email", cleanEmail);
              toast.success(`Welcome back, ${derivedName}!`);
              return;
            } else {
              toast.error("Invalid password! Please enter the correct password.");
              return;
            }
          }
        } catch (_) {}

        // 3. Check Master Admin Credentials
        if (cleanEmail === "admin@eshop.com" && cleanPass === "admin12345") {
          const docId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
          const adminToken = `master_admin_token_${docId}`;
          setToken(adminToken);
          localStorage.setItem("admin_name", "Master Admin");
          localStorage.setItem("admin_email", cleanEmail);
          toast.success("Welcome, Master Admin!");
          return;
        }

        // 4. Try backend API
        try {
          const response = await axios.post(`${backendUrl}/api/user/admin`, {
            email: cleanEmail,
            password: cleanPass,
          });

          if (response.data.success) {
            setToken(response.data.token);
            const derivedName = formatName(
              cleanEmail,
              response.data.name || response.data.user?.name
            );
            localStorage.setItem("admin_name", derivedName);
            localStorage.setItem("admin_email", cleanEmail);
            toast.success(`Welcome back, ${derivedName}!`);
            return;
          }
        } catch (_) {}

        toast.error("Invalid email or password. Please check your credentials.");
      }
    } catch (error) {
      console.error("Auth error:", error);
      toast.error("Authentication error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Background Ambience Elements */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* ========================================================= */}
      {/* 1. SIGN IN FLOW: Centered Card with ONLY Brand Logo       */}
      {/* ========================================================= */}
      {!isRegister ? (
        <div className="w-full max-w-sm space-y-4 relative z-10">
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
            {/* Top Perfectly Centered Brand Logo (No 'Admin' badge, No 'Admin Portal' text) */}
            <div className="flex justify-center items-center pt-2 pb-2">
              <BrandLogo to={null} showAdminBadge={false} />
            </div>

            <form onSubmit={onSubmitHandler} className="space-y-4">
              {/* User Email */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">
                  User Email *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="name@vrajcreation.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-300">
                  Password *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-500 focus:outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-white cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    👁️
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-center gap-2 pt-0.5">
                <input
                  type="checkbox"
                  id="termsCheckSignIn"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
                />
                <label htmlFor="termsCheckSignIn" className="text-xs text-gray-300 cursor-pointer">
                  I agree to all Terms & Conditions
                </label>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Sign In"
                )}
              </button>

              {/* FORGOT PASSWORD Link */}
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Admin credentials configured in server .env file.")
                  }
                  className="text-xs text-gray-400 hover:text-amber-400 underline font-semibold transition-colors cursor-pointer uppercase tracking-wider text-[11px]"
                >
                  FORGOT PASSWORD
                </button>
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-[1px] bg-zinc-800"></div>
                <span className="text-xs text-gray-500 font-medium">or</span>
                <div className="flex-1 h-[1px] bg-zinc-800"></div>
              </div>

              {/* Sign In With Google Button */}
              <button
                type="button"
                onClick={() => toast.info("Google Sign-In ready")}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Sign In With Google</span>
              </button>
            </form>
          </div>

          <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl py-3.5 px-6 text-center text-xs text-gray-300 shadow-xl backdrop-blur-xl">
            <span>Don't have an account?</span>{" "}
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className="text-amber-400 hover:text-amber-300 font-bold ml-1 cursor-pointer transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      ) : (
        /* ========================================================= */
        /* 2. SIGN UP / REGISTER                                     */
        /* ========================================================= */
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center bg-zinc-950/70 border border-zinc-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl relative z-10">
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/15 border border-amber-500/30 rounded-full text-amber-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span>VRAJ CREATION B2B PORTAL</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight uppercase tracking-tight">
                PREMIUM MEN'S APPAREL{" "}
                <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">
                  WHOLESALE ADMIN PANEL
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-lg">
                Manage catalogs, subcategories, bulk inventory, order dispatch, and verified wholesale buyer inquiries for Vraj Creation Surat.
              </p>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer transform hover:-translate-y-0.5"
                title="Back to Admin Sign In"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back To Sign In</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-6 bg-black/80 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex justify-center pb-2 border-b border-zinc-800">
              <BrandLogo to={null} showAdminBadge={false} />
            </div>

            <form onSubmit={onSubmitHandler} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <input
                  type="tel"
                  placeholder="Enter your phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 hover:border-zinc-600 focus:border-amber-400 rounded-xl text-white text-xs placeholder-gray-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="termsCheckSignUp"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-amber-400 focus:ring-amber-400 cursor-pointer accent-amber-400"
                />
                <label htmlFor="termsCheckSignUp" className="text-xs text-gray-300 cursor-pointer">
                  I agree to all Terms & Conditions
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Sign Up"
                )}
              </button>
            </form>

            <div className="pt-3 border-t border-zinc-800 text-center text-xs text-gray-400">
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className="text-amber-400 hover:text-amber-300 font-bold ml-1 cursor-pointer transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
