import express from "express";
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  updateEmployeeStatus,
  deleteEmployee,
} from "../controllers/employeeController.js";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";

const router = express.Router();

// Get all employees (with search, filter, pagination)
router.get("/", protect, authorizeRoles("admin", "manager", "super_admin", "ceo", "c_level"), getEmployees);

// Create new employee directly
router.post("/", protect, authorizeRoles("admin", "manager", "super_admin", "ceo"), createEmployee);

// Get single employee
router.get("/:id", protect, authorizeRoles("admin", "manager", "super_admin", "ceo", "c_level"), getEmployeeById);

// Update employee details
router.patch("/:id", protect, authorizeRoles("admin", "manager", "super_admin", "ceo"), updateEmployee);

// Change employee status
router.patch("/:id/status", protect, authorizeRoles("admin", "manager", "super_admin", "ceo"), updateEmployeeStatus);

// Soft delete employee
router.delete("/:id", protect, authorizeRoles("admin", "super_admin"), deleteEmployee);

export default router;
