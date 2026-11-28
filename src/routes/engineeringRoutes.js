import express from "express";
import protect from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/authorizeRole.js";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getEngineeringMembers,
} from "../controllers/projectsController.js";

const router = express.Router();

const techRoles = ["c_level", "manager", "admin", "ceo", "super_admin"];

// Projects
router.get("/projects", protect, authorizeRoles(...techRoles), getProjects);
router.post("/projects", protect, authorizeRoles(...techRoles), createProject);
router.patch("/projects/:id", protect, authorizeRoles(...techRoles), updateProject);
router.delete("/projects/:id", protect, authorizeRoles(...techRoles), deleteProject);

// Tasks
router.get("/tasks", protect, authorizeRoles(...techRoles), getTasks);
router.post("/tasks", protect, authorizeRoles(...techRoles), createTask);
router.patch("/tasks/:id", protect, authorizeRoles(...techRoles), updateTask);
router.delete("/tasks/:id", protect, authorizeRoles(...techRoles), deleteTask);

// Members
router.get("/members", protect, authorizeRoles(...techRoles), getEngineeringMembers);

export default router;
