import express from "express";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";
import {
  getProjectsSprints,
  createProject,
  createSprint,
} from "../controllers/projectSprintController.js";

const router = express.Router();

// Get Projects & Sprints page data
router.get(
  "/",
  protect,
  authorizeRoles("c_level", "manager", "admin", "ceo", "super_admin"),
  getProjectsSprints
);

// Create a new project
router.post(
  "/create",
  protect,
  authorizeRoles("c_level", "manager", "admin", "ceo", "super_admin"),
  createProject
);

// Start a new sprint
router.post(
  "/sprints/create",
  protect,
  authorizeRoles("c_level", "manager", "admin", "ceo", "super_admin"),
  createSprint
);

export default router;
