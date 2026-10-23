const PROJECT_ID = "ecommerce-mern-main";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper: Local Storage Registry Persistence
export function getLocalRegistry(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveLocalRegistry(key, item, idKey = "_id") {
  try {
    const current = getLocalRegistry(key);
    const idVal = item[idKey] || item.id || item._id;
    const updated = [
      item,
      ...current.filter((i) => (i[idKey] || i.id || i._id) !== idVal),
    ];
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (_) {
    return [];
  }
}

export function deleteLocalRegistry(key, id, idKey = "_id") {
  try {
    const current = getLocalRegistry(key);
    const updated = current.filter((i) => (i[idKey] || i.id || i._id) !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    return updated;
  } catch (_) {
    return [];
  }
}

// Helper: Convert Firestore REST JSON to normal JS object
export function parseFirestoreField(field) {
  if (!field) return null;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.arrayValue && field.arrayValue.values) {
    return field.arrayValue.values.map(parseFirestoreField);
  }
  if (field.mapValue && field.mapValue.fields) {
    const obj = {};
    for (const [k, v] of Object.entries(field.mapValue.fields)) {
      obj[k] = parseFirestoreField(v);
    }
    return obj;
  }
  return null;
}

export function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const fields = doc.fields || {};
  const data = {
    _id: doc.name.split("/").pop(),
    createTime: doc.createTime,
  };
  for (const [key, val] of Object.entries(fields)) {
    data[key] = parseFirestoreField(val);
  }
  if (!data.createdAt && doc.createTime) {
    data.createdAt = doc.createTime;
  }
  return data;
}

// Helper: Determine Source App Platform for Orders, Reviews, Subscribers, Users
export function getPlatformBadge(item) {
  if (!item) {
    return {
      label: "Web Storefront",
      shortLabel: "Web Store",
      icon: "🌐",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    };
  }

  const p = String(
    item.platform ||
    item.source ||
    item.sourceApp ||
    item.app ||
    item.device ||
    ""
  ).toLowerCase();

  const id = String(item._id || item.id || item.orderId || "").toLowerCase();
  const email = String(item.email || item.userEmail || item.customerEmail || "").toLowerCase();
  const role = String(item.role || "").toLowerCase();

  if (p.includes("react") || p.includes("rn")) {
    return {
      label: "Mobile React Native",
      shortLabel: "React Native",
      icon: "⚛️",
      badgeClass: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    };
  }
  if (p.includes("android")) {
    return {
      label: "Mobile Android",
      shortLabel: "Android",
      icon: "🤖",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };
  }
  if (p.includes("flutter")) {
    return {
      label: "Mobile Flutter",
      shortLabel: "Flutter",
      icon: "💙",
      badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    };
  }
  if (p.includes("admin") || role === "admin" || email.includes("admin")) {
    return {
      label: "Admin Panel CMS",
      shortLabel: "Admin CMS",
      icon: "⚡",
      badgeClass: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    };
  }
  return {
    label: "Web Storefront",
    shortLabel: "Web Store",
    icon: "🌐",
    badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  };
}

// Helper: Format Date and Time
export function formatDateTime(rawDate, fallbackDate = null) {
  const candidate = rawDate || fallbackDate;
  if (!candidate) return { date: "Recently", time: "", full: "Recently" };
  const num = Number(candidate);
  const d = !isNaN(num) && num > 1000000000 ? new Date(num) : new Date(candidate);
  if (isNaN(d.getTime())) return { date: String(candidate).slice(0, 16), time: "", full: String(candidate) };

  const dateStr = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return { date: dateStr, time: timeStr, full: `${dateStr} • ${timeStr}` };
}

// Helper: Extract true dynamic Customer Name from any order document across all 4 platforms
export function getOrderCustomerName(order) {
  if (!order) return "Customer";

  const addr = typeof order.address === "object" && order.address !== null ? order.address : {};

  // Check in priority order:
  const candidateNames = [
    order.customerName,
    order.fullName,
    addr.fullName,
    `${addr.firstName || ""} ${addr.lastName || ""}`.trim(),
    `${order.firstName || ""} ${order.lastName || ""}`.trim(),
    addr.name,
    addr.firstName,
    order.firstName,
    order.name,
  ];

  for (const cand of candidateNames) {
    if (cand && typeof cand === "string") {
      const clean = cand.trim();
      if (
        clean &&
        clean !== "Valued Patron" &&
        clean !== "Guest Patron" &&
        clean !== "Patron" &&
        clean !== "undefined" &&
        clean !== "undefined undefined" &&
        clean !== "null"
      ) {
        return clean;
      }
    }
  }

  // If no name found, check emails
  const emailCandidates = [
    order.customerEmail,
    order.userEmail,
    order.email,
    addr.email,
    order.userId,
  ];
  for (const em of emailCandidates) {
    if (em && typeof em === "string") {
      const clean = em.trim();
      if (clean && clean.includes("@")) {
        const prefix = clean.split("@")[0];
        if (prefix) return prefix.charAt(0).toUpperCase() + prefix.slice(1);
      }
    }
  }

  // If phone exists
  const phone = order.phone || addr.phone;
  if (phone && typeof phone === "string" && phone.trim()) {
    return `Buyer (${phone.trim()})`;
  }

  return "Customer";
}

// Helper: Convert JS values to Firestore REST fields format
export function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === "boolean") return { booleanValue: val };
  if (typeof val === "number") {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (typeof val === "string") return { stringValue: val };
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === "object") {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (k !== "_id") fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

// ==================== SMART CACHE ====================
const ADMIN_CACHE_TTL = 3 * 60 * 1000;
const adminMemCache = new Map();

function getAdminCache(key) {
  if (adminMemCache.has(key)) {
    const entry = adminMemCache.get(key);
    if (Date.now() - entry.timestamp < ADMIN_CACHE_TTL) {
      return entry.data;
    }
  }
  return null;
}

function setAdminCache(key, data) {
  adminMemCache.set(key, { data, timestamp: Date.now() });
}

export function clearAdminCache(key = null) {
  if (key) adminMemCache.delete(key);
  else adminMemCache.clear();
}

// ==================== PRODUCTS ====================

export const getFirestoreProducts = async (forceRefresh = false) => {
  if (!forceRefresh) {
    const cached = getAdminCache("products");
    if (cached && Array.isArray(cached) && cached.length > 0) return cached;
  }

  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/products?pageSize=500`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        setAdminCache("products", list);
        try {
          localStorage.setItem("local_products_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {
    console.error("Firestore getProducts error:", error);
  }

  const local = getLocalRegistry("local_products_registry");
  return local.length > 0 ? local : list;
};

export const getFirestoreProduct = async (id) => {
  try {
    const res = await fetch(`${BASE_URL}/products/${id}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.fields) {
        return parseFirestoreDoc(data);
      }
    }
  } catch (error) {}

  const localList = getLocalRegistry("local_products_registry");
  return localList.find((p) => (p._id || p.id) === id) || null;
};

