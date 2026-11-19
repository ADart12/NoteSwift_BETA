import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import Department from "./src/models/DepartmentModel.js";
import Designation from "./src/models/DesignationModel.js";
import User from "./src/models/usersModel.js";
import OfficeSettings from "./src/models/officeSetting.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const mongoUri = process.env.MONGO_DB || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ MONGO_DB URI is not defined in .env file.");
  process.exit(1);
}

// 1. Departments Definition
const departmentsData = [
  {
    name: "Administration",
    code: "ADM",
    description: "Executive office, corporate governance, and root administration (CEO / Super Admin)",
    status: "Active",
  },
  {
    name: "Finance",
    code: "FIN",
    description: "Financial planning, accounting, budgets, invoices, and payroll (CFO)",
    status: "Active",
  },
  {
    name: "Technology",
    code: "TECH",
    description: "Software engineering, dev sprints, and IT infrastructure (CTO)",
    status: "Active",
  },
  {
    name: "Human Resources",
    code: "HR",
    description: "Talent acquisition, employee lifecycle, attendance, and leaves (CHRO)",
    status: "Active",
  },
  {
    name: "Academics",
    code: "ACAD",
    description: "Curriculum development, instructors, cohorts, and student assessments (CAO)",
    status: "Active",
  },
  {
    name: "Operations",
    code: "OPS",
    description: "Facilities, inventory assets, vendor procurement, and logistics (COO)",
    status: "Active",
  },
  {
    name: "Sales",
    code: "SAL",
    description: "Corporate B2B partnerships, accounts, deals, and commercial pipeline (CCO)",
    status: "Active",
  },
  {
    name: "Marketing",
    code: "MKT",
    description: "Brand campaigns, inbound lead acquisition, and social channels (CMO)",
    status: "Active",
  },
];

// 2. Standard Designations per Department
const designationsByDeptCode = {
  ADM: [
    { title: "Chief Executive Officer (CEO)", hierarchyLevel: "C_LEVEL" },
    { title: "System Administrator", hierarchyLevel: "MANAGER" },
    { title: "Executive Assistant", hierarchyLevel: "STAFF" },
  ],
  FIN: [
    { title: "Chief Financial Officer (CFO)", hierarchyLevel: "C_LEVEL" },
    { title: "Finance Manager", hierarchyLevel: "MANAGER" },
    { title: "Senior Accountant", hierarchyLevel: "LEAD" },
    { title: "Financial Analyst", hierarchyLevel: "STAFF" },
    { title: "Finance Engineer", hierarchyLevel: "STAFF" },
  ],
  TECH: [
    { title: "Chief Technology Officer (CTO)", hierarchyLevel: "C_LEVEL" },
    { title: "Engineering Manager", hierarchyLevel: "MANAGER" },
    { title: "Senior Full Stack Developer", hierarchyLevel: "LEAD" },
    { title: "DevOps & Cloud Engineer", hierarchyLevel: "STAFF" },
    { title: "QA Automation Engineer", hierarchyLevel: "STAFF" },
  ],
  HR: [
    { title: "Chief Human Resources Officer (CHRO)", hierarchyLevel: "C_LEVEL" },
    { title: "HR Manager", hierarchyLevel: "MANAGER" },
    { title: "Talent Acquisition Specialist", hierarchyLevel: "LEAD" },
    { title: "HR Operations Coordinator", hierarchyLevel: "STAFF" },
  ],
  ACAD: [
    { title: "Chief Academic Officer (CAO)", hierarchyLevel: "C_LEVEL" },
    { title: "Academic Dean / Manager", hierarchyLevel: "MANAGER" },
    { title: "Curriculum Lead", hierarchyLevel: "LEAD" },
    { title: "Senior Lecturer / Faculty", hierarchyLevel: "STAFF" },
  ],
  OPS: [
    { title: "Chief Operating Officer (COO)", hierarchyLevel: "C_LEVEL" },
    { title: "Operations Manager", hierarchyLevel: "MANAGER" },
    { title: "Facilities Lead", hierarchyLevel: "LEAD" },
    { title: "Logistics Coordinator", hierarchyLevel: "STAFF" },
  ],
  SAL: [
    { title: "Chief Commercial Officer (CCO)", hierarchyLevel: "C_LEVEL" },
    { title: "Sales Manager", hierarchyLevel: "MANAGER" },
    { title: "Enterprise Account Manager", hierarchyLevel: "LEAD" },
    { title: "B2B Sales Executive", hierarchyLevel: "STAFF" },
  ],
  MKT: [
    { title: "Chief Marketing Officer (CMO)", hierarchyLevel: "C_LEVEL" },
    { title: "Marketing Manager", hierarchyLevel: "MANAGER" },
    { title: "Growth & Campaign Lead", hierarchyLevel: "LEAD" },
    { title: "Content & Social Media Specialist", hierarchyLevel: "STAFF" },
  ],
};

