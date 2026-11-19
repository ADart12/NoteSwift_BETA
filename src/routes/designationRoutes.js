import express from "express";
import { getDesignations, createDesignation } from "../controllers/designationController.js";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";

const router = express.Router();

router.get("/", protect, getDesignations);
router.post("/", protect, authorizeRoles("admin", "manager", "super_admin", "ceo"), createDesignation);

export default router;
