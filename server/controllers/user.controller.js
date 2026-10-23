import validator from "validator";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  setFirestoreDoc,
  deleteFirestoreDoc,
  getFirestoreDoc,
  updateFirestoreDocFields,
} from "../config/firebase.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");
const USERS_FILE = path.join(DATA_DIR, "users_registry.json");

export const readServerUsers = () => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, "utf-8");
      return JSON.parse(content || "[]");
    }
  } catch (e) {
    console.error("readServerUsers error:", e);
  }
  return [];
};

export const saveServerUser = (user) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = readServerUsers();
    const updated = [user, ...current.filter((u) => u.email !== user.email && u._id !== user._id)];
    fs.writeFileSync(USERS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (e) {
    console.error("saveServerUser error:", e);
    return [];
  }
};

export const deleteServerUser = (targetId, targetEmail) => {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const current = readServerUsers();
    const cleanEmail = targetEmail ? targetEmail.toLowerCase().trim() : "";
    const updated = current.filter((u) => {
      const matchId = targetId && (u._id === targetId || u.id === targetId);
      const matchEmail = cleanEmail && (u.email?.toLowerCase().trim() === cleanEmail);
      return !matchId && !matchEmail;
    });
    fs.writeFileSync(USERS_FILE, JSON.stringify(updated, null, 2), "utf-8");
    return updated;
  } catch (e) {
    console.error("deleteServerUser error:", e);
    return [];
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "defaultsecretkey");
};

// 1. Register User
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, phoneNumber } = req.body;

    if (!name || !email || !password) {
      return res.json({ success: false, message: "Name, email and password are required" });
    }

    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (password.length < 6) {
      return res.json({
        success: false,
        message: "Please enter a password with at least 6 characters",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const docId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;

    // Check if user already exists
    const serverUsers = readServerUsers();
    const existing = serverUsers.find((u) => u.email === cleanEmail);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userPhone = (phone || phoneNumber || "").trim();

    const newUser = {
      _id: docId,
      id: docId,
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      rawPassword: password.trim(),
      phone: userPhone,
      phoneNumber: userPhone,
      cartData: {},
      role: cleanEmail.includes("admin") ? "admin" : "customer",
      platform:
        req.body.platform ||
        (cleanEmail.includes("admin") ? "Admin CMS" : "Web Storefront"),
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    // Save to server registry
    saveServerUser(newUser);

    // Sync to Firebase Firestore
    try {
      await setFirestoreDoc("users", docId, {
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        phoneNumber: newUser.phoneNumber,
        password: password.trim(),
        role: newUser.role,
        platform: newUser.platform,
        createdAt: newUser.createdAt,
      });
    } catch (_) {}

    const token = generateToken(docId);

    return res.json({
      success: true,
      token,
      user: {
        id: docId,
        _id: docId,
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
      },
    });
  } catch (error) {
    console.error("registerUser error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 2. Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.json({ success: false, message: "Email and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanPass = password.trim();

    // 1. Check Server Registry
    const serverUsers = readServerUsers();
    let user = serverUsers.find((u) => u.email === cleanEmail);

    // 2. Fallback to Firestore docs
    if (!user) {
      try {
        const docId = `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const firestoreDoc = await getFirestoreDoc("users", docId);
        if (firestoreDoc) user = firestoreDoc;
      } catch (_) {}
    }

    if (!user) {
      return res.json({ success: false, message: "User does not exist" });
    }

    let isMatch = false;
    if (user.password) {
      if (user.password.startsWith("$2b$") || user.password.startsWith("$2a$")) {
        isMatch = await bcrypt.compare(cleanPass, user.password);
      } else {
        isMatch = user.password === cleanPass;
      }
    }
    if (!isMatch && user.rawPassword) {
      isMatch = user.rawPassword === cleanPass;
    }

    if (!isMatch) {
      return res.json({ success: false, message: "Invalid password" });
    }

    if (req.body.platform) {
      user.platform = req.body.platform;
      saveServerUser(user);
      try {
        const docId = user._id || user.id || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`;
        await updateFirestoreDocFields("users", docId, { platform: req.body.platform });
      } catch (_) {}
    }

    const token = generateToken(user._id || user.id);
    return res.json({
      success: true,
      token,
      user: {
        id: user._id || user.id,
        _id: user._id || user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || user.phoneNumber || "",
        image: user.image || user.avatar || "",
        platform: user.platform || "Web Storefront",
      },
    });
  } catch (error) {
    console.error("loginUser error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 3. Login Admin
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const adminEmail = process.env.ADMIN_EMAIL || "admin@eshop.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin12345";

    if (email === adminEmail && password === adminPassword) {
      const token = jwt.sign(email + password, process.env.JWT_SECRET || "defaultsecretkey");
      return res.json({ success: true, token });
    } else {
      return res.json({ success: false, message: "Invalid Admin Credentials" });
    }
  } catch (error) {
    console.error("loginAdmin error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 4. Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.body.userId;
    if (!userId) {
      return res.json({ success: false, message: "Unauthorized: User ID missing" });
    }

    const user = await getFirestoreDoc("users", userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const { password, ...safeUser } = user;
    return res.json({ success: true, user: safeUser });
  } catch (error) {
    console.error("getUserProfile error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 5. Update User Profile
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.body.userId;
    const { name, email, phone, phoneNumber, image } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Unauthorized: User ID missing" });
    }

    const updateFields = {};
    if (name) updateFields.name = name.trim();
    if (email) updateFields.email = email.toLowerCase().trim();
    if (phone || phoneNumber) {
      const p = (phone || phoneNumber).trim();
      updateFields.phone = p;
      updateFields.phoneNumber = p;
    }
    if (image !== undefined) updateFields.image = image;
    updateFields.updatedAt = new Date().toISOString();

    const updated = await updateFirestoreDocFields("users", userId, updateFields);
    const { password, ...safeUser } = updated || {};

    return res.json({
      success: true,
      message: "Profile updated successfully in Firebase",
      user: safeUser,
    });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// 6. Change User Password
export const changeUserPassword = async (req, res) => {
  try {
    const userId = req.body.userId;
    const { oldPassword, newPassword } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Unauthorized: User ID missing" });
    }

    if (!oldPassword || !newPassword) {
      return res.json({ success: false, message: "Old password and new password required" });
    }

    if (newPassword.length < 6) {
      return res.json({ success: false, message: "New password must be at least 6 characters" });
    }

    const user = await getFirestoreDoc("users", userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Incorrect old password" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await updateFirestoreDocFields("users", userId, {
      password: hashedPassword,
      updatedAt: new Date().toISOString(),
    });

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("changeUserPassword error:", error);
    return res.json({ success: false, message: error.message });
  }
};
