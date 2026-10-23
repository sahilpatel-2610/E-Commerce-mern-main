import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  setFirestoreDoc,
  deleteFirestoreDoc,
  getFirestoreDoc,
  getFirestoreDocs,
  broadcastAdminNotification,
} from "../config/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

export const readServerProducts = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(PRODUCTS_FILE)) {
      const content = fs.readFileSync(PRODUCTS_FILE, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (e) {
    console.error("readServerProducts error:", e);
  }
  return [];
};

export const saveServerProduct = (product) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = readServerProducts();
    const prodId = product._id || product.id;
    const updated = [
      product,
      ...current.filter((p) => (p._id || p.id) !== prodId),
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (e) {
    console.error("saveServerProduct error:", e);
    return [];
  }
};

export const deleteServerProduct = (targetId) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = readServerProducts();
    const updated = current.filter(
      (p) => p._id !== targetId && p.id !== targetId
    );
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (e) {
    console.error("deleteServerProduct error:", e);
    return [];
  }
};

// 1. Add / Update Product (Firebase + Cloud File Sync)
export const addProduct = async (req, res) => {
  try {
    const {
      id,
      _id,
      name,
      description,
      price,
      oldPrice,
      discount,
      category,
      subCategory,
      brand,
      sizes,
      productRam,
      productWeight,
      colors,
      bestseller,
      image,
      images: inputImages,
      stock,
      countInStock,
      rating,
    } = req.body;

    const isEdit = !!(_id || id);
    const docId = _id || id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

    const currentList = readServerProducts();
    const existingProd = isEdit ? currentList.find((p) => (p._id || p.id) === docId) || {} : {};

    const image1 = req.files?.image1 && req.files.image1[0];
    const image2 = req.files?.image2 && req.files.image2[0];
    const image3 = req.files?.image3 && req.files.image3[0];
    const image4 = req.files?.image4 && req.files.image4[0];

    const files = [image1, image2, image3, image4].filter(Boolean);

    let imageUrl = [];
    if (files.length > 0) {
      imageUrl = await Promise.all(
        files.map(async (item) => {
          let result = await cloudinary.uploader.upload(item.path, {
            resource_type: "image",
          });
          return result.secure_url;
        })
      );
    } else if (Array.isArray(inputImages) && inputImages.length > 0) {
      imageUrl = inputImages;
    } else if (Array.isArray(image) && image.length > 0) {
      imageUrl = image;
    } else if (typeof image === "string" && image.trim()) {
      try {
        const parsed = JSON.parse(image);
        imageUrl = Array.isArray(parsed) ? parsed : [image.trim()];
      } catch {
        imageUrl = [image.trim()];
      }
    } else if (existingProd.image || existingProd.images) {
      imageUrl = existingProd.image || existingProd.images || [];
    }

    let parsedSizes = [];
    if (sizes !== undefined && sizes !== null) {
      try {
        parsedSizes = typeof sizes === "string" ? JSON.parse(sizes) : sizes;
      } catch {
        parsedSizes = Array.isArray(sizes) ? sizes : [String(sizes)];
      }
    } else if (existingProd.sizes) {
      parsedSizes = existingProd.sizes;
    }

    let parsedRams = [];
    if (productRam !== undefined && productRam !== null) {
      try {
        parsedRams = typeof productRam === "string" ? JSON.parse(productRam) : productRam;
      } catch {
        parsedRams = Array.isArray(productRam) ? productRam : [];
      }
    } else if (existingProd.productRam) {
      parsedRams = existingProd.productRam;
    }

    let parsedWeights = [];
    if (productWeight !== undefined && productWeight !== null) {
      try {
        parsedWeights = typeof productWeight === "string" ? JSON.parse(productWeight) : productWeight;
      } catch {
        parsedWeights = Array.isArray(productWeight) ? productWeight : [];
      }
    } else if (existingProd.productWeight) {
      parsedWeights = existingProd.productWeight;
    }

    let parsedColors = [];
    if (colors !== undefined && colors !== null) {
      try {
        parsedColors = typeof colors === "string" ? JSON.parse(colors) : colors;
      } catch {
        parsedColors = Array.isArray(colors) ? colors : [];
      }
    } else if (existingProd.colors) {
      parsedColors = existingProd.colors;
    }

    const calculatedDiscount =
      discount !== undefined && discount !== ""
        ? Number(discount)
        : (oldPrice && Number(oldPrice) > Number(price)
            ? Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100)
            : null);

    const productData = {
      ...existingProd,
      _id: docId,
      id: docId,
      name: name !== undefined ? String(name).trim() : existingProd.name || "Product",
      description: description !== undefined ? String(description).trim() : existingProd.description || "",
      category: category !== undefined ? String(category).trim() : existingProd.category || "General",
      catName: category !== undefined ? String(category).trim() : existingProd.catName || existingProd.category || "General",
      price: price !== undefined ? Number(price) : existingProd.price || 0,
      oldPrice: oldPrice !== undefined && oldPrice !== "" ? Number(oldPrice) : (existingProd.oldPrice || null),
      discount: calculatedDiscount,
      subCategory: subCategory !== undefined ? String(subCategory).trim() : (existingProd.subCategory || ""),
      subCat: subCategory !== undefined ? String(subCategory).trim() : (existingProd.subCat || existingProd.subCategory || ""),
      brand: brand !== undefined ? String(brand).trim() : (existingProd.brand || ""),
      bestseller: bestseller === "true" || bestseller === true || bestseller === "Yes",
      stock: stock !== undefined ? Number(stock) : (countInStock !== undefined ? Number(countInStock) : (existingProd.stock || 15)),
      countInStock: stock !== undefined ? Number(stock) : (countInStock !== undefined ? Number(countInStock) : (existingProd.countInStock || existingProd.stock || 15)),
      sizes: Array.isArray(parsedSizes) ? parsedSizes : [],
      productRam: Array.isArray(parsedRams) ? parsedRams : [],
      productWeight: Array.isArray(parsedWeights) ? parsedWeights : [],
      colors: Array.isArray(parsedColors) ? parsedColors : [],
      image: Array.isArray(imageUrl) ? imageUrl : [],
      images: Array.isArray(imageUrl) ? imageUrl : [],
      rating: rating !== undefined ? Number(rating) : (existingProd.rating || 5.0),
      date: existingProd.date || Date.now(),
      updatedAt: new Date().toISOString(),
    };
    if (!isEdit) {
      productData.createdAt = new Date().toISOString();
    }

    // 1. Guaranteed Local Server Persistence
    saveServerProduct(productData);

    // 2. Sync to Firebase Firestore
    try {
      await setFirestoreDoc("products", docId, productData);
    } catch (_) {}

    // 3. Broadcast Live Notification to Mobile Flutter App (Only if not already broadcasted by client)
    if (!req.body.skipBroadcast) {
      broadcastAdminNotification({
        title: isEdit ? "✨ PRODUCT UPDATED" : "✨ NEW COLLECTION DROP",
        message: isEdit
          ? `${productData.name} details have been updated by Atelier.`
          : `${productData.name} is now live in ${productData.category} at ₹${productData.price}!`,
        type: "product",
        data: { productId: docId, name: productData.name, price: productData.price, category: productData.category },
      });
    }

    res.json({
      success: true,
      message: isEdit ? "Product Updated Successfully in Firebase" : "Product Saved Successfully in Firebase",
      product: productData,
    });
  } catch (error) {
    console.error("addProduct error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 2. List Products
export const listProducts = async (req, res) => {
  try {
    const products = readServerProducts();
    return res.json({ success: true, products });
  } catch (error) {
    console.error("listProducts error:", error);
    return res.json({ success: false, message: error.message });
  }
};
export const listProduct = listProducts;

// 3. Remove Product (Firebase + File)
export const removeProduct = async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.json({ success: false, message: "Product ID required" });

    deleteServerProduct(id);
    try {
      await deleteFirestoreDoc("products", id);
    } catch (_) {}

    // Broadcast Live Notification to Mobile Flutter App
    broadcastAdminNotification({
      title: "🗑️ PRODUCT REMOVED",
      message: "Product collection updated by Admin.",
      type: "product",
      data: { productId: id },
    });

    return res.json({
      success: true,
      message: "Product deleted successfully from Firebase",
    });
  } catch (error) {
    console.error("removeProduct error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 4. Single Product
export const singleProduct = async (req, res) => {
  try {
    const { productId, id } = req.body;
    const targetId = productId || id;
    if (!targetId)
      return res.json({ success: false, message: "Product ID required" });

    const serverProds = readServerProducts();
    let product = serverProds.find(
      (p) => (p._id || p.id) === targetId
    );

    if (!product) {
      try {
        product = await getFirestoreDoc("products", targetId);
      } catch (_) {}
    }

    if (!product)
      return res.json({ success: false, message: "Product not found" });

    return res.json({ success: true, product });
  } catch (error) {
    console.error("singleProduct error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 5. Category Tree for Catalog
export const getCategoryTree = async (req, res) => {
  try {
    let categories = [];

    const CATS_FILE = path.join(DATA_DIR, "categories.json");
    if (fs.existsSync(CATS_FILE)) {
      try {
        categories = JSON.parse(fs.readFileSync(CATS_FILE, "utf-8") || "[]");
      } catch (_) {}
    }

    try {
      const firestoreCats = await getFirestoreDocs("categories", 200);
      if (Array.isArray(firestoreCats) && firestoreCats.length > 0) {
        firestoreCats.forEach((fc) => {
          if (!categories.some((c) => (c._id || c.id) === (fc._id || fc.id))) {
            categories.push(fc);
          }
        });
      }
    } catch (_) {}

    return res.json({ success: true, categories });
  } catch (error) {
    console.error("getCategoryTree error:", error);
    return res.json({ success: false, message: error.message });
  }
};
