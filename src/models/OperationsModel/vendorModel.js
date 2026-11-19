import mongoose from "mongoose";

const vendorSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      required: true,
      trim: true,
    },
    contactPerson: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
      trim: true,
    },
    serviceType: {
      type: String,
      enum: ["Cloud_Provider", "Hardware_Supplier", "SaaS_Subscription", "Office_Supplies", "Facility_Maintenance", "Other"],
      default: "Other",
    },
    address: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Inactive", "Blacklisted"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Vendor", vendorSchema);
