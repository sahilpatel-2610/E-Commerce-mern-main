import express, { Router } from "express";
import {
  allOrders,
  placeOrder,
  placeOrderStrip,
  placeOrderStripe,
  updateStatus,
  userOrders,
  verifyStripe,
} from "../controllers/order.controller.js";
import adminAuth from "../middleware/adminAuth.js";
import authUser from "../middleware/auth.js";

const orderRouter = Router();

// Middleware: Optional Authentication (supports guest users and authenticated users)
const optionalAuth = (req, res, next) => {
  const token =
    req.headers.token ||
    req.headers.authorization?.replace("Bearer ", "");

  if (token && token !== "undefined" && token !== "null" && token !== "guest") {
    return authUser(req, res, next);
  }
  next();
};

//-------------------------------------------------------------------------------------------------
//? Admin routes
orderRouter.post("/list", adminAuth, allOrders);
orderRouter.post("/status", adminAuth, updateStatus);

//-------------------------------------------------------------------------------------------------
//? Payment Features
orderRouter.post("/place", optionalAuth, placeOrder);
orderRouter.post("/cod", optionalAuth, placeOrder);
orderRouter.post("/stripe", optionalAuth, placeOrderStripe || placeOrderStrip);
orderRouter.post("/strip", optionalAuth, placeOrderStrip);

//-------------------------------------------------------------------------------------------------
//! Verify payment
orderRouter.post("/verifyStripe", optionalAuth, verifyStripe);
orderRouter.post("/verifyStrip", optionalAuth, verifyStripe);

//-------------------------------------------------------------------------------------------------
//? User Features
orderRouter.post("/userOrders", authUser, userOrders);

//-------------------------------------------------------------------------------------------------

export default orderRouter;
