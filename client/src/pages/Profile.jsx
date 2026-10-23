import React, { useEffect, useState, useRef } from "react";
import { useShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";
import {
  getFirestoreUser,
  getFirestoreUsers,
  updateFirestoreUser,
} from "../api/firebaseService";
import Title from "../components/Title";

function Profile() {
  const { token, navigate } = useShopContext();
  const [activeTab, setActiveTab] = useState("editProfile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize fields from localStorage
  const getStoredUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  };

  const initialUser = getStoredUser();

  const [name, setName] = useState(initialUser.name || "");
  const [email, setEmail] = useState(initialUser.email || "");
  const [phone, setPhone] = useState(initialUser.phone || initialUser.phoneNumber || "");
  const [avatar, setAvatar] = useState(initialUser.image || initialUser.avatar || "");

  // Change Password Fields
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const backendUrl =
    import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";

  // Check if avatar string is video
  const isAvatarVideo = (url) => {
    if (!url || typeof url !== "string") return false;
    return (
      /\.(mp4|webm|mov|avi|mkv)$/i.test(url) ||
      url.includes("/video/upload/")
    );
  };

  // Helper to find the correct Firestore document ID for the user
  const resolveFirestoreUserId = async (userEmail, localId) => {
    if (localId && !localId.startsWith("jwt_")) {
      const doc = await getFirestoreUser(localId);
      if (doc) return localId;
    }
    if (userEmail) {
      const allUsers = await getFirestoreUsers();
      const found = allUsers.find(
        (u) => u.email && u.email.toLowerCase().trim() === userEmail.toLowerCase().trim()
      );
      if (found) return found._id || found.id;
    }
    return localId || null;
  };

  // Fetch logged-in user profile from Firebase
  const fetchUserProfile = async () => {
    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setLoading(true);
      const localUser = getStoredUser();

      // 1. Immediately fill from local storage if available
      if (localUser.name) setName(localUser.name);
      if (localUser.email) setEmail(localUser.email);
      if (localUser.phone || localUser.phoneNumber)
        setPhone(localUser.phone || localUser.phoneNumber);
      if (localUser.image || localUser.avatar)
        setAvatar(localUser.image || localUser.avatar);

      // 2. Direct fetch from Firebase Firestore
      const userEmail = localUser.email || email;
      const allUsers = await getFirestoreUsers();
      let firestoreDoc = null;

      if (userEmail) {
        firestoreDoc = allUsers.find(
          (u) =>
            u.email &&
            u.email.toLowerCase().trim() === userEmail.toLowerCase().trim()
        );
      }

      if (!firestoreDoc && (localUser.id || localUser._id)) {
        const idToTry = localUser.id || localUser._id;
        firestoreDoc = await getFirestoreUser(idToTry);
      }

      if (firestoreDoc) {
        const loadedName = firestoreDoc.name || localUser.name || "";
        const loadedEmail = firestoreDoc.email || localUser.email || "";
        const loadedPhone =
          firestoreDoc.phone ||
          firestoreDoc.phoneNumber ||
          localUser.phone ||
          localUser.phoneNumber ||
          "";
        const loadedAvatar =
          firestoreDoc.image ||
          firestoreDoc.avatar ||
          localUser.image ||
          localUser.avatar ||
          "";

        setName(loadedName);
        setEmail(loadedEmail);
        setPhone(loadedPhone);
        setAvatar(loadedAvatar);

        // Sync permanently to localStorage
        const mergedUser = {
          ...localUser,
          ...firestoreDoc,
          _id: firestoreDoc._id || firestoreDoc.id,
          id: firestoreDoc._id || firestoreDoc.id,
          name: loadedName,
          email: loadedEmail,
          phone: loadedPhone,
          phoneNumber: loadedPhone,
          image: loadedAvatar,
          avatar: loadedAvatar,
        };
        localStorage.setItem("user", JSON.stringify(mergedUser));
        setLoading(false);
        return;
      }

      // 3. Fallback: Backend API
      try {
        const { data } = await axios.get(`${backendUrl}/api/user/profile`, {
          headers: { token },
        });

        if (data.success && data.user) {
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setPhone(data.user.phone || data.user.phoneNumber || "");
          setAvatar(data.user.image || data.user.avatar || "");
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      } catch (backendErr) {
        console.log("Backend profile fetch:", backendErr.message);
      }
    } catch (error) {
      console.log("Fetch profile error:", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Avatar Upload (Image OR Video) to Cloudinary & Auto-save to Firebase
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isMedia =
      file.type.startsWith("image/") || file.type.startsWith("video/");
    if (!isMedia) {
      toast.error("Please select an image or video file");
      return;
    }

    try {
      setUploadingAvatar(true);
      const isVid = file.type.startsWith("video/");
      toast.info(`Uploading ${isVid ? "video" : "photo"} to Cloudinary...`);

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await axios.post(`${backendUrl}/api/admin/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (uploadRes.data.success && uploadRes.data.url) {
        const newAvatarUrl = uploadRes.data.url;
        setAvatar(newAvatarUrl);

        // 1. Immediately update localStorage
        const localUser = getStoredUser();
        const updatedLocal = {
          ...localUser,
          image: newAvatarUrl,
          avatar: newAvatarUrl,
        };
        localStorage.setItem("user", JSON.stringify(updatedLocal));

        // 2. Immediately persist to Firebase Firestore
        const targetId = await resolveFirestoreUserId(localUser.email || email, localUser._id || localUser.id);
        if (targetId) {
          await updateFirestoreUser(targetId, {
            image: newAvatarUrl,
            avatar: newAvatarUrl,
            updatedAt: new Date().toISOString(),
          });
        }

        // 3. Try backend update too
        try {
          await axios.post(
            `${backendUrl}/api/user/update-profile`,
            { image: newAvatarUrl },
            { headers: { token } }
          );
        } catch {}

        toast.success(`✨ Profile ${isVid ? "video" : "photo"} saved permanently!`);
      } else {
        toast.error("Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error("Failed to upload media");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const localUser = getStoredUser();
      const currentEmail = (localUser.email || email).trim();

      // 1. Locate User ID in Firestore
      const targetId = await resolveFirestoreUserId(currentEmail, localUser._id || localUser.id);

      // 2. Direct update to Firebase Firestore
      if (targetId) {
        await updateFirestoreUser(targetId, {
          name: name.trim(),
          phone: phone.trim(),
          phoneNumber: phone.trim(),
          image: avatar,
          avatar: avatar,
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Update localStorage
      const updatedUser = {
        ...localUser,
        _id: targetId || localUser._id || localUser.id,
        id: targetId || localUser.id || localUser._id,
        name: name.trim(),
        email: currentEmail,
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        image: avatar,
        avatar: avatar,
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // 4. Update Backend API
      try {
        await axios.post(
          `${backendUrl}/api/user/update-profile`,
          {
            name: name.trim(),
            phone: phone.trim(),
            phoneNumber: phone.trim(),
            image: avatar,
          },
          { headers: { token } }
        );
      } catch (apiErr) {
        console.log("Backend update notice:", apiErr.message);
      }

      toast.success("✨ Profile updated and saved permanently!");
      await fetchUserProfile();
    } catch (error) {
      console.error("Update profile error:", error);
      toast.error(error.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle Save Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match!");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters!");
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/user/change-password`,
        { oldPassword, newPassword },
        { headers: { token } }
      );

      if (data.success) {
        toast.success("✨ Password changed successfully!");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setActiveTab("editProfile");
      } else {
        toast.error(data.message || "Failed to change password");
      }
    } catch (error) {
      console.error("Change password error:", error);
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login");
    } else {
      fetchUserProfile();
    }
  }, [token]);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 sm:px-6 select-none space-y-6 min-h-[70vh]">
      {/* Title matching My Orders */}
      <div className="border-b border-zinc-800/80 pb-4 mb-2">
        <div className="text-2xl sm:text-3xl font-bold">
          <Title text1={"MY"} text2={"ACCOUNT"} />
        </div>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          Manage your personal details, profile media, and account security.
        </p>
      </div>

      {/* Tabs Header with clean underline */}
      <div className="flex items-center gap-8 border-b border-zinc-800 text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("editProfile")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "editProfile"
              ? "text-amber-400 border-b-2 border-amber-400 font-extrabold"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Edit Profile
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("changePassword")}
          className={`pb-3 transition-colors cursor-pointer relative ${
            activeTab === "changePassword"
              ? "text-amber-400 border-b-2 border-amber-400 font-extrabold"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Change Password
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="py-20 flex justify-center items-center gap-3 text-amber-400 text-sm">
          <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading your profile...</span>
        </div>
      ) : activeTab === "editProfile" ? (
        /* ========================================================= */
        /* EDIT PROFILE FLOW (Original Photo 2 Style)                */
        /* ========================================================= */
        <form
          onSubmit={handleSaveProfile}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start pt-4"
        >
          {/* Left: Avatar Column */}
          <div className="md:col-span-4 flex flex-col items-center justify-center space-y-4">
            <div className="relative group">
              <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden border-4 border-amber-500/40 shadow-2xl bg-zinc-900 flex items-center justify-center p-1 relative">
                {avatar ? (
                  isAvatarVideo(avatar) ? (
                    <video
                      src={avatar}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover rounded-full cursor-pointer"
                      onClick={() => setMediaModalOpen(true)}
                    />
                  ) : (
                    <img
                      src={avatar}
                      alt={name}
                      className="w-full h-full object-cover rounded-full cursor-pointer"
                      onClick={() => setMediaModalOpen(true)}
                    />
                  )
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 flex items-center justify-center text-black text-5xl font-black uppercase shadow-inner">
                    {name ? name.charAt(0) : "U"}
                  </div>
                )}
              </div>

              {/* Upload photo / video overlay on hover */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute inset-0 rounded-full bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer border-2 border-amber-400/50"
                title="Click to upload Photo or Video"
              >
                {uploadingAvatar ? (
                  <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="w-6 h-6 text-amber-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                    <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                      Upload Media
                    </span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* Quick Actions (View Full / Change) */}
            <div className="flex flex-col items-center gap-1.5">
              {avatar && (
                <button
                  type="button"
                  onClick={() => setMediaModalOpen(true)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>{isAvatarVideo(avatar) ? "▶️ Open Video" : "🔍 View Photo"}</span>
                </button>
              )}
              <p className="text-xs text-gray-400 text-center font-medium">
                Logged in as <span className="text-amber-400 font-bold">{email}</span>
              </p>
            </div>
          </div>

          {/* Right: Form Fields */}
          <div className="md:col-span-8 space-y-5 bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            {/* Row 1: Name and Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>

              {/* Email (Readonly) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  EMAIL
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full px-4 py-3 bg-zinc-900/40 border border-zinc-800 rounded-xl text-gray-400 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Row 2: Phone */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                PHONE
              </label>
              <input
                type="tel"
                placeholder="e.g. 1234567234"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
              />
            </div>

            {/* Save Button */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>SAVE</span>
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* ========================================================= */
        /* CHANGE PASSWORD FLOW (Original Photo 3 Style)             */
        /* ========================================================= */
        <form
          onSubmit={handleSavePassword}
          className="space-y-6 pt-4 max-w-4xl"
        >
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md space-y-6">
            {/* 3 Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* 1. Old Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Old Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>

              {/* 2. New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>

              {/* 3. Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-xl text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-amber-400 transition-all"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-8 py-3.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>SAVE</span>
                )}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Fullscreen Video / Photo Preview Modal */}
      {mediaModalOpen && avatar && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setMediaModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full max-h-[85vh] bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                {isAvatarVideo(avatar) ? "🎥 Profile Video Player" : "🖼️ Profile Photo Viewer"}
              </span>
              <button
                type="button"
                onClick={() => setMediaModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-gray-300 flex items-center justify-center cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <div className="w-full max-h-[60vh] rounded-2xl overflow-hidden bg-black flex items-center justify-center">
              {isAvatarVideo(avatar) ? (
                <video
                  src={avatar}
                  controls
                  autoPlay
                  loop
                  className="w-full max-h-[60vh] object-contain rounded-2xl"
                />
              ) : (
                <img
                  src={avatar}
                  alt={name}
                  className="w-full max-h-[60vh] object-contain rounded-2xl"
                />
              )}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setMediaModalOpen(false);
                  fileInputRef.current?.click();
                }}
                className="px-5 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 cursor-pointer transition-colors"
              >
                Change Media
              </button>
              <button
                type="button"
                onClick={() => setMediaModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-zinc-800 text-gray-300 hover:bg-zinc-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
