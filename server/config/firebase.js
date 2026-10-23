// Firebase Firestore REST Service for Server
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "ecommerce-mern-main";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// Helper: Convert Firestore REST JSON field to normal JS value
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

// Helper: Parse a full Firestore Document JSON into a JS object
export function parseFirestoreDoc(doc) {
  if (!doc || !doc.fields) return null;
  const fields = doc.fields || {};
  const data = { _id: doc.name.split("/").pop() };
  for (const [key, val] of Object.entries(fields)) {
    data[key] = parseFirestoreField(val);
  }
  return data;
}

// Helper: Convert normal JS values into Firestore REST format
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

// Generic Firestore Operations with In-Memory Caching (5-minute TTL)
const CACHE_TTL_MS = 5 * 60 * 1000;
const serverCache = new Map();

export const clearServerFirestoreCache = (collection = null) => {
  if (collection) {
    for (const key of serverCache.keys()) {
      if (key.startsWith(`${collection}_`) || key === collection) {
        serverCache.delete(key);
      }
    }
  } else {
    serverCache.clear();
  }
};

export const getFirestoreDocs = async (collection, pageSize = 500, forceRefresh = false) => {
  const cacheKey = `${collection}_${pageSize}`;
  const now = Date.now();

  if (!forceRefresh && serverCache.has(cacheKey)) {
    const entry = serverCache.get(cacheKey);
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  }

  try {
    const res = await fetch(`${BASE_URL}/${collection}?pageSize=${pageSize}`);
    const data = await res.json();
    if (data.documents && Array.isArray(data.documents)) {
      const docs = data.documents.map(parseFirestoreDoc).filter(Boolean);
      serverCache.set(cacheKey, { data: docs, timestamp: now });
      return docs;
    }
    return [];
  } catch (error) {
    console.error(`Firestore getFirestoreDocs [${collection}] error:`, error);
    if (serverCache.has(cacheKey)) {
      return serverCache.get(cacheKey).data;
    }
    return [];
  }
};

export const getFirestoreDoc = async (collection, docId, forceRefresh = false) => {
  const cacheKey = `${collection}_doc_${docId}`;
  const now = Date.now();

  if (!forceRefresh && serverCache.has(cacheKey)) {
    const entry = serverCache.get(cacheKey);
    if (now - entry.timestamp < CACHE_TTL_MS) {
      return entry.data;
    }
  }

  try {
    const res = await fetch(`${BASE_URL}/${collection}/${docId}`);
    if (!res.ok) return null;
    const doc = await res.json();
    const parsed = parseFirestoreDoc(doc);
    if (parsed) {
      serverCache.set(cacheKey, { data: parsed, timestamp: now });
    }
    return parsed;
  } catch (error) {
    console.error(`Firestore getFirestoreDoc [${collection}/${docId}] error:`, error);
    if (serverCache.has(cacheKey)) {
      return serverCache.get(cacheKey).data;
    }
    return null;
  }
};

export const setFirestoreDoc = async (collection, docId, data) => {
  try {
    clearServerFirestoreCache(collection);
    const fields = {};
    for (const [k, v] of Object.entries(data)) {
      if (k !== "_id") fields[k] = toFirestoreValue(v);
    }
    const res = await fetch(`${BASE_URL}/${collection}/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const result = await res.json();
    return parseFirestoreDoc(result);
  } catch (error) {
    console.error(`Firestore setFirestoreDoc [${collection}/${docId}] error:`, error);
    throw error;
  }
};

export const addFirestoreDoc = async (collection, data, customPrefix = "") => {
  const prefix = customPrefix || collection.slice(0, 4);
  const docId = `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  return await setFirestoreDoc(collection, docId, data);
};

export const updateFirestoreDocFields = async (collection, docId, updateFields) => {
  try {
    clearServerFirestoreCache(collection);
    const fieldPaths = Object.keys(updateFields)
      .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
      .join("&");
    const fields = {};
    for (const [k, v] of Object.entries(updateFields)) {
      if (k !== "_id") fields[k] = toFirestoreValue(v);
    }
    const res = await fetch(`${BASE_URL}/${collection}/${docId}?${fieldPaths}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fields }),
    });
    const result = await res.json();
    return parseFirestoreDoc(result);
  } catch (error) {
    console.error(`Firestore updateFirestoreDocFields [${collection}/${docId}] error:`, error);
    throw error;
  }
};

export const deleteFirestoreDoc = async (collection, docId) => {
  try {
    clearServerFirestoreCache(collection);
    const res = await fetch(`${BASE_URL}/${collection}/${docId}`, {
      method: "DELETE",
    });
    return res.ok;
  } catch (error) {
    console.error(`Firestore deleteFirestoreDoc [${collection}/${docId}] error:`, error);
    return false;
  }
};

// 7. Real-Time Admin Broadcast Notification to Firestore
export const broadcastAdminNotification = async ({
  title,
  message,
  type = "adminBroadcast",
  data = {},
}) => {
  try {
    const notifId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const notifDoc = {
      _id: notifId,
      id: notifId,
      title: title || "📢 VRAJ CREATION LIVE UPDATE",
      message: message || "New update from Admin.",
      body: message || "New update from Admin.",
      type: type || "adminBroadcast",
      data: typeof data === "object" ? data : {},
      date: Date.now(),
      createdAt: new Date().toISOString(),
      timestamp: Date.now(),
    };
    await setFirestoreDoc("admin_notifications", notifId, notifDoc);
    console.log(`📢 [ADMIN LIVE BROADCAST] Dispatched notification: "${title}" (${notifId})`);
    return notifDoc;
  } catch (err) {
    console.error("Error broadcasting admin notification to Firestore:", err);
    return null;
  }
};

export default {
  getFirestoreDocs,
  getFirestoreDoc,
  setFirestoreDoc,
  addFirestoreDoc,
  updateFirestoreDocFields,
  deleteFirestoreDoc,
  broadcastAdminNotification,
};
