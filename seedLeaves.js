import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Leave from "./src/models/leaveModel.js";
import User from "./src/models/usersModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const mongoUri = process.env.MONGO_DB || process.env.MONGO_URI;

if (!mongoUri) {
  console.error("❌ MONGO_DB URI is not defined in .env file.");
  process.exit(1);
}

async function seedLeaves() {
  try {
    console.log(" Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB successfully.\n");

    // Fetch existing users by email
    const users = await User.find({ isDeleted: false });
    const userByEmail = {};
    users.forEach((u) => {
      userByEmail[u.email.toLowerCase()] = u;
    });

    const adminUser = userByEmail["admin@noteswift.com"] || users[0];
    const techManager = userByEmail["tech.manager@noteswift.com"] || adminUser;
    const financeManager = userByEmail["finance.manager@noteswift.com"] || userByEmail["tekraj@noteswift.com"] || adminUser;
    const hrManager = userByEmail["hr.manager@noteswift.com"] || adminUser;
    const academicManager = userByEmail["academic.manager@noteswift.com"] || adminUser;
    const opsManager = userByEmail["ops.manager@noteswift.com"] || adminUser;
    const salesManager = userByEmail["sales.manager@noteswift.com"] || adminUser;
    const marketingManager = userByEmail["marketing.manager@noteswift.com"] || adminUser;

    const rohanFinance = userByEmail["finance.staff@noteswift.com"] || adminUser;
    const tekrajFinance = userByEmail["tekraj@noteswift.com"] || adminUser;
    const davidTech = userByEmail["tech.dev@noteswift.com"] || adminUser;
    const poojaHr = userByEmail["hr.staff@noteswift.com"] || adminUser;
    const anjaliAcad = userByEmail["academic.faculty@noteswift.com"] || adminUser;
    const bikramOps = userByEmail["ops.staff@noteswift.com"] || adminUser;
    const karanSales = userByEmail["sales.staff@noteswift.com"] || adminUser;
    const nabinMkt = userByEmail["marketing.staff@noteswift.com"] || adminUser;

    // Remove previous seeded leaves for these users to prevent overlap errors
    const employeeIds = [
      rohanFinance._id,
      tekrajFinance._id,
      davidTech._id,
      poojaHr._id,
      anjaliAcad._id,
      bikramOps._id,
      karanSales._id,
      nabinMkt._id,
    ];

    await Leave.deleteMany({ employee: { $in: employeeIds } });
    console.log(" Cleaned previous demo leave requests for clean seeding.");

    const leavesToSeed = [
      // ==========================================
      // 1. APPROVED (ACCEPTED) LEAVES
      // ==========================================
      {
        employee: rohanFinance._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-12T00:00:00.000Z"),
        toDate: new Date("2026-11-13T00:00:00.000Z"),
        days: 2,
        reason: "Attending family religious ceremony and cousin's wedding in Pokhara.",
        status: "Approved",
        remarks: "Approved. Work handoff confirmed with Tek Raj Bhatt.",
        approvedBy: financeManager._id,
        approvedAt: new Date("2026-11-09T14:30:00.000Z"),
      },
      {
        employee: davidTech._id,
        leaveType: "Sick",
        fromDate: new Date("2026-11-04T00:00:00.000Z"),
        toDate: new Date("2026-11-05T00:00:00.000Z"),
        days: 2,
        reason: "Severe seasonal viral flu and fever with doctor's rest prescription.",
        status: "Approved",
        remarks: "Approved. Medical prescription submitted and verified.",
        approvedBy: techManager._id,
        approvedAt: new Date("2026-11-04T09:15:00.000Z"),
      },
      {
        employee: anjaliAcad._id,
        leaveType: "Earned",
        fromDate: new Date("2026-11-23T00:00:00.000Z"),
        toDate: new Date("2026-11-27T00:00:00.000Z"),
        days: 5,
        reason: "Representing university at National AI Pedagogy & Curriculum Innovation Summit.",
        status: "Approved",
        remarks: "Approved. Substitute instructor scheduled for all cohort lectures.",
        approvedBy: academicManager._id,
        approvedAt: new Date("2026-11-08T11:00:00.000Z"),
      },
      {
        employee: bikramOps._id,
        leaveType: "Emergency",
        fromDate: new Date("2026-11-01T00:00:00.000Z"),
        toDate: new Date("2026-11-02T00:00:00.000Z"),
        days: 2,
        reason: "Urgent residential water pipeline burst and emergency repair repairs.",
        status: "Approved",
        remarks: "Retroactively approved under Emergency protocol.",
        approvedBy: opsManager._id,
        approvedAt: new Date("2026-11-02T16:00:00.000Z"),
      },
      {
        employee: karanSales._id,
        leaveType: "Casual",
        fromDate: new Date("2026-10-28T00:00:00.000Z"),
        toDate: new Date("2026-10-30T00:00:00.000Z"),
        days: 3,
        reason: "Personal relocation and apartment lease completion.",
        status: "Approved",
        remarks: "Approved by CCO. Target pipelines reassigned temporarily.",
        approvedBy: salesManager._id,
        approvedAt: new Date("2026-10-27T10:00:00.000Z"),
      },
      {
        employee: poojaHr._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-06T00:00:00.000Z"),
        toDate: new Date("2026-11-06T00:00:00.000Z"),
        days: 1,
        reason: "Government administrative work at Citizen Service Centre.",
        status: "Approved",
        remarks: "Approved.",
        approvedBy: hrManager._id,
        approvedAt: new Date("2026-11-05T15:00:00.000Z"),
      },

      // ==========================================
      // 2. REJECTED LEAVES
      // ==========================================
      {
        employee: davidTech._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-16T00:00:00.000Z"),
        toDate: new Date("2026-11-19T00:00:00.000Z"),
        days: 4,
        reason: "Personal road trip and vacation with friends.",
        status: "Rejected",
        remarks: "Rejected: Critical Q4 cloud infrastructure release scheduled during this sprint. Please reschedule after sprint review on Nov 22.",
        approvedBy: techManager._id,
        approvedAt: new Date("2026-11-09T17:00:00.000Z"),
      },
      {
        employee: karanSales._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-14T00:00:00.000Z"),
        toDate: new Date("2026-11-16T00:00:00.000Z"),
        days: 3,
        reason: "Extended holiday weekend trek.",
        status: "Rejected",
        remarks: "Rejected: On-site enterprise corporate pitch meetings scheduled with partner accounts during these dates.",
        approvedBy: salesManager._id,
        approvedAt: new Date("2026-11-09T16:20:00.000Z"),
      },
      {
        employee: nabinMkt._id,
        leaveType: "Unpaid",
        fromDate: new Date("2026-11-24T00:00:00.000Z"),
        toDate: new Date("2026-11-27T00:00:00.000Z"),
        days: 4,
        reason: "Personal creative retreat and photography workshop.",
        status: "Rejected",
        remarks: "Rejected: Major Black Friday brand campaign runs during this week. Full team availability required.",
        approvedBy: marketingManager._id,
        approvedAt: new Date("2026-11-08T18:45:00.000Z"),
      },
      {
        employee: rohanFinance._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-18T00:00:00.000Z"),
        toDate: new Date("2026-11-20T00:00:00.000Z"),
        days: 3,
        reason: "Out-of-town leisure trip.",
        status: "Rejected",
        remarks: "Rejected: Mid-month payroll tax computation and statutory filings take precedence.",
        approvedBy: financeManager._id,
        approvedAt: new Date("2026-11-09T12:00:00.000Z"),
      },

      // ==========================================
      // 3. PENDING LEAVES (Active for Testing in UI)
      // ==========================================
      {
        employee: poojaHr._id,
        leaveType: "Sick",
        fromDate: new Date("2026-11-12T00:00:00.000Z"),
        toDate: new Date("2026-11-12T00:00:00.000Z"),
        days: 1,
        reason: "Doctor consultation and routine dental treatment procedure.",
        status: "Pending",
        remarks: "",
        approvedBy: null,
        approvedAt: null,
      },
      {
        employee: tekrajFinance._id,
        leaveType: "Earned",
        fromDate: new Date("2026-12-01T00:00:00.000Z"),
        toDate: new Date("2026-12-03T00:00:00.000Z"),
        days: 3,
        reason: "Annual family holiday and relaxation trip.",
        status: "Pending",
        remarks: "",
        approvedBy: null,
        approvedAt: null,
      },
      {
        employee: davidTech._id,
        leaveType: "Emergency",
        fromDate: new Date("2026-11-13T00:00:00.000Z"),
        toDate: new Date("2026-11-13T00:00:00.000Z"),
        days: 1,
        reason: "Urgent family property legal documentation requirement.",
        status: "Pending",
        remarks: "",
        approvedBy: null,
        approvedAt: null,
      },
      {
        employee: anjaliAcad._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-17T00:00:00.000Z"),
        toDate: new Date("2026-11-18T00:00:00.000Z"),
        days: 2,
        reason: "Attending sister's convocation ceremony at Tribhuvan University.",
        status: "Pending",
        remarks: "",
        approvedBy: null,
        approvedAt: null,
      },
      {
        employee: bikramOps._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-19T00:00:00.000Z"),
        toDate: new Date("2026-11-20T00:00:00.000Z"),
        days: 2,
        reason: "Annual vehicle maintenance and family commitments.",
        status: "Pending",
        remarks: "",
        approvedBy: null,
        approvedAt: null,
      },
      {
        employee: nabinMkt._id,
        leaveType: "Casual",
        fromDate: new Date("2026-11-14T00:00:00.000Z"),
        toDate: new Date("2026-11-14T00:00:00.000Z"),
        days: 1,
        reason: "Family gathering in hometown.",
        status: "Pending",
        remarks: "",
        approvedBy: null,
        approvedAt: null,
      },
    ];

    const inserted = await Leave.insertMany(leavesToSeed);

    console.log(`✅ Successfully seeded ${inserted.length} Leave records in proper format:`);
    console.log(`   - 🟢 Approved (Accepted): ${inserted.filter((l) => l.status === "Approved").length}`);
    console.log(`   - 🔴 Rejected:            ${inserted.filter((l) => l.status === "Rejected").length}`);
    console.log(`   - 🟡 Pending:             ${inserted.filter((l) => l.status === "Pending").length}`);

    console.log("\n==================================================");
    console.log(" LEAVE SEEDING COMPLETED SUCCESSFULLY!");
    console.log("==================================================");

    process.exit(0);
  } catch (error) {
    console.error("❌ Leave Seeding Error:", error);
    process.exit(1);
  }
}

seedLeaves();
