import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v2 as cloudinary } from "cloudinary";
import { readServerUsers, deleteServerUser } from "./user.controller.js";
import {
  setFirestoreDoc,
  deleteFirestoreDoc,
  updateFirestoreDocFields,
  addFirestoreDoc,
  getFirestoreDoc,
  getFirestoreDocs,
  broadcastAdminNotification,
} from "../config/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const CATS_FILE = path.join(DATA_DIR, "categories.json");
const BANNERS_FILE = path.join(DATA_DIR, "homebanners.json");

export const readServerCategories = () => {
  try {
    if (fs.existsSync(CATS_FILE)) {
      return JSON.parse(fs.readFileSync(CATS_FILE, "utf-8") || "[]");
    }
  } catch (_) {}
  return [];
};

export const saveServerCategory = (cat) => {
  try {
    const list = readServerCategories();
    const id = cat._id || cat.id;
    const updated = [cat, ...list.filter((c) => (c._id || c.id) !== id)];
    fs.writeFileSync(CATS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (_) {}
  return [];
};

export const deleteServerCategory = (id) => {
  try {
    const list = readServerCategories();
    const updated = list.filter((c) => (c._id || c.id) !== id);
    fs.writeFileSync(CATS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (_) {}
  return [];
};

export const readServerBanners = () => {
  try {
    if (fs.existsSync(BANNERS_FILE)) {
      return JSON.parse(fs.readFileSync(BANNERS_FILE, "utf-8") || "[]");
    }
  } catch (_) {}
  return [];
};

export const saveServerBanner = (ban) => {
  try {
    const list = readServerBanners();
    const id = ban._id || ban.id;
    const updated = [ban, ...list.filter((b) => (b._id || b.id) !== id)];
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (_) {}
  return [];
};

export const deleteServerBanner = (id) => {
  try {
    const list = readServerBanners();
    const updated = list.filter((b) => (b._id || b.id) !== id);
    fs.writeFileSync(BANNERS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (_) {}
  return [];
};

// 1. Dashboard Stats
export const getDashboardStats = async (req, res) => {
  try {
    const [products, orders, users, categories, banners] = await Promise.all([
      getFirestoreDocs("products", 500),
      getFirestoreDocs("orders", 500),
      getFirestoreDocs("users", 500),
      getFirestoreDocs("categories", 200),
      getFirestoreDocs("homebanners", 100),
    ]);

    // Calculate total revenue
    const totalRevenue = orders.reduce(
      (sum, o) => sum + (Number(o.amount) || 0),
      0
    );

    // Sort recent orders by date descending
    const sortedOrders = [...orders].sort(
      (a, b) => (Number(b.date) || 0) - (Number(a.date) || 0)
    );

    return res.json({
      success: true,
      stats: {
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products.length,
        totalUsers: users.length,
        totalCategories: categories.length,
        totalBanners: banners.length,
      },
      recentOrders: sortedOrders.slice(0, 6),
      topProducts: products.slice(0, 6),
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 2. All Categories from Firebase & Server File Backup
export const getAllCategories = async (req, res) => {
  try {
    let categories = [];

    // 1. Read Server Registry
    try {
      const serverCats = readServerCategories();
      if (Array.isArray(serverCats) && serverCats.length > 0) {
        categories = [...serverCats];
      }
    } catch (_) {}

    // 2. Read from Firestore
    try {
      const firestoreCats = await getFirestoreDocs("categories", 300);
      if (Array.isArray(firestoreCats) && firestoreCats.length > 0) {
        firestoreCats.forEach((fc) => {
          if (!categories.some((c) => (c._id || c.id) === (fc._id || fc.id))) {
            categories.push(fc);
          }
        });
      }
    } catch (_) {}

    const mainCats = categories.filter((c) => !c.parentId);
    const subCats = categories.filter((c) => c.parentId);

    const enrichedMains = mainCats.map((m) => {
      const children = subCats
        .filter((s) => String(s.parentId) === String(m._id || m.id))
        .map((s) => ({ _id: s._id || s.id, name: s.name?.trim() || "Subcategory" }));

      // Also merge any existing subCategories array on the document
      const docSubs = Array.isArray(m.subCategories || m.subcategories)
        ? (m.subCategories || m.subcategories).map((s) =>
            typeof s === "object" ? s : { _id: `sub_${s}`, name: String(s) }
          )
        : [];

      const allSubcategories = [...children, ...docSubs];
      // remove duplicate names
      const uniqueSubs = [];
      const seen = new Set();
      for (const s of allSubcategories) {
        if (!seen.has(s.name?.toLowerCase())) {
          seen.add(s.name?.toLowerCase());
          uniqueSubs.push(s);
        }
      }

      const colorVal = m.color
        ? m.color.startsWith("#")
          ? m.color
          : `#${m.color}`
        : "#f59e0b";

      return {
        _id: m._id || m.id,
        name: m.name,
        slug: m.slug || m.name?.toLowerCase().replace(/\s+/g, "-"),
        color: colorVal,
        images: m.images || (m.image ? [m.image] : []),
        image: (m.images && m.images[0]) || m.image || "",
        subcategories: uniqueSubs,
        subCategories: uniqueSubs.map((s) => s.name),
      };
    });

    return res.json({
      success: true,
      categories: enrichedMains.length > 0 ? enrichedMains : categories,
      allCount: categories.length,
    });
  } catch (error) {
    console.error("getAllCategories error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 3. Add Category
export const addCategory = async (req, res) => {
  try {
    const { name, color, image, images, subCategories, id, _id } = req.body;
    if (!name)
      return res.json({ success: false, message: "Category name is required" });

    const cleanName = name.trim();
    const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_");

    const formattedColor = color
      ? color.startsWith("#")
        ? color
        : `#${color}`
      : "#f59e0b";
    const imageArray =
      images && Array.isArray(images) ? images : image ? [image] : [];

    const docId = _id || id || `cat_${slug}`;

    const newCat = {
      _id: docId,
      id: docId,
      name: cleanName,
      slug: cleanName.toLowerCase().replace(/\s+/g, "-"),
      images: imageArray,
      image: imageArray[0] || "",
      color: formattedColor,
      subCategories: Array.isArray(subCategories) ? subCategories : [],
      createdAt: new Date().toISOString(),
    };

    // 1. File Persistence
    saveServerCategory(newCat);

    // 2. Sync to Firebase Firestore
    try {
      await setFirestoreDoc("categories", docId, newCat);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "🏷️ NEW CATEGORY DROP",
      message: `Explore new "${cleanName}" collection at Vraj Creation!`,
      type: "category",
      data: { category: cleanName, id: docId },
    });

    return res.json({
      success: true,
      message: "Category added successfully in Firebase",
      category: newCat,
    });
  } catch (error) {
    console.error("addCategory error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 4. Update Category
export const updateCategory = async (req, res) => {
  try {
    const { id, name, color, images, subCategories } = req.body;
    if (!id) return res.json({ success: false, message: "Category ID is required" });

    const currentCats = readServerCategories();
    const existing = currentCats.find((c) => (c._id || c.id) === id) || {};

    const updateFields = {};
    if (name) {
      updateFields.name = name.trim();
      updateFields.slug = name.trim().toLowerCase().replace(/\s+/g, "-");
    }
    if (color) {
      updateFields.color = color.startsWith("#") ? color : `#${color}`;
    }
    if (images) {
      updateFields.images = Array.isArray(images) ? images : [images];
      updateFields.image = updateFields.images[0] || "";
    }
    if (subCategories) {
      updateFields.subCategories = Array.isArray(subCategories)
        ? subCategories
        : [subCategories];
    }
    updateFields.updatedAt = new Date().toISOString();

    const merged = { ...existing, ...updateFields, _id: id, id };
    saveServerCategory(merged);

    // Firebase Sync
    try {
      await updateFirestoreDocFields("categories", id, updateFields);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "🏷️ CATEGORY UPDATED",
      message: `Category "${name || existing.name || "Collection"}" details have been updated.`,
      type: "category",
      data: { id, name: name || existing.name },
    });

    return res.json({
      success: true,
      message: "Category updated successfully in Firebase",
      category: merged,
    });
  } catch (error) {
    console.error("updateCategory error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 5. Delete Category
export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id)
      return res.json({ success: false, message: "Category ID required" });

    deleteServerCategory(id);
    try {
      await deleteFirestoreDoc("categories", id);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "🏷️ CATEGORY REMOVED",
      message: "Category collection updated by Admin.",
      type: "category",
      data: { id },
    });

    return res.json({
      success: true,
      message: "Category deleted successfully from Firebase",
    });
  } catch (error) {
    console.error("deleteCategory error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 6. All Banners from Firebase & Local Server Backup
export const getAllBanners = async (req, res) => {
  try {
    let banners = [];

    // 1. Read Server Registry
    try {
      const serverBanners = readServerBanners();
      if (Array.isArray(serverBanners) && serverBanners.length > 0) {
        banners = [...serverBanners];
      }
    } catch (_) {}

    // 2. Read from Firestore
    try {
      const firestoreBanners = await getFirestoreDocs("homebanners", 100);
      if (Array.isArray(firestoreBanners) && firestoreBanners.length > 0) {
        firestoreBanners.forEach((fb) => {
          if (!banners.some((b) => (b._id || b.id) === (fb._id || fb.id))) {
            banners.push(fb);
          }
        });
      }
    } catch (_) {}

    banners.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    return res.json({ success: true, banners });
  } catch (error) {
    console.error("getAllBanners error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// Upload Media (Videos & Images to Cloudinary)
export const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.json({ success: false, message: "No file provided" });
    }

    const isVideo =
      (req.file.mimetype && req.file.mimetype.startsWith("video/")) ||
      (req.file.originalname && /\.(mp4|webm|mov|avi|mkv)$/i.test(req.file.originalname));

    let result;
    try {
      result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: isVideo ? "video" : "auto",
        folder: "hero_banners",
      });
    } catch (uploadError) {
      console.warn("Direct upload error, trying upload_large fallback:", uploadError.message);
      result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_large(
          req.file.path,
          {
            resource_type: isVideo ? "video" : "auto",
            folder: "hero_banners",
            chunk_size: 6000000,
          },
          (err, res) => {
            if (err) reject(err);
            else resolve(res);
          }
        );
      });
    }

    return res.json({
      success: true,
      url: result.secure_url || result.url,
      public_id: result.public_id,
      format: result.format,
      resource_type: result.resource_type,
    });
  } catch (error) {
    console.error("uploadMedia error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 7. Add Banner
export const addBanner = async (req, res) => {
  try {
    const {
      id,
      _id,
      name,
      bannerTitle,
      imageUrl,
      video,
      mediaUrl,
      mediaType,
      subtitle,
      tag,
      badgeTag,
      order,
      displayOrder,
      title1,
      title2,
      tagline,
      link,
      catName,
      subCatName,
      productName,
    } = req.body;

    const isVid =
      mediaType === "video" ||
      Boolean(video) ||
      (imageUrl &&
        (imageUrl.endsWith(".mp4") ||
          imageUrl.endsWith(".webm") ||
          imageUrl.includes("/video/upload/")));

    const docId = _id || id || `ban_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const bannerDoc = {
      _id: docId,
      id: docId,
      name: name || `${title1 || ""} ${title2 || ""}`.trim() || bannerTitle || "Hero Slide",
      bannerTitle: bannerTitle || name || "Hero Slide",
      imageUrl: imageUrl || (!isVid ? (video || mediaUrl || "") : ""),
      video: video || (isVid ? (imageUrl || mediaUrl || "") : ""),
      mediaUrl: mediaUrl || video || imageUrl || "",
      mediaType: isVid ? "video" : "image",
      subtitle: subtitle || tag || badgeTag || "",
      tag: tag || badgeTag || subtitle || "",
      badgeTag: badgeTag || tag || subtitle || "",
      order: order !== undefined ? Number(order) : (displayOrder !== undefined ? Number(displayOrder) : 1),
      displayOrder: displayOrder !== undefined ? Number(displayOrder) : (order !== undefined ? Number(order) : 1),
      title1: title1 || "",
      title2: title2 || "",
      tagline: tagline || "",
      link: link || "/collection",
      catName: catName || "Fashion",
      subCatName: subCatName || "",
      productName: productName || "",
      createdAt: new Date().toISOString(),
    };

    saveServerBanner(bannerDoc);
    try {
      await setFirestoreDoc("homebanners", docId, bannerDoc);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "🌟 NEW COUTURE DROP",
      message: `${title1 || ""} ${title2 || ""}: ${subtitle || "New showcase live!"}`.trim(),
      type: "banner",
      data: { bannerId: docId },
    });

    return res.json({
      success: true,
      message: "Banner added successfully in Firebase",
      banner: bannerDoc,
    });
  } catch (error) {
    console.error("addBanner error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 8. Update Banner
export const updateBanner = async (req, res) => {
  try {
    const { id, _id } = req.body;
    const targetId = id || _id;
    if (!targetId) return res.json({ success: false, message: "Banner ID is required" });

    const currentBanners = readServerBanners();
    const existing = currentBanners.find((b) => (b._id || b.id) === targetId) || {};
    const updated = { ...existing, ...req.body, _id: targetId, id: targetId, updatedAt: new Date().toISOString() };

    saveServerBanner(updated);
    try {
      await updateFirestoreDocFields("homebanners", targetId, req.body);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "🌟 BANNER UPDATED",
      message: `Hero showcase updated by Atelier.`,
      type: "banner",
      data: { bannerId: targetId },
    });

    return res.json({
      success: true,
      message: "Banner updated successfully in Firebase",
      banner: updated,
    });
  } catch (error) {
    console.error("updateBanner error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 9. Delete Banner
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ success: false, message: "Banner ID is required" });

    deleteServerBanner(id);
    try {
      await deleteFirestoreDoc("homebanners", id);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "🌟 BANNER REMOVED",
      message: "Hero banners updated by Atelier.",
      type: "banner",
      data: { bannerId: id },
    });

    return res.json({
      success: true,
      message: "Banner deleted successfully from Firebase",
    });
  } catch (error) {
    console.error("deleteBanner error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 9. Product RAMs
export const getProductRams = async (req, res) => {
  try {
    const rams = await getFirestoreDocs("productrams", 100);
    return res.json({ success: true, rams });
  } catch (error) {
    console.error("getProductRams error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const addProductRam = async (req, res) => {
  try {
    const { productRam } = req.body;
    if (!productRam)
      return res.json({ success: false, message: "productRam is required" });

    const created = await addFirestoreDoc(
      "productrams",
      { productRam: String(productRam).trim(), createdAt: new Date().toISOString() },
      "ram"
    );

    return res.json({
      success: true,
      message: "RAM option added successfully",
      ram: created,
    });
  } catch (error) {
    console.error("addProductRam error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const deleteProductRam = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ success: false, message: "RAM ID required" });

    await deleteFirestoreDoc("productrams", id);
    return res.json({ success: true, message: "RAM option deleted successfully" });
  } catch (error) {
    console.error("deleteProductRam error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 10. Product Weights
export const getProductWeights = async (req, res) => {
  try {
    const weights = await getFirestoreDocs("productweights", 100);
    return res.json({ success: true, weights });
  } catch (error) {
    console.error("getProductWeights error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const addProductWeight = async (req, res) => {
  try {
    const { productWeight } = req.body;
    if (!productWeight)
      return res.json({ success: false, message: "productWeight is required" });

    const created = await addFirestoreDoc(
      "productweights",
      {
        productWeight: String(productWeight).trim(),
        createdAt: new Date().toISOString(),
      },
      "wt"
    );

    return res.json({
      success: true,
      message: "Weight option added successfully",
      weight: created,
    });
  } catch (error) {
    console.error("addProductWeight error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const deleteProductWeight = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ success: false, message: "Weight ID required" });

    await deleteFirestoreDoc("productweights", id);
    return res.json({
      success: true,
      message: "Weight option deleted successfully",
    });
  } catch (error) {
    console.error("deleteProductWeight error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 11. Product Sizes
export const getProductSizes = async (req, res) => {
  try {
    const sizes = await getFirestoreDocs("productsizes", 100);
    return res.json({ success: true, sizes });
  } catch (error) {
    console.error("getProductSizes error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const addProductSize = async (req, res) => {
  try {
    const { size } = req.body;
    if (!size) return res.json({ success: false, message: "Size is required" });

    const created = await addFirestoreDoc(
      "productsizes",
      { size: String(size).trim(), createdAt: new Date().toISOString() },
      "sz"
    );

    return res.json({
      success: true,
      message: "Size option added successfully",
      size: created,
    });
  } catch (error) {
    console.error("addProductSize error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const deleteProductSize = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ success: false, message: "Size ID required" });

    await deleteFirestoreDoc("productsizes", id);
    return res.json({ success: true, message: "Size option deleted successfully" });
  } catch (error) {
    console.error("deleteProductSize error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 12. Subcategories
export const addSubCategory = async (req, res) => {
  try {
    const { name, category, parent, parentId } = req.body;
    if (!name)
      return res.json({ success: false, message: "Subcategory name is required" });

    const parentCatId = parentId || parent || category || "";
    const cleanName = name.trim();
    const subSlug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    const parentSlug = parentCatId ? String(parentCatId).toLowerCase().replace(/[^a-z0-9]/g, "_") : "gen";
    const docId = req.body._id || req.body.id || `sub_${parentSlug}_${subSlug}`;

    const subDoc = {
      _id: docId,
      id: docId,
      name: cleanName,
      parentId: parentCatId || null,
      createdAt: new Date().toISOString(),
    };

    try {
      await setFirestoreDoc("subcategories", docId, subDoc);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "✨ NEW SUBCATEGORY DROP",
      message: `New subcategory "${cleanName}" is now live!`,
      type: "subcategory",
      data: { subCategoryId: docId, name: cleanName },
    });

    // Also update parent category doc if possible
    if (parentCatId) {
      try {
        const parentCat = await getFirestoreDoc("categories", parentCatId);
        if (parentCat) {
          const existingSubs = Array.isArray(parentCat.subCategories)
            ? parentCat.subCategories
            : [];
          if (!existingSubs.includes(cleanName)) {
            await updateFirestoreDocFields("categories", parentCatId, {
              subCategories: [...existingSubs, cleanName],
            });
          }
        }
      } catch (_) {}
    }

    return res.json({
      success: true,
      message: "Subcategory added successfully in Firebase",
      subCategory: subDoc,
    });
  } catch (error) {
    console.error("addSubCategory error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const { id, name, parentId } = req.body;
    if (!id && !name)
      return res.json({ success: false, message: "SubCategory ID or Name required" });

    if (id) {
      try {
        await deleteFirestoreDoc("subcategories", id);
      } catch (_) {}
    }

    if (parentId && name) {
      try {
        const parentCat = await getFirestoreDoc("categories", parentId);
        if (parentCat) {
          const existingSubs = Array.isArray(parentCat.subCategories)
            ? parentCat.subCategories
            : [];
          const filtered = existingSubs.filter(
            (s) =>
              (typeof s === "string" ? s : s.name)?.toLowerCase().trim() !==
              name.toLowerCase().trim()
          );
          await updateFirestoreDocFields("categories", parentId, {
            subCategories: filtered,
          });
        }
      } catch (_) {}
    }

    return res.json({
      success: true,
      message: "Subcategory deleted successfully from Firebase",
    });
  } catch (error) {
    console.error("deleteSubCategory error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 13. Reviews
export const getAllReviews = async (req, res) => {
  try {
    const reviews = await getFirestoreDocs("reviews", 200);
    return res.json({ success: true, reviews });
  } catch (error) {
    console.error("getAllReviews error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ success: false, message: "Review ID required" });

    await deleteFirestoreDoc("reviews", id);
    return res.json({ success: true, message: "Review deleted successfully" });
  } catch (error) {
    console.error("deleteReview error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 14. Delete Order (Admin)
export const deleteOrderAdmin = async (req, res) => {
  try {
    const { id, orderId } = req.body;
    const targetId = id || orderId;
    if (!targetId)
      return res.json({ success: false, message: "Order ID required" });

    await deleteFirestoreDoc("orders", targetId);
    return res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error("deleteOrderAdmin error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 15. All Users (Admin)
export const getAllUsersAdmin = async (req, res) => {
  try {
    let combined = [];

    // 1. Read Server Registry
    try {
      const serverUsers = readServerUsers();
      if (Array.isArray(serverUsers)) {
        combined = serverUsers.map((u) => {
          const { password, rawPassword, ...safe } = u;
          return safe;
        });
      }
    } catch (_) {}

    // 2. Fetch from Firestore Docs
    try {
      const firestoreUsers = await getFirestoreDocs("users", 300);
      if (Array.isArray(firestoreUsers)) {
        firestoreUsers.forEach((fu) => {
          const { password, rawPassword, ...safe } = fu;
          if (!combined.some((u) => u.email === safe.email || u._id === safe._id)) {
            combined.push(safe);
          }
        });
      }
    } catch (_) {}

    return res.json({ success: true, users: combined });
  } catch (error) {
    console.error("getAllUsersAdmin error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 16. Delete User (Admin)
export const deleteUserAdmin = async (req, res) => {
  try {
    const { id, userId, email } = req.body;
    const targetId = id || userId;
    if (!targetId && !email)
      return res.json({ success: false, message: "User ID or email required" });

    // 1. Delete from Server Users Registry JSON
    deleteServerUser(targetId, email);

    // 2. Delete from Firestore
    if (targetId) {
      try {
        await deleteFirestoreDoc("users", targetId);
      } catch (_) {}
    }

    return res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("deleteUserAdmin error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const editCategory = updateCategory;
export const getAllSubcategories = async (req, res) => {
  try {
    const subs = await getFirestoreDocs("subcategories", 200);
    return res.json({ success: true, subcategories: subs });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
export const addSubcategory = addSubCategory;
export const deleteSubcategory = deleteSubCategory;
export const deleteOrder = deleteOrderAdmin;
export const getAllUsers = getAllUsersAdmin;
export const deleteUser = deleteUserAdmin;
