import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    curriculumLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    durationWeeks: {
      type: Number,
      required: true,
      min: 1,
    },
    syllabus: [
      {
        weekNumber: { type: Number, required: true },
        title: { type: String, required: true },
        topics: [{ type: String }],
        deliverables: { type: String, default: "" },
      },
    ],
    status: {
      type: String,
      enum: ["Draft", "Active", "Archived"],
      default: "Draft",
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

export default mongoose.model("Course", courseSchema);
