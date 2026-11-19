import express from "express";
import {
  applyLeave,
  getMyLeaves,
  getMyLeaveById,
  deleteLeave,
  getAllLeaves,
  getLeaveById,
  rejectLeave,
  approveLeave,
  getLeaveSummary,
} from "../controllers/leaveController.js";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";

const router = express.Router();

// Authenticated Employee (all staff) Routes
router.post("/", protect, applyLeave);
router.get("/me", protect, getMyLeaves);
router.get("/me/:id", protect, getMyLeaveById);
router.delete("/:id", protect, deleteLeave);

// Management / HR / Admin Routes
router.get("/", protect, authorizeRoles("admin", "manager"), getAllLeaves);
router.get("/summary", protect, authorizeRoles("admin", "manager"), getLeaveSummary);
router.get("/:id", protect, authorizeRoles("admin", "manager"), getLeaveById);
router.patch("/:id/approve", protect, authorizeRoles("admin", "manager"), approveLeave);
router.patch("/:id/reject", protect, authorizeRoles("admin", "manager"), rejectLeave);

export default router;
