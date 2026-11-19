import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    payPeriod: {
      type: String, // e.g. "2026-11"
      required: true,
      trim: true,
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },
    bonuses: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      tax: { type: Number, default: 0 },
      latePenalty: { type: Number, default: 0 },
      unpaidLeave: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
    },
    totalDeductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Draft", "Processed", "Approved", "Disbursed", "Cancelled"],
      default: "Draft",
      index: true,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

payrollSchema.index({ employee: 1, payPeriod: 1 }, { unique: true });

export default mongoose.model("Payroll", payrollSchema);
