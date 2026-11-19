import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";
import { getDashboardSummary, getAttendanceOverview } from "../controllers/dashboardController.js";

const router = express.Router();

// Dashboard Stats
router.get("/summary", authMiddleware, authorizeRoles("admin", "manager"), getDashboardSummary);

// Attendance Overview (Bar Chart)
router.get("/attendance-overview", authMiddleware, authorizeRoles("admin", "manager"), getAttendanceOverview);

export default router;
