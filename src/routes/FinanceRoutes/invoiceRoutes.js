import express from "express";
import {
  createInvoice,
  getInvoices,
  getInvoiceById,
  updateInvoice,
  recordPayment,
  cancelInvoice,
  deleteInvoice,
  getInvoiceStats,
} from "../../controllers/Finance/invoiceController.js";
import protect from "../../middleware/authMiddleware.js";
import { authorizeRoles } from "../../middleware/authorizeRole.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Stats summary (must be before /:id)
router.get(
  "/stats",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  getInvoiceStats
);

// Get all invoices
router.get(
  "/",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  getInvoices
);

// Create invoice
router.post(
  "/",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  createInvoice
);

// Get single invoice
router.get(
  "/:id",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  getInvoiceById
);

// Update invoice
router.put(
  "/:id",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  updateInvoice
);

// Record a payment against an invoice
router.post(
  "/:id/payment",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  recordPayment
);

// Cancel invoice
router.patch(
  "/:id/cancel",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  cancelInvoice
);

// Soft delete
router.delete(
  "/:id",
  authorizeRoles("manager", "admin", "super_admin", "ceo", "c_level"),
  deleteInvoice
);

export default router;