export const addFirestoreProduct = async (productData) => {
  const docId =
    productData._id ||
    productData.id ||
    `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const prod = {
    _id: docId,
    id: docId,
    name: productData.name ? String(productData.name).trim() : "Product",
    description: productData.description ? String(productData.description).trim() : "",
    price: Number(productData.price) || 0,
    oldPrice: productData.oldPrice !== undefined && productData.oldPrice !== "" ? Number(productData.oldPrice) : null,
    discount: Number(productData.discount) || 0,
    category: productData.category ? String(productData.category).trim() : "General",
    subCategory: productData.subCategory ? String(productData.subCategory).trim() : "",
    brand: productData.brand ? String(productData.brand).trim() : "",
    stock: productData.stock !== undefined ? Number(productData.stock) : 15,
    sizes: Array.isArray(productData.sizes) ? productData.sizes : [],
    productRam: Array.isArray(productData.productRam) ? productData.productRam : [],
    productWeight: Array.isArray(productData.productWeight) ? productData.productWeight : [],
    colors: Array.isArray(productData.colors) ? productData.colors : [],
    image: Array.isArray(productData.image) ? productData.image : (productData.image ? [productData.image] : []),
    images: Array.isArray(productData.images) ? productData.images : (Array.isArray(productData.image) ? productData.image : []),
    bestseller: !!productData.bestseller,
    rating: Number(productData.rating) || 5.0,
    date: productData.date || Date.now(),
    createdAt: new Date().toISOString(),
  };

  // 1. Immediately save locally
  saveLocalRegistry("local_products_registry", prod);

  // 2. Sync to Firestore in background
  try {
    const fields = {};
    for (const [k, v] of Object.entries(prod)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/products/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    broadcastAdminNotification(
      "✨ NEW COLLECTION ADDED",
      `${prod.name} is now available in ${prod.category} at ₹${prod.price}!`,
      "product",
      { productId: docId }
    ).catch(() => {});
  } catch (e) {}

  return { success: true, product: prod };
};

export const updateFirestoreProduct = async (id, updateFields) => {
  const localList = getLocalRegistry("local_products_registry");
  const existing = localList.find((p) => (p._id || p.id) === id) || {};
  const updated = { ...existing, ...updateFields, _id: id, id, updatedAt: new Date().toISOString() };

  saveLocalRegistry("local_products_registry", updated);

  try {
    const fieldPaths = Object.keys(updateFields)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const fields = {};
    for (const [k, v] of Object.entries(updateFields)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/products/${id}?${fieldPaths}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    broadcastAdminNotification(
      "✨ PRODUCT UPDATED",
      `${updated.name || "Product"} details have been updated by Atelier.`,
      "product",
      { productId: id }
    ).catch(() => {});
  } catch (e) {
    console.error("updateFirestoreProduct error:", e);
  }

  return { success: true, product: updated };
};

export const deleteFirestoreProduct = async (id) => {
  deleteLocalRegistry("local_products_registry", id);
  try {
    await fetch(`${BASE_URL}/products/${id}`, { method: "DELETE" });
    broadcastAdminNotification(
      "🗑️ PRODUCT REMOVED",
      "A product has been archived from the collection.",
      "product",
      { productId: id }
    ).catch(() => {});
  } catch (e) {}
  return { success: true };
};

// ==================== CATEGORIES ====================

export const getFirestoreCategories = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/categories?pageSize=200`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_categories_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_categories_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreCategory = async (catData) => {
  const cleanName = catData.name?.trim() || "Exclusive";
  const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const docId = catData._id || catData.id || `cat_${slug}`;
  const cat = {
    _id: docId,
    id: docId,
    name: cleanName,
    color: catData.color || "#10b981",
    image: catData.image || "",
    images: catData.images || (catData.image ? [catData.image] : []),
    subCategories: catData.subCategories || [],
    subcategories: catData.subcategories || [],
    createdAt: catData.createdAt || new Date().toISOString(),
  };

  saveLocalRegistry("local_categories_registry", cat);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(cat)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/categories/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    broadcastAdminNotification(
      "✨ NEW CATEGORY ADDED",
      `Category '${cat.name}' is now live in store!`,
      "category",
      { categoryId: docId }
    ).catch(() => {});
  } catch (e) {}

  return { success: true, category: cat };
};

