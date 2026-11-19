import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    assetTag: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true, // e.g. "NS-HW-2026-0042"
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["IT_Equipment", "Studio_Gear", "Office_Furniture", "Facility", "Software_License"],
      required: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    purchaseDate: {
      type: Date,
      default: null,
    },
    purchaseCost: {
      type: Number,
      default: 0,
    },
    serialNumber: {
      type: String,
      default: "",
    },
    conditionStatus: {
      type: String,
      enum: ["Brand_New", "Good", "Under_Maintenance", "Damaged", "Retired"],
      default: "Good",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Asset", assetSchema);
