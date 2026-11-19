import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import Course from "./src/models/AcademicsModel/courseModel.js";
import BatchCohort from "./src/models/AcademicsModel/batchCohortModel.js";
import StudentEnrollment from "./src/models/AcademicsModel/studentEnrollmentModel.js";
import Client from "./src/models/CommercialModel/clientModel.js";
import SalesOrder from "./src/models/CommercialModel/salesOrderModel.js";
import Opportunity from "./src/models/CommercialModel/opportunityModel.js";
import Invoice from "./src/models/FinanceModel/invoiceModel.js";
import Expense from "./src/models/FinanceModel/expensesModel.js";
import Budget from "./src/models/FinanceModel/budgetSchema.js";
import User from "./src/models/usersModel.js";
import Department from "./src/models/DepartmentModel.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config();

const mongoUri = process.env.MONGO_DB || process.env.MONGO_URI;

const seedExecutiveData = async () => {
  try {
    console.log(" Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB successfully.\n");

    // 1. Fetch Key Users
    const caoUser = await User.findOne({ email: "academic.manager@noteswift.com" }) || await User.findOne({ role: "manager" });
    const facultyUser = await User.findOne({ email: "academic.faculty@noteswift.com" }) || caoUser;
    const adminUser = await User.findOne({ email: "admin@noteswift.com" }) || await User.findOne({ role: "admin" });
    const ccoUser = await User.findOne({ email: "sales.manager@noteswift.com" }) || caoUser;

    const acadDept = await Department.findOne({ code: "ACAD" });
    const finDept = await Department.findOne({ code: "FIN" });

    // 2. Seed Academic Courses
    const coursesData = [
      {
        code: "FSD-101",
        title: "Full Stack Web Engineering (React, Node, Cloud)",
        description: "Master modern enterprise web applications with TypeScript, React, Express, MongoDB, and AWS.",
        curriculumLead: caoUser._id,
        price: 45000,
        durationWeeks: 16,
        status: "Active",
      },
      {
        code: "AI-201",
        title: "Artificial Intelligence & Applied Machine Learning",
        description: "Deep dive into Python, neural networks, PyTorch, LLMs, and enterprise AI automation.",
        curriculumLead: caoUser._id,
        price: 65000,
        durationWeeks: 20,
        status: "Active",
      },
      {
        code: "DS-301",
        title: "Data Science & Big Data Engineering",
        description: "Statistical modeling, SQL, Apache Spark, PowerBI, and predictive business intelligence.",
        curriculumLead: caoUser._id,
        price: 55000,
        durationWeeks: 18,
        status: "Active",
      },
      {
        code: "UX-102",
        title: "Modern UI/UX Product Design & Systems",
        description: "Human-centered design, Figma design systems, interactive prototyping, and user research.",
        curriculumLead: caoUser._id,
        price: 35000,
        durationWeeks: 12,
        status: "Active",
      },
      {
        code: "CYB-401",
        title: "Cybersecurity & Cloud Defense Architectures",
        description: "Network security, ethical hacking, SOC monitoring, and cloud compliance.",
        curriculumLead: caoUser._id,
        price: 60000,
        durationWeeks: 16,
        status: "Active",
      },
      {
        code: "DEV-501",
        title: "DevOps & Cloud Native Architecture",
        description: "Docker, Kubernetes, Terraform, CI/CD pipelines, and multi-cloud reliability engineering.",
        curriculumLead: caoUser._id,
        price: 50000,
        durationWeeks: 14,
        status: "Active",
      },
    ];

    const seededCourses = [];
    for (const c of coursesData) {
      const course = await Course.findOneAndUpdate(
        { code: c.code },
        { ...c, isDeleted: false },
        { upsert: true, new: true }
      );
      seededCourses.push(course);
    }
    console.log(`✅ Seeded ${seededCourses.length} Academic Courses.`);

    // 3. Seed Batch Cohorts
    const cohortsData = [
      {
        cohortCode: "COH-2026-FSD-01",
        name: "Spring 2026 Full Stack Cohort Alpha",
        course: seededCourses[0]._id,
        instructor: facultyUser._id,
        academicManager: caoUser._id,
        startDate: new Date("2026-02-01"),
        endDate: new Date("2026-06-01"),
        maxCapacity: 35,
        currentEnrollmentCount: 32,
        status: "Ongoing",
      },
      {
        cohortCode: "COH-2026-AI-01",
        name: "Q1 Applied AI Masters Cohort",
        course: seededCourses[1]._id,
        instructor: facultyUser._id,
        academicManager: caoUser._id,
        startDate: new Date("2026-03-15"),
        endDate: new Date("2026-08-15"),
        maxCapacity: 30,
        currentEnrollmentCount: 28,
        status: "Ongoing",
      },
      {
        cohortCode: "COH-2026-DS-01",
        name: "Enterprise Data Analytics Batch 4",
        course: seededCourses[2]._id,
        instructor: facultyUser._id,
        academicManager: caoUser._id,
        startDate: new Date("2026-04-10"),
        endDate: new Date("2026-09-10"),
        maxCapacity: 30,
        currentEnrollmentCount: 25,
        status: "Ongoing",
      },
      {
        cohortCode: "COH-2026-UX-01",
        name: "Design Systems & Product UI Sprint",
        course: seededCourses[3]._id,
        instructor: facultyUser._id,
        academicManager: caoUser._id,
        startDate: new Date("2026-05-01"),
        endDate: new Date("2026-08-01"),
        maxCapacity: 25,
        currentEnrollmentCount: 22,
        status: "Upcoming",
      },
    ];

    const seededCohorts = [];
    for (const ch of cohortsData) {
      const cohort = await BatchCohort.findOneAndUpdate(
        { cohortCode: ch.cohortCode },
        { ...ch, isDeleted: false },
        { upsert: true, new: true }
      );
      seededCohorts.push(cohort);
    }
    console.log(`✅ Seeded ${seededCohorts.length} Batch Cohorts.`);

    // 4. Seed Clients & Students
    const sampleStudents = [
      { name: "Aarav Sharma", email: "aarav.sharma@gmail.com", phone: "+977 9841123456", status: "Active_Student", type: "Individual_Learner" },
      { name: "Binita Adhikari", email: "binita.a@hotmail.com", phone: "+977 9841234567", status: "Active_Student", type: "Individual_Learner" },
      { name: "Chirag Pradhan", email: "chirag.p@yahoo.com", phone: "+977 9841345678", status: "Active_Student", type: "Individual_Learner" },
      { name: "Deepa Shrestha", email: "deepa.s@gmail.com", phone: "+977 9841456789", status: "Active_Student", type: "Individual_Learner" },
      { name: "Eshan Thapa", email: "eshan.t@gmail.com", phone: "+977 9841567890", status: "Active_Student", type: "Individual_Learner" },
      { name: "Gita Basnet", email: "gita.basnet@gmail.com", phone: "+977 9841678901", status: "Active_Student", type: "Individual_Learner" },
      { name: "Hari Krishna Poudel", email: "hari.p@outlook.com", phone: "+977 9841789012", status: "Active_Student", type: "Individual_Learner" },
      { name: "Ishwor Karki", email: "ishwor.k@gmail.com", phone: "+977 9841890123", status: "Active_Student", type: "Individual_Learner" },
      { name: "Jyoti Maharjan", email: "jyoti.m@gmail.com", phone: "+977 9841901234", status: "Active_Student", type: "Individual_Learner" },
      { name: "Kritika Rai", email: "kritika.rai@gmail.com", phone: "+977 9842012345", status: "Active_Student", type: "Individual_Learner" },
      { name: "Ncell Axiata Ltd (Corporate Cohort)", email: "corporate.training@ncell.com.np", phone: "+977 1 4445555", status: "Corporate_Partner", type: "B2B_Corporate" },
      { name: "F1Soft International (Engineering Upskill)", email: "talent@f1soft.com", phone: "+977 1 5556666", status: "Corporate_Partner", type: "B2B_Corporate" },
    ];

    const seededClients = [];
    for (const st of sampleStudents) {
      const client = await Client.findOneAndUpdate(
        { email: st.email },
        {
          name: st.name,
          contactName: st.name,
          email: st.email,
          phone: st.phone,
          clientType: st.type,
          status: st.status,
          isDeleted: false,
        },
        { upsert: true, new: true }
      );
      seededClients.push(client);
    }
    console.log(`✅ Seeded ${seededClients.length} Clients / Student Accounts.`);

    // 5. Seed Student Enrollments
    let totalEnrollments = 0;
    for (let i = 0; i < seededClients.length; i++) {
      const cl = seededClients[i];
      const ch = seededCohorts[i % seededCohorts.length];
      await StudentEnrollment.findOneAndUpdate(
        { client: cl._id, cohort: ch._id },
        {
          client: cl._id,
          cohort: ch._id,
          enrollmentDate: new Date("2026-02-10"),
          status: "Enrolled",
          attendancePercentage: 88 + (i % 10),
          finalScore: 82 + (i % 15),
          certificateIssued: false,
        },
        { upsert: true, new: true }
      );
      totalEnrollments++;
    }
    console.log(`✅ Seeded ${totalEnrollments} Student Enrollments.`);

    // 6. Seed Realistic Invoices for Monthly Revenue Breakdown across FY 2026-27 (Apr 2026 - Mar 2027)
    // Values mirror enterprise monthly revenue targets (₹22L - ₹43.5L per month = ₹3.24+ Cr total revenue)
    const monthlyTargets = [
      { monthStr: "2026-04", issueDate: new Date("2026-04-15"), count: 4, baseRev: 2240000 },
      { monthStr: "2026-05", issueDate: new Date("2026-05-15"), count: 4, baseRev: 2480000 },
      { monthStr: "2026-06", issueDate: new Date("2026-06-15"), count: 4, baseRev: 2390000 },
      { monthStr: "2026-07", issueDate: new Date("2026-07-15"), count: 5, baseRev: 2650000 },
      { monthStr: "2026-08", issueDate: new Date("2026-08-15"), count: 5, baseRev: 2810000 },
      { monthStr: "2026-09", issueDate: new Date("2026-09-15"), count: 5, baseRev: 3120000 },
      { monthStr: "2026-10", issueDate: new Date("2026-10-15"), count: 6, baseRev: 3380000 },
      { monthStr: "2026-11", issueDate: new Date("2026-11-15"), count: 6, baseRev: 3560000 },
      { monthStr: "2026-12", issueDate: new Date("2026-12-15"), count: 6, baseRev: 3750000 },
      { monthStr: "2027-01", issueDate: new Date("2027-01-15"), count: 6, baseRev: 3920000 },
      { monthStr: "2027-02", issueDate: new Date("2027-02-15"), count: 7, baseRev: 4100000 },
      { monthStr: "2027-03", issueDate: new Date("2027-03-15"), count: 7, baseRev: 4350000 },
    ];

    let invoiceCounter = 1;
    for (const mt of monthlyTargets) {
      // 1 major corporate invoice
      const corporateAmt = Math.round(mt.baseRev * 0.65);
      const corporateInvNum = `INV-2026-${String(invoiceCounter++).padStart(4, "0")}`;

      await Invoice.findOneAndUpdate(
        { invoiceNumber: corporateInvNum },
        {
          invoiceNumber: corporateInvNum,
          clientName: "Ncell Axiata & Partner Corporate Cohort",
          clientEmail: "corporate.training@ncell.com.np",
          clientPhone: "+977 1 4445555",
          clientAddress: "Lainchaur, Kathmandu, Nepal",
          type: "Receivable",
          department: "Sales",
          lineItems: [
            {
              description: `Enterprise Upskill Training Package (${mt.monthStr})`,
              quantity: 1,
              unitPrice: corporateAmt,
              amount: corporateAmt,
            },
          ],
          subtotal: corporateAmt,
          taxRate: 13,
          taxAmount: Math.round(corporateAmt * 0.13),
          discount: 0,
          totalAmount: corporateAmt,
          paidAmount: corporateAmt,
          issueDate: mt.issueDate,
          dueDate: new Date(mt.issueDate.getTime() + 15 * 86400000),
          paidDate: new Date(mt.issueDate.getTime() + 5 * 86400000),
          status: "Paid",
          paymentMethod: "Bank_Transfer",
          createdBy: adminUser._id,
          isDeleted: false,
        },
        { upsert: true, new: true }
      );

      // 1 retail learner aggregated invoice
      const retailAmt = mt.baseRev - corporateAmt;
      const retailInvNum = `INV-2026-${String(invoiceCounter++).padStart(4, "0")}`;

      await Invoice.findOneAndUpdate(
        { invoiceNumber: retailInvNum },
        {
          invoiceNumber: retailInvNum,
          clientName: "Direct Student Admissions & Tuition Receipts",
          clientEmail: "admissions@noteswift.com",
          clientPhone: "+977 1 4440000",
          clientAddress: "Kathmandu Valley, Nepal",
          type: "Receivable",
          department: "Academics",
          lineItems: [
            {
              description: `Batch Tuition Fees - Direct Learner Admissions (${mt.monthStr})`,
              quantity: 1,
              unitPrice: retailAmt,
              amount: retailAmt,
            },
          ],
          subtotal: retailAmt,
          taxRate: 13,
          taxAmount: Math.round(retailAmt * 0.13),
          discount: 0,
          totalAmount: retailAmt,
          paidAmount: retailAmt,
          issueDate: mt.issueDate,
          dueDate: new Date(mt.issueDate.getTime() + 20 * 86400000),
          paidDate: new Date(mt.issueDate.getTime() + 8 * 86400000),
          status: "Paid",
          paymentMethod: "Card",
          createdBy: adminUser._id,
          isDeleted: false,
        },
        { upsert: true, new: true }
      );
    }
    console.log(`✅ Seeded ${invoiceCounter - 1} Real Monthly Invoices matching FY 2026-27 Revenue Targets.`);

    console.log("\n========================================================");
    console.log("🚀 EXECUTIVE DASHBOARD SEEDING COMPLETED!");
    console.log("========================================================\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
};

seedExecutiveData();
