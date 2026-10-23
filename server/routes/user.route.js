import express, { Router } from "express";
import {
  loginAdmin,
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  changeUserPassword,
} from "../controllers/user.controller.js";
import { uploadMedia } from "../controllers/admin.controller.js";
import upload from "../middleware/multer.js";
import authUser from "../middleware/auth.js";

const userRouter = Router();

userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/admin", loginAdmin);

// Profile & Password Management
userRouter.get("/profile", authUser, getUserProfile);
userRouter.post("/update-profile", authUser, updateUserProfile);
userRouter.post("/change-password", authUser, changeUserPassword);
userRouter.post("/upload-media", upload.single("file"), uploadMedia);

export default userRouter;