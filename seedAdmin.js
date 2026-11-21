import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import User from "./src/models/usersModel.js";
import Department from "./src/models/DepartmentModel.js";
import Designation from "./src/models/DesignationModel.js";
import OfficeSettings from "./src/models/officeSetting.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const mongoUri = process.env.MONGO_DB || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ MONGO_DB URI is not defined in .env file.");
  process.exit(1);
}

// Administration Department Definition matching NoteSwift V3 Enterprise Architecture
const adminDeptData = {
  name: "Administration",
  code: "ADM",
  description: "Executive office, corporate governance, and root administration (CEO / Super Admin)",
  status: "Active",
};

// Standard Administration Designations
const adminDesignations = [
  { title: "Chief Executive Officer (CEO)", hierarchyLevel: "C_LEVEL" },
  { title: "System Administrator", hierarchyLevel: "MANAGER" },
  { title: "Executive Assistant", hierarchyLevel: "STAFF" },
];

// Admin & Executive Accounts Specification matching NoteSwift V3 Architecture & TEST_CREDENTIALS.md
const adminUsersSpec = [
  {
    employeeId: "ADM-001",
    fullName: "System Administrator",
    email: "bhattaaditya976@gmail.com",
    rawPassword: "Admin@123",
    role: "admin",
    designation: "System Administrator",
    phone: "+977 9119078536",
    city: "Kathmandu",
    country: "Nepal",
  },
  // {
  //   employeeId: "ADM-002",
  //   fullName: "Aaditya Prasad Bhatt (CEO)",
  //   email: "ceo@noteswift.com",
  //   rawPassword: "Ceo@123",
  //   role: "ceo",
  //   designation: "Chief Executive Officer (CEO)",
  //   phone: "+977 9800000002",
  //   city: "Kathmandu",
  //   country: "Nepal",
  // },
];

const seedAdmin = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB successfully.\n");

    // 1. Ensure Office Settings exist
    const existingSettings = await OfficeSettings.findOne();
    if (!existingSettings) {
      await OfficeSettings.create({
        companyName: "Noteswift Pvt. Ltd.",
        officeStartTime: "09:00",
        officeEndTime: "17:00",
        workingHours: 8,
        gracePeriod: 15,
      });
      console.log("🏢 Created Default Office Settings (09:00 - 17:00).");
    }

    // 2. Ensure Administration Department exists
    const adminDept = await Department.findOneAndUpdate(
      { code: adminDeptData.code },
      adminDeptData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`📁 Administration Department verified: [${adminDept.code}] ${adminDept.name}`);

    // 3. Ensure Administration Designations exist
    for (const desig of adminDesignations) {
      await Designation.findOneAndUpdate(
        { title: desig.title, department: adminDept._id },
        {
          title: desig.title,
          department: adminDept._id,
          hierarchyLevel: desig.hierarchyLevel,
          status: "Active",
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log("📋 Standard Administration Designations verified (CEO, System Administrator, Executive Assistant).");

    // 4. Clean up legacy demo admin if present (admin@example.com)
    const legacyAdmin = await User.findOne({ email: "admin@example.com" });
    if (legacyAdmin) {
      console.log("🧹 Migrating legacy 'admin@example.com' to NoteSwift Enterprise standard...");
      await User.deleteOne({ _id: legacyAdmin._id });
    }

    // 5. Seed / Upsert Admin & CEO accounts
    console.log("\n👤 Seeding Administrative & Executive Accounts...");
    const seededAccounts = [];

    for (const spec of adminUsersSpec) {
      const hashedPassword = await bcrypt.hash(spec.rawPassword, 10);

      // Search by email or employeeId for idempotency
      let user = await User.findOne({
        $or: [
          { email: spec.email.toLowerCase() },
          { employeeId: spec.employeeId },
        ],
      });

      if (user) {
        user.employeeId = spec.employeeId;
        user.fullName = spec.fullName;
        user.email = spec.email.toLowerCase();
        user.phone = spec.phone;
        user.department = adminDept._id;
        user.designation = spec.designation;
        user.role = spec.role;
        user.password = hashedPassword;
        user.status = "active";
        user.isDeleted = false;
        user.city = spec.city;
        user.country = spec.country;
        await user.save();
        console.log(`  ↻ Updated existing account: ${spec.fullName} (${spec.email})`);
      } else {
        user = await User.create({
          employeeId: spec.employeeId,
          fullName: spec.fullName,
          email: spec.email.toLowerCase(),
          phone: spec.phone,
          department: adminDept._id,
          designation: spec.designation,
          role: spec.role,
          password: hashedPassword,
          status: "active",
          isDeleted: false,
          city: spec.city,
          country: spec.country,
          joiningDate: new Date("2026-01-01"),
        });
        console.log(`  ➕ Created new account: ${spec.fullName} (${spec.email})`);
      }

      seededAccounts.push({
        "Employee ID": spec.employeeId,
        "Full Name": spec.fullName,
        "Designation": spec.designation,
        "Role": spec.role,
        "Email": spec.email,
        "Password": spec.rawPassword,
      });
    }

    console.log("\n========================================================");
    console.log("🚀 NOTE-SWIFT V3 ENTERPRISE ADMIN SEED SUMMARY");
    console.log("========================================================");
    console.table(seededAccounts);
    console.log("========================================================\n");

    console.log("✅ Admin seeding completed successfully according to the V3 Enterprise Architecture!");
    process.exit(0);

  } catch (error) {
    console.error("❌ Admin Seeding Error:", error.message);
    process.exit(1);
  }
};

seedAdmin();