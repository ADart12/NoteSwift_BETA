import express from "express";

import {
  createBudget,
  getBudgets,
  getBudgetById,
  getBudgetStats,
  updateBudget,
  addFunds,
  deleteBudget,
  approveBudget,
  rejectBudget,
  getBudgetUtilization,
} from "../../controllers/Finance/budgetController.js";
import protect from "../../middleware/authMiddleware.js";
import { authorizeRoles } from "../../middleware/authorizeRole.js";
import { authorizeDepartment } from "../../middleware/authorizeDepartment.js";

const router = express.Router();

// Apply auth middleware to all budget routes
router.use(protect);

// 1. Get Budget Overview & Stats (Must be BEFORE /:id)
router.get(
  "/stats",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  getBudgetStats
);

// 2. Get All Budgets (with query filters)
router.get(
  "/",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  getBudgets
);

// 3. Create Budget
router.post(
  "/",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  authorizeDepartment("FIN"),
  createBudget
);

// 4. Get Single Budget
router.get(
  "/:id",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  getBudgetById
);

// 5. Update Budget Allocation
router.put(
  "/:id",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  authorizeDepartment("FIN"),
  updateBudget
);

// 6. Add Funds / Quick Top-Up
router.post(
  "/:id/add-funds",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  authorizeDepartment("FIN"),
  addFunds
);

// 7. Delete Budget
router.delete(
  "/:id",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  authorizeDepartment("FIN"),
  deleteBudget
);

// 8. Approve Budget
router.patch(
  "/:id/approve",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  authorizeDepartment("FIN"),
  approveBudget
);

// 9. Reject Budget
router.patch(
  "/:id/reject",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  authorizeDepartment("FIN"),
  rejectBudget
);

// 10. Get Budget Utilization
router.get(
  "/:id/utilization",
  authorizeRoles("manager", "admin", "super_admin", "ceo"),
  getBudgetUtilization
);

export default router;
