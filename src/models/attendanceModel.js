import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dateAD: {
      type: Date,
      required: true,
    },

    dateBS: {
      type: String,
      required: true,
    },

    checkIn: {
      type: String, // Example: "09:05 AM"
      default: null,
    },

    checkInPhoto: {
      type: String, // base64 or URL
      default: null,
    },

    checkInLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      address: { type: String, default: "" },
    },

    checkOut: {
      type: String, // Example: "05:30 PM"
      default: null,
    },

    checkOutPhoto: {
      type: String, // base64 or URL
      default: null,
    },

    checkOutLocation: {
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      address: { type: String, default: "" },
    },

    workingHours: {
      type: Number, // Example: 8.5
      default: 0,
    },

    lateMinutes: {
      type: Number,
      default: 0,
    },

    overtime: {
      type: Number, // in hours
      default: 0,
    },

    status: {
      type: String,
      enum: [
        "Present",
        "Absent",
        "Late",
        "Half Day",
        "Leave",
        "Holiday",
      ],
      default: "Present",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance for the same employee on the same day
attendanceSchema.index({ employee: 1, dateAD: 1 }, { unique: true });

const Attendance = mongoose.model("Attendance", attendanceSchema);

export default Attendance;
