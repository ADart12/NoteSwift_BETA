import mongoose from "mongoose";

const assessmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    cohort: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchCohort",
      required: true,
      index: true,
    },
    assessmentType: {
      type: String,
      enum: ["Quiz", "Assignment", "Capstone", "Exam"],
      required: true,
    },
    evaluator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    maxScore: {
      type: Number,
      required: true,
      min: 1,
    },
    passingScore: {
      type: Number,
      default: 50,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    instructions: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Draft", "Published", "Grading_In_Progress", "Completed"],
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

export default mongoose.model("Assessment", assessmentSchema);