export const updateFirestoreCategory = async (id, updateFields) => {
  const localList = getLocalRegistry("local_categories_registry");
  const existing = localList.find((c) => (c._id || c.id) === id) || {};
  const updated = { ...existing, ...updateFields, _id: id, id };

  saveLocalRegistry("local_categories_registry", updated);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(updateFields)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    broadcastAdminNotification(
      "🏷️ CATEGORY UPDATED",
      `Category '${updated.name || "Collection"}' details updated.`,
      "category",
      { categoryId: id }
    ).catch(() => {});
  } catch (e) {}

  return { success: true, category: updated };
};

export const deleteFirestoreCategory = async (id) => {
  deleteLocalRegistry("local_categories_registry", id);
  try {
    await fetch(`${BASE_URL}/categories/${id}`, { method: "DELETE" });
    broadcastAdminNotification(
      "🗑️ CATEGORY REMOVED",
      "A category has been removed from catalog.",
      "category",
      { categoryId: id }
    ).catch(() => {});
  } catch (e) {}
  return { success: true };
};

// ==================== SUBCATEGORIES ====================

export const getFirestoreSubCategories = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/subcategories?pageSize=200`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_subcategories_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_subcategories_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreSubCategory = async (subData) => {
  const subName = subData.name?.trim() || "Subcategory";
  const parentId = subData.parentId || null;
  const subSlug = subName.toLowerCase().replace(/[^a-z0-9]/g, "_");
  const parentSlug = parentId ? String(parentId).toLowerCase().replace(/[^a-z0-9]/g, "_") : "gen";
  const docId =
    subData._id ||
    subData.id ||
    `sub_${parentSlug}_${subSlug}`;
  const sub = {
    _id: docId,
    id: docId,
    name: subName,
    parentId: parentId,
    createdAt: subData.createdAt || new Date().toISOString(),
  };

  // 1. Save subcategory locally
  saveLocalRegistry("local_subcategories_registry", sub);

  // 2. Also update parent category in local_categories_registry immediately
  if (parentId) {
    const catList = getLocalRegistry("local_categories_registry");
    const parentCat = catList.find(
      (c) => (c._id || c.id) === parentId || c.name?.toLowerCase() === String(parentId).toLowerCase()
    );
    if (parentCat) {
      const existingSubs = Array.isArray(parentCat.subCategories)
        ? [...parentCat.subCategories]
        : Array.isArray(parentCat.subcategories)
        ? [...parentCat.subcategories]
        : [];
      if (
        !existingSubs.some(
          (s) =>
            (typeof s === "string" ? s : s.name)?.toLowerCase().trim() ===
            subName.toLowerCase().trim()
        )
      ) {
        existingSubs.push(subName);
        parentCat.subCategories = existingSubs;
        parentCat.subcategories = existingSubs;
        saveLocalRegistry("local_categories_registry", parentCat);
      }
    }
  }

  // 3. Sync to Firestore in background
  try {
    const fields = {};
    for (const [k, v] of Object.entries(sub)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/subcategories/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    if (parentId) {
      const catRes = await fetch(`${BASE_URL}/categories/${parentId}`);
      if (catRes.ok) {
        const catDoc = await catRes.json();
        const existingVals =
          catDoc.fields?.subCategories?.arrayValue?.values || [];
        const exists = existingVals.some(
          (v) =>
            (v.stringValue || "").toLowerCase().trim() ===
            subName.toLowerCase().trim()
        );
        if (!exists) {
          const newVals = [...existingVals, { stringValue: subName }];
          await fetch(
            `${BASE_URL}/categories/${parentId}?updateMask.fieldPaths=subCategories`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                fields: {
                  subCategories: { arrayValue: { values: newVals } },
                },
              }),
            }
          );
        }
      }
    }
  } catch (e) {}

  return { success: true, subCategory: sub };
};

export const updateFirestoreSubCategory = async (id, updateFields) => {
  const localList = getLocalRegistry("local_subcategories_registry");
  const existing = localList.find((s) => (s._id || s.id) === id) || {};
  const updated = { ...existing, ...updateFields, _id: id, id };

  saveLocalRegistry("local_subcategories_registry", updated);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(updateFields)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/subcategories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, subCategory: updated };
};

export const deleteFirestoreSubCategory = async (id, subName = null, parentId = null) => {
  deleteLocalRegistry("local_subcategories_registry", id);

  // Update parent category in local registry
  if (parentId && subName) {
    const catList = getLocalRegistry("local_categories_registry");
    const parentCat = catList.find(
      (c) => (c._id || c.id) === parentId || c.name?.toLowerCase() === String(parentId).toLowerCase()
    );
    if (parentCat) {
      const existingSubs = Array.isArray(parentCat.subCategories)
        ? parentCat.subCategories
        : Array.isArray(parentCat.subcategories)
        ? parentCat.subcategories
        : [];
      const filtered = existingSubs.filter(
        (s) =>
          (typeof s === "string" ? s : s.name)?.toLowerCase().trim() !==
          subName.toLowerCase().trim()
      );
      parentCat.subCategories = filtered;
      parentCat.subcategories = filtered;
      saveLocalRegistry("local_categories_registry", parentCat);
    }
  }

  try {
    if (id) {
      await fetch(`${BASE_URL}/subcategories/${id}`, { method: "DELETE" });
    }
    if (parentId && subName) {
      const catRes = await fetch(`${BASE_URL}/categories/${parentId}`);
      if (catRes.ok) {
        const catDoc = await catRes.json();
        const existingVals =
          catDoc.fields?.subCategories?.arrayValue?.values || [];
        const filtered = existingVals.filter(
          (v) =>
            (v.stringValue || "").toLowerCase().trim() !==
            subName.toLowerCase().trim()
        );
        await fetch(
          `${BASE_URL}/categories/${parentId}?updateMask.fieldPaths=subCategories`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                subCategories: { arrayValue: { values: filtered } },
              },
            }),
          }
        );
      }
    }
  } catch (e) {}

  return { success: true };
};

// ==================== BANNERS ====================

export const getFirestoreBanners = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/homebanners?pageSize=100&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        try {
          localStorage.setItem("local_banners_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_banners_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreBanner = async (bannerData) => {
  const docId =
    bannerData._id ||
    `ban_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const banner = {
    _id: docId,
    id: docId,
    ...bannerData,
    order: Number(bannerData.order) || Number(bannerData.displayOrder) || 1,
    createdAt: bannerData.createdAt || new Date().toISOString(),
  };

  saveLocalRegistry("local_banners_registry", banner);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(banner)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/homebanners/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    broadcastAdminNotification(
      "🌟 NEW COUTURE DROP",
      `${banner.name || banner.title1 || "Hero Banner"}: ${banner.subtitle || "New showcase live!"}`,
      "banner",
      { bannerId: docId }
    ).catch(() => {});
  } catch (e) {}

  return { success: true, banner };
};

