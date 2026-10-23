import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { backendUrl } from "../App";
import { getFirestoreContactInfo, updateFirestoreContactInfo } from "../api/firebaseService";

const initialContactForm = {
  officeTitle: "",
  officeAddress: "",
  phone: "",
  email: "",
  careersTitle: "",
  careersDesc: "",
  careersBtnText: "",
  image: "",
  showroomCity: "",
};

function ContactCMS({ token }) {
  const [formData, setFormData] = useState(initialContactForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");

  const fetchContact = async () => {
    try {
      setLoading(true);
      const data = await getFirestoreContactInfo();
      if (data) {
        setFormData(data);
        setPreviewUrl(data.image || "");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load contact information");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContact();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let finalImgUrl = formData.image;

      // Upload to Cloudinary if file selected
      if (selectedFile) {
        toast.info("Uploading Showroom Banner to Cloudinary...");
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

      const payload = {
        ...formData,
        image: finalImgUrl,
        videoUrl: finalImgUrl,
      };

      await updateFirestoreContactInfo(payload);
      toast.success("✨ Contact information & showroom banner saved to Firestore!");
      fetchContact();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to save contact info");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-zinc-900/60 p-6 rounded-3xl border border-zinc-800 backdrop-blur-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📞</span>
            <h1 className="text-xl sm:text-2xl font-black text-white">Contact Page Studio</h1>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Manage showroom address, contact numbers, email support, careers info, and banner image.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || loading}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {saving ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold">Loading Contact Settings from Firestore...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Contact Form */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-7 bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl space-y-5"
          >
            <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
              <span className="text-amber-400">🏢</span>
              <span>Showroom & Office Information</span>
            </h2>

            {/* Showroom Photo / Video Upload */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Showroom Media (Upload Video or Photo)</span>
                {(previewUrl || formData.image) && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    {(previewUrl || formData.image).match(/\.(mp4|webm|mov|avi|mkv)$/i) ||
                    (previewUrl || formData.image).includes("/video/upload/") ||
                    (selectedFile && selectedFile.type.startsWith("video/"))
                      ? "🎥 Video Format"
                      : "🖼️ Image Format"}
                  </span>
                )}
              </label>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <div className="w-28 h-28 rounded-2xl bg-black border border-zinc-800 overflow-hidden shrink-0 flex items-center justify-center relative shadow-inner">
                  {(() => {
                    const media = previewUrl || formData.image;
                    if (!media) {
                      return (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                          No Media
                        </div>
                      );
                    }
                    const isVid =
                      (selectedFile && selectedFile.type.startsWith("video/")) ||
                      (typeof media === "string" &&
                        (/\.(mp4|webm|mov|avi|mkv)$/i.test(media) ||
                          media.includes("/video/upload/")));

                    return isVid ? (
                      <video src={media} className="w-full h-full object-cover" muted autoPlay loop playsInline />
                    ) : (
                      <img src={media} alt="Showroom Preview" className="w-full h-full object-cover" />
                    );
                  })()}
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
                      value={formData.image}
                      onChange={(e) => {
                        setFormData({ ...formData, image: e.target.value });
                        if (!selectedFile) setPreviewUrl(e.target.value);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700/80 hover:border-zinc-500 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Office Title */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                Office / Showroom Title
              </label>
              <input
                type="text"
                required
                value={formData.officeTitle}
                onChange={(e) => setFormData({ ...formData, officeTitle: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-400"
              />
            </div>

            {/* Office Address */}
            <div>
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                Complete Office Address
              </label>
              <textarea
                rows={3}
                required
                value={formData.officeAddress}
                onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Wholesale Phone Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 font-mono outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Email Support Address
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Careers Section */}
            <div className="pt-4 border-t border-zinc-800 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-amber-400">💼</span>
                <span>Careers & Recruitment Card</span>
              </h2>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Careers Card Title
                </label>
                <input
                  type="text"
                  value={formData.careersTitle}
                  onChange={(e) => setFormData({ ...formData, careersTitle: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                  Careers Description
                </label>
                <textarea
                  rows={2}
                  value={formData.careersDesc}
                  onChange={(e) => setFormData({ ...formData, careersDesc: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 outline-none focus:border-amber-400 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                    Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.careersBtnText}
                    onChange={(e) => setFormData({ ...formData, careersBtnText: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1.5 block">
                    Location Badge Text
                  </label>
                  <input
                    type="text"
                    value={formData.showroomCity}
                    onChange={(e) => setFormData({ ...formData, showroomCity: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer transition-all"
            >
              {saving ? "Saving to Firestore..." : "💾 Update Contact Information"}
            </button>
          </form>

          {/* Right: Live Storefront Preview */}
          <div className="lg:col-span-5 space-y-4 sticky top-6">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 shadow-xl backdrop-blur-xl">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-full border border-amber-500/30 mb-3 inline-block">
                ✨ Live Storefront Preview
              </span>

              {/* Showroom Image/Video Preview */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-xl mb-4 flex items-center justify-center">
                {(() => {
                  const mediaUrl = previewUrl || formData.image;
                  if (!mediaUrl) {
                    return (
                      <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                        No Showroom Media Selected
                      </div>
                    );
                  }
                  const isVid =
                    (selectedFile && selectedFile.type.startsWith("video/")) ||
                    (typeof mediaUrl === "string" &&
                      (/\.(mp4|webm|mov|avi|mkv)$/i.test(mediaUrl) ||
                        mediaUrl.includes("/video/upload/")));

                  return isVid ? (
                    <video
                      key={mediaUrl}
                      src={mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      autoPlay
                      loop
                      playsInline
                    />
                  ) : (
                    <img
                      src={mediaUrl}
                      alt="Showroom Preview"
                      className="w-full h-full object-cover"
                    />
                  );
                })()}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md border border-white/10 text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between z-10">
                  <span className="truncate">{formData.officeTitle || "Vraj Creation Showroom"}</span>
                  {formData.showroomCity && (
                    <span className="text-amber-400 text-[10px] uppercase font-extrabold tracking-wider shrink-0 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {formData.showroomCity}
                    </span>
                  )}
                </div>
              </div>

              {/* Info Cards Preview */}
              <div className="space-y-2.5 text-xs">
                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl">
                  <span className="font-bold text-amber-400 block mb-0.5">{formData.officeTitle}</span>
                  <p className="text-gray-400 text-[11px] leading-relaxed">{formData.officeAddress}</p>
                </div>

                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="font-bold text-white font-mono">{formData.phone}</span>
                </div>

                <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="font-bold text-amber-400">{formData.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContactCMS;
