import express from "express";
import { getDepartments, createDepartment } from "../controllers/departmentController.js";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";

const router = express.Router();

// Get all departments
router.get("/", protect, getDepartments);

// Create department (admin only)
router.post("/", protect, authorizeRoles("admin"), createDepartment);

export default router;