export const updateFirestoreBanner = async (id, updateFields) => {
  const localList = getLocalRegistry("local_banners_registry");
  const existing = localList.find((b) => (b._id || b.id) === id) || {};
  const updated = { ...existing, ...updateFields, _id: id, id };

  saveLocalRegistry("local_banners_registry", updated);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(updateFields)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/homebanners/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });

    broadcastAdminNotification(
      "🌟 BANNER UPDATED",
      "Hero showcase updated by Atelier.",
      "banner",
      { bannerId: id }
    ).catch(() => {});
  } catch (e) {}

  return { success: true, banner: updated };
};

export const deleteFirestoreBanner = async (id) => {
  deleteLocalRegistry("local_banners_registry", id);
  try {
    await fetch(`${BASE_URL}/homebanners/${id}`, { method: "DELETE" });
    broadcastAdminNotification(
      "🌟 BANNER REMOVED",
      "Hero banners updated by Atelier.",
      "banner",
      { bannerId: id }
    ).catch(() => {});
  } catch (e) {}
  return { success: true };
};

// ==================== RAMs ====================

export const getFirestoreProductRams = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/productrams?pageSize=100`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_rams_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_rams_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreProductRam = async (ram) => {
  const docId = `ram_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const item = {
    _id: docId,
    id: docId,
    productRam: ram,
    createdAt: new Date().toISOString(),
  };

  saveLocalRegistry("local_rams_registry", item);

  try {
    const fields = {
      productRam: toFirestoreValue(ram),
      createdAt: toFirestoreValue(item.createdAt),
    };
    await fetch(`${BASE_URL}/productrams/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, ram: item };
};

export const deleteFirestoreProductRam = async (id) => {
  deleteLocalRegistry("local_rams_registry", id);
  try {
    await fetch(`${BASE_URL}/productrams/${id}`, { method: "DELETE" });
  } catch (e) {}
  return { success: true };
};

// ==================== WEIGHTS ====================

export const getFirestoreProductWeights = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/productweights?pageSize=100`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_weights_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_weights_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreProductWeight = async (weight) => {
  const docId = `wt_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const item = {
    _id: docId,
    id: docId,
    productWeight: weight,
    createdAt: new Date().toISOString(),
  };

  saveLocalRegistry("local_weights_registry", item);

  try {
    const fields = {
      productWeight: toFirestoreValue(weight),
      createdAt: toFirestoreValue(item.createdAt),
    };
    await fetch(`${BASE_URL}/productweights/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, weight: item };
};

export const deleteFirestoreProductWeight = async (id) => {
  deleteLocalRegistry("local_weights_registry", id);
  try {
    await fetch(`${BASE_URL}/productweights/${id}`, { method: "DELETE" });
  } catch (e) {}
  return { success: true };
};

// ==================== SIZES ====================

export const getFirestoreProductSizes = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/productsizes?pageSize=100`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_sizes_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_sizes_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreProductSize = async (size) => {
  const docId = `sz_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const item = {
    _id: docId,
    id: docId,
    size: size,
    createdAt: new Date().toISOString(),
  };

  saveLocalRegistry("local_sizes_registry", item);

  try {
    const fields = {
      size: toFirestoreValue(size),
      createdAt: toFirestoreValue(item.createdAt),
    };
    await fetch(`${BASE_URL}/productsizes/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, size: item };
};

export const deleteFirestoreProductSize = async (id) => {
  deleteLocalRegistry("local_sizes_registry", id);
  try {
    await fetch(`${BASE_URL}/productsizes/${id}`, { method: "DELETE" });
  } catch (e) {}
  return { success: true };
};

// ==================== REVIEWS ====================

export const getFirestoreReviews = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/reviews?pageSize=200`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_reviews_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_reviews_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreReview = async (reviewData) => {
  const docId =
    reviewData._id ||
    `rev_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const rev = {
    _id: docId,
    id: docId,
    name: reviewData.name || "Customer",
    comment: reviewData.comment || "",
    rating: Number(reviewData.rating) || 5,
    productId: reviewData.productId || "",
    productName: reviewData.productName || "",
    date: reviewData.date || Date.now(),
    createdAt: new Date().toISOString(),
  };

  saveLocalRegistry("local_reviews_registry", rev);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(rev)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/reviews/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, review: rev };
};

export const deleteFirestoreReview = async (id) => {
  deleteLocalRegistry("local_reviews_registry", id);
  try {
    await fetch(`${BASE_URL}/reviews/${id}`, { method: "DELETE" });
  } catch (e) {}
  return { success: true };
};

// ==================== SUBSCRIBERS ====================

export const getFirestoreSubscribers = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/subscribers?pageSize=300`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_subscribers_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_subscribers_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreSubscriber = async (email) => {
  const cleanEmail = email.toLowerCase().trim();
  const docId = `sub_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const sub = {
    _id: docId,
    id: docId,
    email: cleanEmail,
    createdAt: new Date().toISOString(),
  };

  saveLocalRegistry("local_subscribers_registry", sub);

  try {
    const fields = {
      email: toFirestoreValue(cleanEmail),
      createdAt: toFirestoreValue(sub.createdAt),
    };
    await fetch(`${BASE_URL}/subscribers/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, subscriber: sub };
};

export const deleteFirestoreSubscriber = async (id) => {
  deleteLocalRegistry("local_subscribers_registry", id);
  try {
    await fetch(`${BASE_URL}/subscribers/${id}`, { method: "DELETE" });
  } catch (e) {}
  return { success: true };
};

// ==================== ABOUT SLIDES ====================

export const getFirestoreAboutSlides = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/about_slides?pageSize=50&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        list.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
        try {
          localStorage.setItem("local_about_slides_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_about_slides_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreAboutSlide = async (slideData) => {
  const docId =
    slideData._id ||
    slideData.id ||
    `about_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  const mediaSrc = slideData.src || slideData.image || "";
  const slide = {
    _id: docId,
    id: docId,
    title: slideData.title || "Lookbook Story",
    caption: slideData.caption || slideData.description || "",
    description: slideData.caption || slideData.description || "",
    tag: slideData.tag || "LOOKBOOK",
    src: mediaSrc,
    image: mediaSrc,
    order: Number(slideData.order) || 1,
    createdAt: new Date().toISOString(),
  };

  saveLocalRegistry("local_about_slides_registry", slide);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(slide)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/about_slides/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {
    console.error("addFirestoreAboutSlide error:", e);
  }

  return { success: true, slide };
};

export const updateFirestoreAboutSlide = async (id, updateFields) => {
  const localList = getLocalRegistry("local_about_slides_registry");
  const existing = localList.find((s) => (s._id || s.id) === id) || {};
  const mediaSrc = updateFields.src || updateFields.image || existing.src || existing.image || "";
  const updated = {
    ...existing,
    ...updateFields,
    src: mediaSrc,
    image: mediaSrc,
    caption: updateFields.caption || updateFields.description || existing.caption || existing.description || "",
    description: updateFields.caption || updateFields.description || existing.caption || existing.description || "",
    _id: id,
    id,
  };

  saveLocalRegistry("local_about_slides_registry", updated);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(updated)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/about_slides/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {
    console.error("updateFirestoreAboutSlide error:", e);
  }

  return { success: true, slide: updated };
};

export const deleteFirestoreAboutSlide = async (id) => {
  deleteLocalRegistry("local_about_slides_registry", id);
  try {
    await fetch(`${BASE_URL}/about_slides/${id}`, { method: "DELETE" });
  } catch (e) {
    console.error("deleteFirestoreAboutSlide error:", e);
  }
  return { success: true };
};

// ==================== CONTACT INFO ====================

export const getFirestoreContactInfo = async () => {
  try {
    const res = await fetch(`${BASE_URL}/contact_info/main`);
    if (res.ok) {
      const data = await res.json();
      const info = parseFirestoreDoc(data);
      if (info) {
        try {
          localStorage.setItem("local_contact_info_registry", JSON.stringify(info));
        } catch (_) {}
        return info;
      }
    }
  } catch (error) {}

  try {
    const raw = localStorage.getItem("local_contact_info_registry");
    if (raw) return JSON.parse(raw);
  } catch (_) {}

  return null;
};

export const updateFirestoreContactInfo = async (contactData) => {
  try {
    localStorage.setItem("local_contact_info_registry", JSON.stringify(contactData));
  } catch (_) {}

  try {
    const fields = {};
    for (const [k, v] of Object.entries(contactData)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/contact_info/main`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, contact: contactData };
};

// ==================== ORDERS ====================

export const getFirestoreOrders = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/orders?pageSize=500`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_orders_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {}

  const local = getLocalRegistry("local_orders_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreOrder = async (orderData) => {
  const docId =
    orderData._id ||
    `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const orderDoc = {
    _id: docId,
    id: docId,
    ...orderData,
    createdAt: new Date().toISOString(),
  };

  saveLocalRegistry("local_orders_registry", orderDoc);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(orderData)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/orders/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (e) {}

  return { success: true, order: orderDoc };
};

export const updateFirestoreOrderStatus = async (id, status) => {
  const localList = getLocalRegistry("local_orders_registry");
  const existing = localList.find((o) => (o._id || o.id) === id) || {};
  const updated = { ...existing, status, _id: id, id };

  saveLocalRegistry("local_orders_registry", updated);

  try {
    await fetch(
      `${BASE_URL}/orders/${id}?updateMask.fieldPaths=status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: { status: toFirestoreValue(status) },
        }),
      }
    );
  } catch (e) {}

  return { success: true, status };
};

export const deleteFirestoreOrder = async (id) => {
  deleteLocalRegistry("local_orders_registry", id);
  try {
    await fetch(`${BASE_URL}/orders/${id}`, { method: "DELETE" });
  } catch (e) {}
  return { success: true };
};

// ==================== USERS ====================

export const getFirestoreUsers = async () => {
  let list = [];
  try {
    const res = await fetch(`${BASE_URL}/users?pageSize=100&_t=${Date.now()}`);
    if (res.ok) {
      const data = await res.json();
      if (data.documents && Array.isArray(data.documents)) {
        list = data.documents.map(parseFirestoreDoc).filter(Boolean);
        try {
          localStorage.setItem("local_users_registry", JSON.stringify(list));
        } catch (_) {}
        return list;
      }
    }
  } catch (error) {
    console.warn("Firestore getFirestoreUsers error:", error);
  }

  const local = getLocalRegistry("local_users_registry");
  return local.length > 0 ? local : list;
};

export const addFirestoreUser = async (userData) => {
  const cleanEmail = (userData.email || "").toLowerCase().trim();
  const docId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
  const existing = getLocalRegistry("local_users_registry").find(
    (u) => (u.email || "").toLowerCase() === cleanEmail
  );
  const createdAt =
    userData.createdAt || existing?.createdAt || existing?.createTime || new Date().toISOString();

  const user = {
    _id: docId,
    id: docId,
    name: userData.name || "Customer",
    email: cleanEmail,
    phone: userData.phone || userData.phoneNumber || "",
    phoneNumber: userData.phone || userData.phoneNumber || "",
    role: userData.role || (cleanEmail.includes("admin") ? "admin" : "customer"),
    platform:
      userData.platform ||
      (cleanEmail.includes("admin") ? "Admin CMS" : "Web Storefront"),
    createdAt: createdAt,
  };

  saveLocalRegistry("local_users_registry", user);

  try {
    const fields = {};
    for (const [k, v] of Object.entries(user)) {
      if (k !== "_id" && k !== "id") fields[k] = toFirestoreValue(v);
    }
    await fetch(`${BASE_URL}/users/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
  } catch (_) {}

  return user;
};

export const deleteFirestoreUser = async (id) => {
  deleteLocalRegistry("local_users_registry", id);
  try {
    await fetch(`${BASE_URL}/users/${id}`, { method: "DELETE" });
  } catch (_) {}
  return { success: true };
};

// ==================== LIVE NOTIFICATIONS BROADCAST ====================

export const broadcastAdminNotification = async (
  title,
  message,
  type = "adminBroadcast",
  data = {}
) => {
  try {
    const docId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const fields = {
      _id: toFirestoreValue(docId),
      id: toFirestoreValue(docId),
      title: toFirestoreValue(title || "📢 VRAJ CREATION UPDATE"),
      message: toFirestoreValue(message || "New dynamic update from Admin."),
      body: toFirestoreValue(message || "New dynamic update from Admin."),
      type: toFirestoreValue(type || "adminBroadcast"),
      data: toFirestoreValue(data || {}),
      isRead: toFirestoreValue(false),
      date: toFirestoreValue(Date.now()),
      createdAt: toFirestoreValue(new Date().toISOString()),
      timestamp: toFirestoreValue(Date.now()),
    };

    // Broadcast to single authoritative admin_notifications collection in Firestore
    await fetch(`${BASE_URL}/admin_notifications/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    console.log(`📢 [ADMIN LIVE BROADCAST] Dispatched single notification: "${title}" (${docId})`);
    return { success: true, id: docId };
  } catch (e) {
    console.error("broadcastAdminNotification error:", e);
    return { success: false };
  }
};
