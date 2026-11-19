import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contactName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    clientType: {
      type: String,
      enum: ["Individual_Learner", "B2B_Corporate", "Institution"],
      default: "Individual_Learner",
    },
    billingAddress: {
      street: { type: String, default: "" },
      city: { type: String, default: "" },
      country: { type: String, default: "Nepal" },
    },
    status: {
      type: String,
      enum: ["Lead", "Active_Student", "Alumni", "Corporate_Partner", "Inactive"],
      default: "Lead",
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

export default mongoose.model("Client", clientSchema);
