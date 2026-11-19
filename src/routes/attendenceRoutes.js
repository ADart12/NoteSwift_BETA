import express from "express";
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getMyAttendanceHistory,
  getEmployeeAttendanceHistory,
  getMyAttendanceSummary,
  markAbsentEmployeesController,
} from "../controllers/attendenceController.js";

import authMiddleware from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";

const router = express.Router();

/* ===================================================
   Employee Self Attendance (Webcam Photo + Geo-Tag)
=================================================== */
router.get("/me", authMiddleware, getMyAttendance);
router.post("/check-in", authMiddleware, checkIn);
router.patch("/check-out", authMiddleware, checkOut);
router.get("/me/history", authMiddleware, getMyAttendanceHistory);
router.get("/my/summary", authMiddleware, getMyAttendanceSummary);

/* ===================================================
   Admin & Manager Monitoring & Historical Tracking
=================================================== */
router.get("/today", authMiddleware, getTodayAttendance);
router.get(
  "/:employeeId/history",
  authMiddleware,
  authorizeRoles("admin", "manager"),
  getEmployeeAttendanceHistory
);

router.post("/mark-absent", markAbsentEmployeesController);

export default router;
