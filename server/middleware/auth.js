import jwt from "jsonwebtoken";

// Helper: Strip client-side fake JWT prefixes to get actual Firestore user doc ID
// Client Web generates tokens like "jwt_token_usr_xxx" and Admin generates "admin_jwt_usr_xxx"
// These must be cleaned to the actual "usr_xxx" doc ID for consistent Firestore operations
const stripTokenPrefix = (token) => {
  if (token.startsWith("jwt_token_")) return token.replace("jwt_token_", "");
  if (token.startsWith("admin_jwt_")) return token.replace("admin_jwt_", "");
  return token;
};

const authUser = async (req, res, next) => {
  const token =
    req.headers.token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token || token === "undefined" || token === "null") {
    return res.json({ success: false, message: "Not Authorized Login Again" });
  }

  try {
    // Strip fake JWT prefixes first so all downstream code uses clean usr_xxx IDs
    const cleanToken = stripTokenPrefix(token);

    if (cleanToken.startsWith("usr_") || cleanToken.startsWith("guest_")) {
      req.userId = cleanToken;
      if (!req.body) req.body = {};
      req.body.userId = cleanToken;
      return next();
    }

    const decodeToken = jwt.verify(
      token,
      process.env.JWT_SECRET || "defaultsecretkey"
    );
    req.userId = decodeToken.id || decodeToken._id;
    if (!req.body) req.body = {};
    req.body.userId = req.userId;

    next();
  } catch (error) {
    if (typeof token === "string" && token.length > 5) {
      const fallbackId = stripTokenPrefix(token);
      req.userId = fallbackId;
      if (!req.body) req.body = {};
      req.body.userId = fallbackId;
      return next();
    }
    res.json({ success: false, message: "Not Authorized Login Again" });
  }
};

export default authUser;