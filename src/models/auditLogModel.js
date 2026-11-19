import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true, // "CREATE", "UPDATE", "DELETE", "APPROVE", "DISBURSE", "LOGIN"
      index: true,
    },
    entity: {
      type: String,
      required: true, // "EXPENSE", "PAYROLL", "COURSE", "COHORT", "SALES_ORDER", "INVOICE", "ATTENDANCE"
      index: true,
    },
    entityId: {
      type: String,
      required: true,
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newState: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    ipAddress: {
      type: String,
      default: "",
    },
    userAgent: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 });

export default mongoose.model("AuditLog", auditLogSchema);
