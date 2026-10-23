import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { backendUrl } from "../App";
import {
  getFirestoreBanners,
  addFirestoreBanner,
  updateFirestoreBanner,
  deleteFirestoreBanner,
} from "../api/firebaseService";

function Banners({ token }) {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit / Add Banner State
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState("");
  const [mediaType, setMediaType] = useState("video"); // 'video' or 'image'
  const [videoUrl, setVideoUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tag, setTag] = useState("");
  const [order, setOrder] = useState(1);
  const [title1, setTitle1] = useState("");
  const [title2, setTitle2] = useState("");
  const [tagline, setTagline] = useState("");
  const [link, setLink] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef(null);

  const sortBanners = (list) => {
    return [...list].sort((a, b) => {
      const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : (a.displayOrder !== undefined && a.displayOrder !== null ? Number(a.displayOrder) : 999);
      const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : (b.displayOrder !== undefined && b.displayOrder !== null ? Number(b.displayOrder) : 999);
      return orderA - orderB;
    });
  };

  const resetForm = () => {
    setEditId(null);
    setName("");
    setMediaType("video");
    setVideoUrl("");
    setImageUrl("");
    setSelectedFile(null);
    setPreviewBlobUrl("");
    setSubtitle("");
    setTag("");
    setOrder(banners.length + 1);
    setTitle1("");
    setTitle2("");
    setTagline("");
    setLink("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAddModal = () => {
    resetForm();
    setOrder(banners.length + 1);
    setShowModal(true);
  };

  const openEditModal = (banner) => {
    const isVid =
      banner.mediaType === "video" ||
      !!banner.video ||
      (banner.imageUrl &&
        (banner.imageUrl.endsWith(".mp4") ||
          banner.imageUrl.endsWith(".webm") ||
          banner.imageUrl.includes("/video/upload/")));

    setEditId(banner._id || banner.id);
    setName(banner.name || banner.bannerTitle || "");
    setMediaType(isVid ? "video" : "image");
    setVideoUrl(banner.video || (isVid ? banner.imageUrl : "") || "");
    setImageUrl(banner.imageUrl || (!isVid ? banner.video : "") || "");
    setSelectedFile(null);
    setPreviewBlobUrl(banner.video || banner.imageUrl || "");
    setSubtitle(banner.subtitle || "");
    setTag(banner.tag || banner.badgeTag || banner.subtitle || "");
    setOrder(
      banner.order !== undefined && banner.order !== null
        ? Number(banner.order)
        : banner.displayOrder !== undefined && banner.displayOrder !== null
        ? Number(banner.displayOrder)
        : banners.indexOf(banner) + 1
    );
    setTitle1(banner.title1 || banner.bannerTitle || "");
    setTitle2(banner.title2 || banner.productName || "");
    setTagline(banner.tagline || "");
    setLink(banner.link || "/collection");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setShowModal(true);
  };

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const firestoreBanners = await getFirestoreBanners();
      if (Array.isArray(firestoreBanners) && firestoreBanners.length > 0) {
        setBanners(sortBanners(firestoreBanners));
        return;
      }
      const { data } = await axios.get(`${backendUrl}/api/admin/banners`);
      if (data.success && Array.isArray(data.banners)) {
        setBanners(sortBanners(data.banners));
      } else {
        setBanners(Array.isArray(firestoreBanners) ? sortBanners(firestoreBanners) : []);
      }
    } catch (err) {
      console.log("Error loading banners:", err);
      toast.error("Failed to load banners from Firebase");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isVid = file.type.startsWith("video");
    setMediaType(isVid ? "video" : "image");
    setSelectedFile(file);

    const blobUrl = URL.createObjectURL(file);
    setPreviewBlobUrl(blobUrl);
    if (isVid) {
      setVideoUrl(file.name);
    } else {
      setImageUrl(file.name);
    }
    toast.success(`Selected "${file.name}"!`);
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      let finalMediaUrl = mediaType === "video" ? videoUrl : imageUrl;

      // 1. If a local computer file was chosen, upload to Cloudinary via backend
      if (selectedFile) {
        toast.info("Uploading file to Cloudinary...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        try {
          const uploadRes = await axios.post(`${backendUrl}/api/admin/upload`, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          if (uploadRes.data.success && uploadRes.data.url) {
            finalMediaUrl = uploadRes.data.url;
          } else {
            throw new Error(uploadRes.data.message || "Upload to Cloudinary failed");
          }
        } catch (uploadErr) {
          console.error("Upload error:", uploadErr);
          if (!finalMediaUrl || (!finalMediaUrl.startsWith("http") && !finalMediaUrl.startsWith("/"))) {
            throw new Error(
              uploadErr.response?.data?.message ||
              uploadErr.message ||
              "Failed to upload file to Cloudinary. Please ensure server is running."
            );
          }
        }
      }

      if (!finalMediaUrl || !finalMediaUrl.trim()) {
        toast.error("Please provide a Video or Image URL or choose a file");
        return;
      }

      const parsedOrder = parseInt(order, 10) || 1;
      const isMediaVideo =
        mediaType === "video" ||
        finalMediaUrl.endsWith(".mp4") ||
        finalMediaUrl.endsWith(".webm") ||
        finalMediaUrl.endsWith(".mov") ||
        finalMediaUrl.includes("/video/upload/");

      const bannerPayload = {
        name: name.trim() || `${title1.trim()} ${title2.trim()}`.trim() || "Hero Slide",
        bannerTitle: name.trim() || `${title1.trim()} ${title2.trim()}`.trim() || "Hero Slide",
        mediaType: isMediaVideo ? "video" : "image",
        video: isMediaVideo ? finalMediaUrl.trim() : "",
        imageUrl: !isMediaVideo ? finalMediaUrl.trim() : "",
        mediaUrl: finalMediaUrl.trim(),
        subtitle: subtitle.trim() || tag.trim(),
        tag: tag.trim() || subtitle.trim(),
        badgeTag: tag.trim() || subtitle.trim(),
        order: parsedOrder,
        displayOrder: parsedOrder,
        title1: title1.trim(),
        title2: title2.trim(),
        tagline: tagline.trim(),
        link: link.trim() || "/collection",
      };

      if (editId) {
        // Update existing banner in Firebase Firestore
        bannerPayload.updatedAt = new Date().toISOString();
        await updateFirestoreBanner(editId, bannerPayload);
        try {
          await axios.post(`${backendUrl}/api/admin/banner/add`, { ...bannerPayload, _id: editId, id: editId }, { headers: { token } });
        } catch (_) {}
        toast.success("✨ Hero banner slide updated in Firebase!");
      } else {
        // Save new banner directly to Firebase Firestore
        bannerPayload.createdAt = new Date().toISOString();
        const res = await addFirestoreBanner(bannerPayload);
        try {
          const docId = res?.banner?._id || res?.banner?.id;
          await axios.post(`${backendUrl}/api/admin/banner/add`, { ...bannerPayload, _id: docId, id: docId }, { headers: { token } });
        } catch (_) {}
        toast.success("✨ Hero banner slide published to Firebase!");
      }

      resetForm();
      setShowModal(false);
      await fetchBanners();
    } catch (err) {
      console.error("handleSaveBanner error:", err);
      toast.error(err.message || "Failed to save banner");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBanner = async (id) => {
    if (!window.confirm("Are you sure you want to delete this Hero slide from Firebase?")) return;
    try {
      await deleteFirestoreBanner(id);
      toast.success("Hero slide deleted from Firebase");
      fetchBanners();
    } catch (err) {
      toast.error(err.message || "Failed to delete slide");
    }
  };

  return (
    <div className="w-full space-y-6 select-none pb-12">
      {/* 1. Header Banner matching Geloura Luxury Theme */}
      <div className="bg-gradient-to-r from-[#0d1627] via-[#09111e] to-[#0a1e16] border border-gray-800 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>HERO CAROUSEL & BANNER STUDIO</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>🎬 Hero Video & Banner Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400">
            Manage live storefront video carousels, lookbook slides, and promotional showcase with custom Badge Tags & Display Orders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>➕ Add Hero Slide</span>
          </button>

          <button
            onClick={fetchBanners}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800/90 hover:bg-gray-700 text-gray-200 hover:text-amber-400 border border-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Hero Slides
            </p>
            <h3 className="text-3xl font-black text-white mt-1">
              {loading ? "..." : banners.length}
            </h3>
            <span className="text-[10px] text-amber-400 font-semibold">Active in Firebase</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center text-xl">
            🎬
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Active Video Slides
            </p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1">
              {banners.filter((b) => b.mediaType === "video" || b.video).length}
            </h3>
            <span className="text-[10px] text-emerald-300 font-semibold">✓ Live Cloud Video Stream</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl">
            ▶️
          </div>
        </div>

        <div className="bg-[#090d16]/90 border border-gray-800 rounded-3xl p-5 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Sequence Ordering
            </p>
            <h3 className="text-xl font-black text-cyan-400 mt-1">Order #1 → #{banners.length || 1}</h3>
            <span className="text-[10px] text-cyan-300 font-semibold">Custom Display Order</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xl">
            🔢
          </div>
        </div>
      </div>

      {/* 3. Banners Grid */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-64 bg-[#090d16]/80 border border-gray-800 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      )}

      {!loading && banners.length === 0 && (
        <div className="text-center py-16 bg-[#090d16]/80 border border-gray-800 rounded-3xl text-gray-400 space-y-3">
          <span className="text-4xl">🎬</span>
          <p className="text-base font-bold text-white">No Hero Slides Configured</p>
          <p className="text-xs text-gray-500">
            Click "+ Add Hero Slide" above to add dynamic video or image banners!
          </p>
        </div>
      )}

      {!loading && banners.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner, i) => {
            const mediaSrc =
              banner.video || banner.imageUrl || banner.mediaUrl || banner.image || "/Fashion_saiaagaman.mp4";

            const isVid =
              banner.mediaType === "video" ||
              Boolean(banner.video) ||
              (typeof mediaSrc === "string" &&
                (mediaSrc.endsWith(".mp4") ||
                  mediaSrc.endsWith(".webm") ||
                  mediaSrc.endsWith(".mov") ||
                  mediaSrc.includes("/video/upload/")));

            const displayTag = banner.tag || banner.badgeTag || banner.subtitle || "LOOKBOOK";
            const displayOrderNum = banner.order !== undefined && banner.order !== null ? banner.order : (banner.displayOrder !== undefined && banner.displayOrder !== null ? banner.displayOrder : i + 1);

            return (
              <div
                key={banner._id || banner.id || i}
                className="bg-[#090d16]/95 border border-gray-800 hover:border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-300 group"
              >
                {/* Media Preview Container */}
                <div className="relative aspect-[16/9] bg-black overflow-hidden">
                  {isVid ? (
                    <video
                      key={mediaSrc}
                      src={mediaSrc}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <img
                      src={mediaSrc}
                      alt={banner.title1 || "Banner"}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80";
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  )}

                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                  {/* Slide badge & Order */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/80 backdrop-blur-md text-amber-300 border border-amber-500/40 shadow-md">
                    <span>{isVid ? "🎬 Video" : "🖼️ Image"}</span>
                    <span className="text-gray-500">•</span>
                    <span>Order #{displayOrderNum}</span>
                  </div>

                  {/* Badge Tag */}
                  {displayTag && (
                    <span className="absolute bottom-3 left-3 text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded-md border border-amber-500/30">
                      {displayTag}
                    </span>
                  )}
                </div>

                {/* Content Details */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-extrabold text-white text-base leading-tight">
                      {banner.title1 || banner.name || banner.bannerTitle || "Hero Slide"}{" "}
                      {banner.title2 && (
                        <span className="text-amber-400">
                          {banner.title2}
                        </span>
                      )}
                    </h3>
                    {banner.tagline ? (
                      <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">
                        "{banner.tagline}"
                      </p>
                    ) : banner.description ? (
                      <p className="text-xs text-gray-400 mt-1 italic line-clamp-1">
                        "{banner.description}"
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="text-amber-400">🔗 Button Link:</span>
                    <span className="font-mono text-gray-300 truncate">{banner.link || "/collection"}</span>
                  </div>

                  {/* Badge Tag & Display Order Pill Info */}
                  <div className="flex items-center justify-between text-xs py-1 px-2.5 bg-zinc-900/90 rounded-xl border border-zinc-800">
                    <span className="text-gray-400 text-[11px]">
                      🏷️ Tag: <strong className="text-amber-300">{displayTag}</strong>
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      🔢 Order: <strong className="text-cyan-300">#{displayOrderNum}</strong>
                    </span>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-3 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500 font-mono truncate max-w-[120px]">
                      ID: {banner._id || banner.id}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(banner)}
                        className="px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500 border border-amber-500/30 hover:border-amber-500 text-amber-300 hover:text-black rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Edit Hero Slide"
                      >
                        <span>✏️</span>
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(banner._id || banner.id)}
                        className="px-3 py-1.5 bg-red-500/15 hover:bg-red-600 border border-red-500/30 hover:border-red-600 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm"
                        title="Delete Hero Slide"
                      >
                        <span>🗑️</span>
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Banner Modal (Matching Lookbook / AboutCMS Modal Style) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">{editId ? "✏️" : "➕"}</span>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editId ? "Edit Lookbook Slide" : "Add Lookbook Slide"}
                  </h3>
                  {editId && (
                    <span className="text-[10px] font-mono text-amber-400">
                      ID: {editId}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4 text-sm">
              {/* Media Type Toggle */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Slide Media (Upload Video or Photo) *
                  </label>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {mediaType === "video" ? "🎥 VIDEO FORMAT" : "🖼️ IMAGE FORMAT"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMediaType("video")}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      mediaType === "video"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    🎬 Video Slide (.mp4)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaType("image")}
                    className={`py-2.5 rounded-xl font-bold text-xs border transition-all cursor-pointer ${
                      mediaType === "image"
                        ? "bg-amber-500/20 text-amber-300 border-amber-500/50"
                        : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    🖼️ Image Slide (.jpg / .png)
                  </button>
                </div>
              </div>

              {/* File Upload OR URL */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                  Upload File or Enter Source URL *
                </label>
                <div className="space-y-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept={mediaType === "video" ? "video/*" : "image/*"}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-dashed border-zinc-700 hover:border-amber-400/60 rounded-xl text-zinc-300 hover:text-white text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center gap-2"
                  >
                    <span>📁</span>
                    <span>Upload {mediaType === "video" ? "Video / 🖼️ Photo" : "Photo / 🎥 Video"}</span>
                  </button>

                  <p className="text-[10px] text-gray-500">Or enter Direct Video / Image URL:</p>
                  <input
                    type="text"
                    required
                    placeholder={
                      mediaType === "video"
                        ? "e.g. /Fashion_saiaagaman.mp4 or https://..."
                        : "https://res.cloudinary.com/..."
                    }
                    value={mediaType === "video" ? videoUrl : imageUrl}
                    onChange={(e) => {
                      if (mediaType === "video") setVideoUrl(e.target.value);
                      else setImageUrl(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700/80 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Live Preview Inside Modal */}
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-black aspect-[16/9] relative">
                {(previewBlobUrl || (mediaType === "video" ? videoUrl : imageUrl)) ? (
                  mediaType === "video" ? (
                    <video
                      key={previewBlobUrl || videoUrl}
                      src={previewBlobUrl || videoUrl}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={previewBlobUrl || imageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-600">
                    No Media Selected
                  </div>
                )}
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 text-[10px] font-bold text-amber-400 border border-amber-500/30">
                  Live Preview
                </div>
              </div>

              {/* Slide Title */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Slide Title Line 1 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vraj or New"
                    value={title1}
                    onChange={(e) => setTitle1(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Slide Title Line 2 *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SaiAagaman or Arrivals"
                    value={title2}
                    onChange={(e) => setTitle2(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>
              </div>

              {/* Slide Caption / Description */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Slide Caption / Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Crafted with Passion & Traditional Grace or Vogue style collection..."
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs"
                />
              </div>

              {/* Badge Tag & Display Order (Exact layout from user reference photo) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LOOKBOOK 01"
                    value={tag}
                    onChange={(e) => {
                      setTag(e.target.value);
                      setSubtitle(e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs placeholder-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={order}
                    onChange={(e) => setOrder(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs placeholder-zinc-600 font-mono"
                  />
                </div>
              </div>

              {/* Button Link */}
              <div>
                <label className="block text-xs font-bold text-zinc-300 mb-1.5 uppercase tracking-wider">
                  Button Destination Link
                </label>
                <input
                  type="text"
                  placeholder="e.g. /collection or /about"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white focus:outline-none focus:border-amber-400 text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black rounded-xl text-xs font-extrabold cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50 transition-all uppercase tracking-wider"
                >
                  {submitting
                    ? editId
                      ? "Saving Changes..."
                      : "Publishing Slide..."
                    : editId
                    ? "Save Changes"
                    : "Create Slide"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Banners;
