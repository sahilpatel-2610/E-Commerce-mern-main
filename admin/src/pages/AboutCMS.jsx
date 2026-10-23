import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { backendUrl } from "../App";
import {
  getFirestoreAboutSlides,
  addFirestoreAboutSlide,
  updateFirestoreAboutSlide,
  deleteFirestoreAboutSlide,
} from "../api/firebaseService";

function AboutCMS({ token }) {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSlideId, setCurrentSlideId] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    caption: "",
    tag: "",
    order: 1,
    src: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchSlides = async () => {
    try {
      setLoading(true);
      const data = await getFirestoreAboutSlides();
      setSlides(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load About lookbook slides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setCurrentSlideId(null);
    setSelectedFile(null);
    setPreviewUrl("");
    setFormData({
      title: "",
      caption: "",
      tag: `LOOKBOOK 0${slides.length + 1}`,
      order: slides.length + 1,
      src: "",
    });
    setModalOpen(true);
  };

  const openEditModal = (slide) => {
    setIsEditing(true);
    setCurrentSlideId(slide._id || slide.id);
    setSelectedFile(null);
    setPreviewUrl(slide.src || slide.image || "");
    setFormData({
      title: slide.title || "",
      caption: slide.caption || "",
      tag: slide.tag || "LOOKBOOK",
      order: slide.order || 1,
      src: slide.src || slide.image || "",
    });
    setModalOpen(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a title for the slide");
      return;
    }

    try {
      setSaving(true);
      let finalImgUrl = formData.src;

      // 1. Upload to Cloudinary if file selected
      if (selectedFile) {
        toast.info("Uploading media to Cloudinary...");
        const imgFormData = new FormData();
        imgFormData.append("file", selectedFile);
        try {
          const uploadRes = await axios.post(`${backendUrl}/api/admin/upload`, imgFormData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (uploadRes.data.success && uploadRes.data.url) {
            finalImgUrl = uploadRes.data.url;
          } else {
            throw new Error(uploadRes.data.message || "Failed to upload file to Cloudinary");
          }
        } catch (uploadErr) {
          console.error("Cloudinary upload error:", uploadErr);
          if (!finalImgUrl || finalImgUrl.startsWith("blob:")) {
            throw new Error(
              uploadErr.response?.data?.message ||
              uploadErr.message ||
              "Cloudinary upload failed. Check server connection."
            );
          }
        }
      }

      if (!finalImgUrl && previewUrl && !previewUrl.startsWith("blob:")) {
        finalImgUrl = previewUrl;
      }

      if (!finalImgUrl) {
        toast.error("Please select a file to upload or enter a URL");
        setSaving(false);
        return;
      }

      const payload = {
        title: formData.title.trim(),
        caption: formData.caption.trim(),
        description: formData.caption.trim(),
        tag: formData.tag || "LOOKBOOK",
        order: Number(formData.order) || 1,
        src: finalImgUrl.trim(),
        image: finalImgUrl.trim(),
      };

      if (isEditing && currentSlideId) {
        await updateFirestoreAboutSlide(currentSlideId, payload);
        toast.success("✨ Slide updated successfully in Firestore!");
      } else {
        await addFirestoreAboutSlide(payload);
        toast.success("✨ New slide added successfully to About Studio!");
      }

      setModalOpen(false);
      fetchSlides();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save slide");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete slide "${title}"?`)) {
      try {
        await deleteFirestoreAboutSlide(id);
        toast.success("Slide deleted from Firestore");
        fetchSlides();
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete slide");
      }
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-3xl border border-zinc-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📖</span>
            <h1 className="text-xl sm:text-2xl font-black text-white">About Lookbook Studio</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage lookbook slides, titles, captions, and photos shown on the customer About page.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <span>+ Add Lookbook Slide</span>
        </button>
      </div>

      {/* Grid of Slides */}
      {loading ? (
        <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Loading About Slides from Firestore...</p>
        </div>
      ) : slides.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/40 border border-zinc-800 rounded-3xl text-gray-400">
          <p className="text-base font-bold text-white mb-2">No Slides in About Studio</p>
          <p className="text-xs text-gray-400 mb-4">Click "Add Lookbook Slide" to create your first look.</p>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold"
          >
            + Add First Slide
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {slides.map((slide, index) => (
            <div
              key={slide._id || slide.id || index}
              className="bg-zinc-900/70 border border-zinc-800/90 rounded-3xl overflow-hidden shadow-xl hover:border-amber-500/40 transition-all flex flex-col group"
            >
              {/* Slide Preview Media */}
              <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden flex items-center justify-center">
                {(() => {
                  const media = slide.src || slide.image;
                  const isVid =
                    typeof media === "string" &&
                    (/\.(mp4|webm|mov|avi|mkv)$/i.test(media) ||
                      media.includes("/video/upload/"));

                  return isVid ? (
                    <video src={media} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                  ) : (
                    <img
                      src={media}
                      alt={slide.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  );
                })()}
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-500/40 text-amber-300 font-bold text-[10px] uppercase">
                  {slide.tag || `LOOKBOOK 0${index + 1}`}
                </div>
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-gray-300 font-mono text-[10px]">
                  Order: {slide.order || index + 1}
                </div>
              </div>

              {/* Slide Content */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-white mb-1.5 line-clamp-1">
                    {slide.title}
                  </h3>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {slide.caption}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 mt-4 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => openEditModal(slide)}
                    className="flex-1 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-amber-500/20 text-gray-300 hover:text-amber-300 border border-zinc-700 hover:border-amber-500/40 font-bold text-xs transition-colors cursor-pointer text-center"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(slide._id || slide.id, slide.title)}
                    className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 border border-zinc-700 hover:border-rose-500/40 font-bold text-xs transition-colors cursor-pointer"
                    title="Delete Slide"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Slide Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#09090b] border border-zinc-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                {isEditing ? "✏️ Edit Lookbook Slide" : "➕ Add New Lookbook Slide"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 text-gray-300 flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo/Video Upload & Preview */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Slide Media (Upload Video or Photo) *</span>
                  {previewUrl && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                      {previewUrl.match(/\.(mp4|webm|mov|avi|mkv)$/i) || previewUrl.includes("/video/upload/") || (selectedFile && selectedFile.type.startsWith("video/"))
                        ? "🎥 Video Format"
                        : "🖼️ Image Format"}
                    </span>
                  )}
                </label>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                  <div className="w-28 h-28 rounded-2xl bg-black border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                    {previewUrl ? (
                      previewUrl.match(/\.(mp4|webm|mov|avi|mkv)$/i) || previewUrl.includes("/video/upload/") || (selectedFile && selectedFile.type.startsWith("video/")) ? (
                        <video src={previewUrl} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                      ) : (
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      )
                    ) : (
                      <span className="text-gray-600 text-xs text-center p-2">No Media Selected</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2.5 w-full">
                    <div className="flex items-center gap-2 flex-wrap">
                      <label className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-md">
                        <span>🎥 Upload Video / 🖼️ Photo</span>
                        <input
                          type="file"
                          accept="image/*,video/*,.mp4,.webm,.mov,.avi,.mkv,.png,.jpg,.jpeg,.webp"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                      {selectedFile && (
                        <span className="text-[11px] text-emerald-400 font-semibold truncate max-w-[200px]">
                          ✓ {selectedFile.name}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-gray-400">Or enter Direct Video / Image URL:</span>
                      <input
                        type="text"
                        placeholder="e.g. https://res.cloudinary.com/.../video/upload/.../video.mp4"
                        value={formData.src}
                        onChange={(e) => {
                          setFormData({ ...formData, src: e.target.value });
                          if (!selectedFile) setPreviewUrl(e.target.value);
                        }}
                        className="w-full bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Slide Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Signature Apparel"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-400"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Slide Caption / Description
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Premium handcrafted fabrics tailored for timeless elegance and comfort."
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-amber-400 resize-none"
                />
              </div>

              {/* Tag & Order */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                    Badge Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LOOKBOOK 01"
                    value={formData.tag}
                    onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-gray-300 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Slide"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AboutCMS;
