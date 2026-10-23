// Image & Video URL Optimization Helper
export const optimizeImageUrl = (url, width = 800) => {
  if (!url || typeof url !== "string") {
    return "https://images.unsplash.com/photo-1617137984095-74e4e5e3613f?w=800&auto=format&fit=crop&q=80";
  }
  const cleanUrl = url.trim();
  if (cleanUrl.includes("res.cloudinary.com") && cleanUrl.includes("/upload/")) {
    if (cleanUrl.includes("/upload/f_auto,q_auto")) return cleanUrl;
    return cleanUrl.replace("/upload/", `/upload/f_auto,q_auto,w_${width}/`);
  }
  if (cleanUrl.includes("images.unsplash.com")) {
    if (cleanUrl.includes("w=")) return cleanUrl;
    return `${cleanUrl}&w=${width}&auto=format&fit=crop&q=80`;
  }
  return cleanUrl;
};

export const isVideoUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".mov") ||
    clean.includes("/video/upload/")
  );
};
