import express from "express";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";
import { getTechDashboard } from "../controllers/techDashboardController.js";

const router = express.Router();

// CTO / Tech Manager Dashboard
router.get(
  "/dashboard",
  protect,
  authorizeRoles("c_level", "manager", "admin", "ceo", "super_admin"),
  getTechDashboard
);

export default router;