// 3. Demo Users across ALL Sectors
const demoUsersSpec = [
  // --- ADMINISTRATION ---
  {
    employeeId: "ADM-001",
    fullName: "System Administrator",
    email: "admin@noteswift.com",
    rawPassword: "Admin@123",
    role: "admin",
    deptCode: "ADM",
    designation: "System Administrator",
    phone: "+977 9800000001",
    city: "Kathmandu",
  },
  {
    employeeId: "ADM-002",
    fullName: "Aaditya Prasad Bhatt (CEO)",
    email: "ceo@noteswift.com",
    rawPassword: "Ceo@123",
    role: "ceo",
    deptCode: "ADM",
    designation: "Chief Executive Officer (CEO)",
    phone: "+977 9800000002",
    city: "Kathmandu",
  },

  // --- FINANCE ---
  {
    employeeId: "FIN-001",
    fullName: "Tek Raj Bhatt",
    email: "tekraj@noteswift.com",
    rawPassword: "Finance@123",
    role: "manager",
    deptCode: "FIN",
    designation: "Finance Manager",
    phone: "+977 9811111111",
    city: "Kathmandu",
  },
  {
    employeeId: "FIN-002",
    fullName: "Sophia Sharma (CFO)",
    email: "finance.manager@noteswift.com",
    rawPassword: "Finance@123",
    role: "manager",
    deptCode: "FIN",
    designation: "Chief Financial Officer (CFO)",
    phone: "+977 9811111112",
    city: "Lalitpur",
  },
  {
    employeeId: "FIN-003",
    fullName: "Rohan Shrestha",
    email: "finance.staff@noteswift.com",
    rawPassword: "Finance@123",
    role: "employee",
    deptCode: "FIN",
    designation: "Senior Accountant",
    phone: "+977 9811111113",
    city: "Kathmandu",
  },

  // --- TECHNOLOGY ---
  {
    employeeId: "TECH-001",
    fullName: "Alex Miller (CTO)",
    email: "tech.manager@noteswift.com",
    rawPassword: "Tech@123",
    role: "manager",
    deptCode: "TECH",
    designation: "Chief Technology Officer (CTO)",
    phone: "+977 9822222221",
    city: "Kathmandu",
  },
  {
    employeeId: "TECH-002",
    fullName: "David Chen",
    email: "tech.dev@noteswift.com",
    rawPassword: "Tech@123",
    role: "employee",
    deptCode: "TECH",
    designation: "Senior Full Stack Developer",
    phone: "+977 9822222222",
    city: "Bhaktapur",
  },

  // --- HUMAN RESOURCES ---
  {
    employeeId: "HR-001",
    fullName: "Sarah Jenkins (CHRO)",
    email: "hr.manager@noteswift.com",
    rawPassword: "Hr@123",
    role: "manager",
    deptCode: "HR",
    designation: "Chief Human Resources Officer (CHRO)",
    phone: "+977 9833333331",
    city: "Kathmandu",
  },
  {
    employeeId: "HR-002",
    fullName: "Pooja Gurung",
    email: "hr.staff@noteswift.com",
    rawPassword: "Hr@123",
    role: "employee",
    deptCode: "HR",
    designation: "Talent Acquisition Specialist",
    phone: "+977 9833333332",
    city: "Pokhara",
  },

  // --- ACADEMICS ---
  {
    employeeId: "ACAD-001",
    fullName: "Dr. Robert Vance (CAO)",
    email: "academic.manager@noteswift.com",
    rawPassword: "Academic@123",
    role: "manager",
    deptCode: "ACAD",
    designation: "Chief Academic Officer (CAO)",
    phone: "+977 9844444441",
    city: "Kathmandu",
  },
  {
    employeeId: "ACAD-002",
    fullName: "Anjali Thapa",
    email: "academic.faculty@noteswift.com",
    rawPassword: "Academic@123",
    role: "employee",
    deptCode: "ACAD",
    designation: "Senior Lecturer / Faculty",
    phone: "+977 9844444442",
    city: "Lalitpur",
  },

  // --- OPERATIONS ---
  {
    employeeId: "OPS-001",
    fullName: "Marcus Cole (COO)",
    email: "ops.manager@noteswift.com",
    rawPassword: "Ops@123",
    role: "manager",
    deptCode: "OPS",
    designation: "Chief Operating Officer (COO)",
    phone: "+977 9855555551",
    city: "Kathmandu",
  },
  {
    employeeId: "OPS-002",
    fullName: "Bikram Karki",
    email: "ops.staff@noteswift.com",
    rawPassword: "Ops@123",
    role: "employee",
    deptCode: "OPS",
    designation: "Logistics Coordinator",
    phone: "+977 9855555552",
    city: "Kathmandu",
  },

  // --- SALES / COMMERCIAL ---
  {
    employeeId: "SAL-001",
    fullName: "Elena Rostova (CCO)",
    email: "sales.manager@noteswift.com",
    rawPassword: "Sales@123",
    role: "manager",
    deptCode: "SAL",
    designation: "Chief Commercial Officer (CCO)",
    phone: "+977 9866666661",
    city: "Kathmandu",
  },
  {
    employeeId: "SAL-002",
    fullName: "Karan Maharjan",
    email: "sales.staff@noteswift.com",
    rawPassword: "Sales@123",
    role: "employee",
    deptCode: "SAL",
    designation: "Enterprise Account Manager",
    phone: "+977 9866666662",
    city: "Lalitpur",
  },

  // --- MARKETING ---
  {
    employeeId: "MKT-001",
    fullName: "Jessica Alba (CMO)",
    email: "marketing.manager@noteswift.com",
    rawPassword: "Marketing@123",
    role: "manager",
    deptCode: "MKT",
    designation: "Chief Marketing Officer (CMO)",
    phone: "+977 9877777771",
    city: "Kathmandu",
  },
  {
    employeeId: "MKT-002",
    fullName: "Nabin Adhikari",
    email: "marketing.staff@noteswift.com",
    rawPassword: "Marketing@123",
    role: "employee",
    deptCode: "MKT",
    designation: "Growth & Campaign Lead",
    phone: "+977 9877777772",
    city: "Kathmandu",
  },
];

