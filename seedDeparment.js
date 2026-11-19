import mongoose from "mongoose";
import dotenv from "dotenv";
import Department from "./src/models/DepartmentModel.js";

dotenv.config();

const departments = [
  {
    name: "Academics",
    code: "ACAD",
    description: "Curriculum development, instructors, and student assessment (CAO)",
    status: "Active",
  },
  {
    name: "Technology",
    code: "TECH",
    description: "Software engineering, dev sprints, and IT infrastructure (CTO)",
    status: "Active",
  },
  {
    name: "Finance",
    code: "FIN",
    description: "Financial planning, accounting, budgets, invoices, and payroll (CFO)",
    status: "Active",
  },
  {
    name: "Human Resources",
    code: "HR",
    description: "Talent acquisition, employee lifecycle, attendance, and leaves (CHRO)",
    status: "Active",
  },
  {
    name: "Operations",
    code: "OPS",
    description: "Facilities, equipment inventory, vendor management, and logistics (COO)",
    status: "Active",
  },
  {
    name: "Marketing",
    code: "MKT",
    description: "Brand campaigns, inbound lead acquisition, and social channels (CMO)",
    status: "Active",
  },
  {
    name: "Sales",
    code: "SAL",
    description: "Corporate B2B partnerships, retail learner sales, and revenue pipeline (CCO)",
    status: "Active",
  },
  {
    name: "Administration",
    code: "ADM",
    description: "Executive office, corporate governance, and root administration (CEO / Super Admin)",
    status: "Active",
  },
];

const seedDepartments = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB);

    for (const department of departments) {
      await Department.findOneAndUpdate(
        { code: department.code },
        department,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );
    }

    console.log("✅ All 8 Enterprise Departments seeded successfully matching NoteSwift Org Chart.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Department seeding failed:", error);
    process.exit(1);
  }
};

seedDepartments();
