import mongoose from "mongoose";

const batchCohortSchema = new mongoose.Schema(
  {
    cohortCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    academicManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    maxCapacity: {
      type: Number,
      default: 30,
      min: 1,
    },
    currentEnrollmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    scheduleDays: [{ type: String }], // ["Sunday", "Tuesday", "Thursday"]
    timeSlot: { type: String, default: "" }, // "07:00 AM - 09:00 AM"
    status: {
      type: String,
      enum: ["Upcoming", "Ongoing", "Completed", "Cancelled"],
      default: "Upcoming",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("BatchCohort", batchCohortSchema);