async function seedAll() {
  try {
    console.log(" Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB successfully.\n");

    const existingUsers = await User.find({}, "employeeId email fullName role");
    console.log(" Current users in DB:", existingUsers);

    // 1. Seed Office Settings
    const existingSettings = await OfficeSettings.findOne();
    if (!existingSettings) {
      await OfficeSettings.create({
        officeStartTime: "09:00",
        officeEndTime: "17:00",
        workingHours: 8,
        gracePeriod: 15,
      });
      console.log(" Created Default Office Settings (09:00 - 17:00).");
    }

    // 2. Seed Departments
    const deptMap = {};
    for (const d of departmentsData) {
      const savedDept = await Department.findOneAndUpdate(
        { code: d.code },
        { ...d, status: "Active" },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      deptMap[d.code] = savedDept;
    }
    console.log(` Seeded ${Object.keys(deptMap).length} Enterprise Departments.`);

    // 3. Seed Designations
    let totalDesignations = 0;
    for (const [code, list] of Object.entries(designationsByDeptCode)) {
      const dept = deptMap[code];
      if (!dept) continue;

      for (const desig of list) {
        await Designation.findOneAndUpdate(
          { title: desig.title, department: dept._id },
          {
            title: desig.title,
            department: dept._id,
            hierarchyLevel: desig.hierarchyLevel,
            status: "Active",
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        totalDesignations++;
      }
    }
    console.log(` Seeded ${totalDesignations} Standard Sector Designations.`);

    // 4. Seed Demo Users
    const userCredentialsReport = [];

    for (const u of demoUsersSpec) {
      const dept = deptMap[u.deptCode];
      if (!dept) {
        console.warn(`Dept code ${u.deptCode} not found for ${u.email}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(u.rawPassword, 10);

      // Find by email or employeeId
      let userDoc = await User.findOne({
        $or: [
          { email: u.email.toLowerCase() },
          { employeeId: u.employeeId },
        ],
      });

      if (userDoc) {
        userDoc.employeeId = u.employeeId;
        userDoc.fullName = u.fullName;
        userDoc.email = u.email.toLowerCase();
        userDoc.phone = u.phone;
        userDoc.department = dept._id;
        userDoc.designation = u.designation;
        userDoc.role = u.role;
        userDoc.password = hashedPassword;
        userDoc.status = "active";
        userDoc.isDeleted = false;
        userDoc.city = u.city;
        userDoc.country = "Nepal";
        await userDoc.save();
      } else {
        await User.create({
          employeeId: u.employeeId,
          fullName: u.fullName,
          email: u.email.toLowerCase(),
          phone: u.phone,
          department: dept._id,
          designation: u.designation,
          role: u.role,
          password: hashedPassword,
          status: "active",
          isDeleted: false,
          city: u.city,
          country: "Nepal",
          joiningDate: new Date("2026-01-15"),
        });
      }

      userCredentialsReport.push({
        sector: dept.name,
        code: dept.code,
        fullName: u.fullName,
        designation: u.designation,
        role: u.role,
        email: u.email,
        password: u.rawPassword,
        employeeId: u.employeeId,
      });
    }

    console.log(` Seeded ${userCredentialsReport.length} Demo Users across all 8 sectors.`);

    // 5. Generate TEST_CREDENTIALS.md file
    const rootDir = path.resolve(__dirname, "..");
    const filePath = path.join(rootDir, "TEST_CREDENTIALS.md");

    const markdownContent = `# 🚀 NoteSwift Enterprise - Test User Credentials

This file contains demo accounts for all organizational sectors in the NoteSwift Attendance & Enterprise System.
Use these accounts to test the dashboard, navigation, attendance check-in/out (webcam + GPS), and role-based permissions.

---

## 🔑 Demo Accounts by Sector

| Sector / Department | Full Name | Designation | System Role | Email Address | Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Administration** | System Administrator | System Administrator | \`admin\` | \`admin@noteswift.com\` | \`Admin@123\` |
| **Administration** | Aaditya Prasad Bhatt | CEO | \`ceo\` (Super Admin) | \`ceo@noteswift.com\` | \`Ceo@123\` |
| **Finance** | Tek Raj Bhatt | Finance Engineer | \`manager\` | \`tekraj@noteswift.com\` | \`Finance@123\` |
| **Finance** | Sophia Sharma | CFO | \`manager\` | \`finance.manager@noteswift.com\` | \`Finance@123\` |
| **Finance** | Rohan Shrestha | Senior Accountant | \`employee\` | \`finance.staff@noteswift.com\` | \`Finance@123\` |
| **Technology** | Alex Miller | CTO | \`manager\` | \`tech.manager@noteswift.com\` | \`Tech@123\` |
| **Technology** | David Chen | Senior Full Stack Dev | \`employee\` | \`tech.dev@noteswift.com\` | \`Tech@123\` |
| **Human Resources** | Sarah Jenkins | CHRO | \`manager\` | \`hr.manager@noteswift.com\` | \`Hr@123\` |
| **Human Resources** | Pooja Gurung | Talent Acquisition | \`employee\` | \`hr.staff@noteswift.com\` | \`Hr@123\` |
| **Academics** | Dr. Robert Vance | CAO / Dean | \`manager\` | \`academic.manager@noteswift.com\` | \`Academic@123\` |
| **Academics** | Anjali Thapa | Senior Faculty | \`employee\` | \`academic.faculty@noteswift.com\` | \`Academic@123\` |
| **Operations** | Marcus Cole | COO | \`manager\` | \`ops.manager@noteswift.com\` | \`Ops@123\` |
| **Operations** | Bikram Karki | Logistics Coordinator | \`employee\` | \`ops.staff@noteswift.com\` | \`Ops@123\` |
| **Sales** | Elena Rostova | CCO | \`manager\` | \`sales.manager@noteswift.com\` | \`Sales@123\` |
| **Sales** | Karan Maharjan | Account Manager | \`employee\` | \`sales.staff@noteswift.com\` | \`Sales@123\` |
| **Marketing** | Jessica Alba | CMO | \`manager\` | \`marketing.manager@noteswift.com\` | \`Marketing@123\` |
| **Marketing** | Nabin Adhikari | Growth Specialist | \`employee\` | \`marketing.staff@noteswift.com\` | \`Marketing@123\` |

---

## 🎯 Quick Testing Scenarios

1. **Admin / Super Admin Testing**:
   - Log in as \`admin@noteswift.com\` or \`ceo@noteswift.com\`
   - Visit **/employees** to manage all staff.
   - Click **+ Add Employee** (or **/invite-employee**) to test the improved direct account creation and email invitation with dynamic department & designation dropdowns.
   - Visit **/attendance** to audit live check-in webcam photos and Google Maps GPS tags for all employees.

2. **Finance Manager Testing**:
   - Log in as \`tekraj@noteswift.com\` or \`finance.manager@noteswift.com\`
   - Test the **Self-Attendance Widget** right on the Dashboard (webcam snapshot + GPS location).
   - Test **Mirror Mode** (flip live camera feed horizontally).
   - Test **Sign Out** to verify the check-out prompt.
   - Navigate to **Attendance** in the sidebar to review department records.

3. **Individual Contributor / Employee Testing**:
   - Log in as \`tech.dev@noteswift.com\` or \`finance.staff@noteswift.com\`
   - Check in on the Dashboard.
   - Visit **/my-attendance** to view personal attendance history, hours, and photo snapshots.

---
*Generated by NoteSwift Database Seeder on ${new Date().toLocaleString()}*
`;

    fs.writeFileSync(filePath, markdownContent, "utf8");
    console.log(` Created test credentials reference file: ${filePath}\n`);

    console.log("==================================================");
    console.log(" SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==================================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

seedAll();
