import mongoose from "mongoose";

// ─── Line Item Sub-Schema ───────────────────────────────────────────────────
const lineItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    quantity:    { type: Number, required: true, min: 1, default: 1 },
    unitPrice:   { type: Number, required: true, min: 0 },
    amount:      { type: Number, required: true, min: 0 }, // quantity * unitPrice
  },
  { _id: false }
);

// ─── Invoice Schema ─────────────────────────────────────────────────────────
const invoiceSchema = new mongoose.Schema(
  {
    // Auto-generated: INV-2026-0001
    invoiceNumber: {
      type:      String,
      unique:    true,
      uppercase: true,
      trim:      true,
    },

    // Vendor / Client info (free-form — no separate model dependency)
    clientName:    { type: String, required: true, trim: true },
    clientEmail:   { type: String, trim: true, default: "" },
    clientPhone:   { type: String, trim: true, default: "" },
    clientAddress: { type: String, trim: true, default: "" },
    clientGST:     { type: String, trim: true, default: "" },   // GST/PAN for Indian invoices

    // Classification
    type: {
      type:    String,
      enum:    ["Payable", "Receivable"],   // Payable = we pay vendor; Receivable = client pays us
      default: "Payable",
    },

    department: { type: String, trim: true, default: "Finance" },

    // Line items
    lineItems: { type: [lineItemSchema], default: [] },

    // Financials
    subtotal:   { type: Number, default: 0, min: 0 },
    taxRate:    { type: Number, default: 18, min: 0, max: 100 },  // GST % (default 18%)
    taxAmount:  { type: Number, default: 0, min: 0 },
    discount:   { type: Number, default: 0, min: 0 },             // Flat discount in ₹
    totalAmount:{ type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },

    // Dates
    issueDate:  { type: Date, default: Date.now },
    dueDate:    { type: Date, required: true },
    paidDate:   { type: Date, default: null },

    // Status lifecycle
    status: {
      type:    String,
      enum:    ["Draft", "Issued", "Partially_Paid", "Paid", "Overdue", "Cancelled"],
      default: "Issued",
      index:   true,
    },

    // Payment
    paymentMethod: {
      type:    String,
      enum:    ["Bank_Transfer", "Cash", "Card", "UPI", "Cheque", "Other"],
      default: "Bank_Transfer",
    },
    transactionReference: { type: String, default: "", trim: true },

    // Notes
    notes:            { type: String, default: "", trim: true },
    internalNotes:    { type: String, default: "", trim: true },

    // Linked budget (optional)
    budget: { type: mongoose.Schema.Types.ObjectId, ref: "Budget", default: null },

    // Audit
    createdBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    updatedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // Soft delete
    isDeleted:  { type: Boolean, default: false },
    deletedAt:  { type: Date,    default: null },
    deletedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

// ─── Auto-generate invoice number before save ────────────────────────────────
invoiceSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const year  = new Date().getFullYear();
    const count = await mongoose.model("Invoice").countDocuments();
    this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

// ─── Virtual: balance due ────────────────────────────────────────────────────
invoiceSchema.virtual("balanceDue").get(function () {
  return Math.max(0, this.totalAmount - this.paidAmount);
});

invoiceSchema.set("toJSON",   { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

export default mongoose.model("Invoice", invoiceSchema);
