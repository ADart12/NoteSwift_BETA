import express from "express";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";
import {
  getExecutiveOverview,
  getPendingActions,
} from "../controllers/ceoDashboardController.js";

const router = express.Router();

// Executive Overview (Main CEO dashboard tab)
router.get(
  "/executive-overview",
  protect,
  authorizeRoles("ceo", "super_admin", "admin"),
  getExecutiveOverview
);

// Pending Actions for CEO Action Center
router.get(
  "/pending-actions",
  protect,
  authorizeRoles("ceo", "super_admin", "admin"),
  getPendingActions
);

export default router;
