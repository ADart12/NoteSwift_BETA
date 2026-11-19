import express from "express";
import { getSettings, updateSettings } from "../controllers/settingController.js";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";

const router = express.Router();

router.get("/", protect, getSettings);
router.put("/", protect, authorizeRoles("admin"), updateSettings);

export default router;
