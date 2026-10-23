import express, { Router } from "express";
import {
  addProduct,
  listProduct,
  removeProduct,
  singleProduct,
  getCategoryTree,
} from "../controllers/product.controller.js";
import upload from "../middleware/multer.js";
import adminAuth from "../middleware/adminAuth.js";

const productRouter = Router();

const optionalUpload = (req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return upload.fields([
      { name: "image1", maxCount: 1 },
      { name: "image2", maxCount: 1 },
      { name: "image3", maxCount: 1 },
      { name: "image4", maxCount: 1 },
    ])(req, res, next);
  }
  next();
};

productRouter.post("/add", adminAuth, optionalUpload, addProduct);
productRouter.post("/remove", adminAuth, removeProduct);
productRouter.post("/single", singleProduct);
productRouter.get("/list", listProduct);
productRouter.get("/category-tree", getCategoryTree);

export default productRouter;
