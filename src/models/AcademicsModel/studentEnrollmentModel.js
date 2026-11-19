import mongoose from "mongoose";

const studentEnrollmentSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    cohort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchCohort",
      required: true,
      index: true,
    },
    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      default: null,
    },
    enrollmentDate: {
      type: Date,
      default: Date.now,
    },
    finalGrade: {
      type: String,
      default: "Pending", // A+, A, B, Incomplete, etc.
    },
    finalScore: {
      type: Number,
      default: 0,
    },
    attendancePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Enrolled", "In_Progress", "Completed", "Dropped", "Suspended"],
      default: "Enrolled",
    },
  },
  {
    timestamps: true,
  }
);

studentEnrollmentSchema.index({ client: 1, cohort: 1 }, { unique: true });

export default mongoose.model("StudentEnrollment", studentEnrollmentSchema);
