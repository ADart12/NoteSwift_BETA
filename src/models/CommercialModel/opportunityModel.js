import mongoose from "mongoose";

const opportunitySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    salesRep: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseInterest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      default: null,
    },
    stage: {
      type: String,
      enum: ["Lead", "Discovery", "Proposal", "Negotiation", "Won", "Lost"],
      default: "Lead",
      index: true,
    },
    expectedValue: {
      type: Number,
      required: true,
      min: 0,
    },
    closeDate: {
      type: Date,
      default: null,
    },
    lossReason: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Opportunity", opportunitySchema);
