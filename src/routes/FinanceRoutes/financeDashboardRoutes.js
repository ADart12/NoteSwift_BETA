import express from "express";
import { getFinanceSummary } from "../../controllers/Finance/financeDashboardController.js";
import protect from "../../middleware/authMiddleware.js";
import { authorizeRoles } from "../../middleware/authorizeRole.js";

const router = express.Router();

router.get("/summary", protect, authorizeRoles("manager", "admin", "super_admin", "ceo"), getFinanceSummary);

export default router;
