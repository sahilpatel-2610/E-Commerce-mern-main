import { Router } from "express";
import {
  getDashboardStats,
  getAllCategories,
  addCategory,
  editCategory,
  deleteCategory,
  getAllBanners,
  addBanner,
  updateBanner,
  deleteBanner,
  uploadMedia,
  getProductRams,
  addProductRam,
  deleteProductRam,
  getProductWeights,
  addProductWeight,
  deleteProductWeight,
  getProductSizes,
  addProductSize,
  deleteProductSize,
  getAllSubcategories,
  addSubcategory,
  deleteSubcategory,
  getAllReviews,
  deleteReview,
  deleteOrder,
  getAllUsers,
  deleteUser,
} from "../controllers/admin.controller.js";
import adminAuth from "../middleware/adminAuth.js";
import upload from "../middleware/multer.js";

const adminRouter = Router();

// Media Upload (Videos & Images)
adminRouter.post("/upload", upload.single("file"), uploadMedia);

// Dashboard stats
adminRouter.get("/dashboard", getDashboardStats);

// Users
adminRouter.get("/users", getAllUsers);
adminRouter.post("/user/delete", adminAuth, deleteUser);

// Categories
adminRouter.get("/categories", getAllCategories);
adminRouter.post("/category/add", adminAuth, addCategory);
adminRouter.post("/category/edit", adminAuth, editCategory);
adminRouter.post("/category/delete", adminAuth, deleteCategory);

// Subcategories
adminRouter.get("/subcategories", getAllSubcategories);
adminRouter.post("/subcategory/add", adminAuth, addSubcategory);
adminRouter.post("/subcategory/delete", adminAuth, deleteSubcategory);

// Reviews
adminRouter.get("/reviews", getAllReviews);
adminRouter.post("/review/delete", adminAuth, deleteReview);

// Orders
adminRouter.post("/order/delete", adminAuth, deleteOrder);

// RAMs
adminRouter.get("/product-rams", getProductRams);
adminRouter.post("/product-ram/add", adminAuth, addProductRam);
adminRouter.post("/product-ram/delete", adminAuth, deleteProductRam);

// Weights
adminRouter.get("/product-weights", getProductWeights);
adminRouter.post("/product-weight/add", adminAuth, addProductWeight);
adminRouter.post("/product-weight/delete", adminAuth, deleteProductWeight);

// Sizes
adminRouter.get("/product-sizes", getProductSizes);
adminRouter.post("/product-size/add", adminAuth, addProductSize);
adminRouter.post("/product-size/delete", adminAuth, deleteProductSize);

// Banners
adminRouter.get("/banners", getAllBanners);
adminRouter.post("/banner/add", adminAuth, addBanner);
adminRouter.post("/banner/update", adminAuth, updateBanner);
adminRouter.post("/banner/delete", adminAuth, deleteBanner);

export default adminRouter;
