import User from "../models/usersModel.js";
import Department from "../models/DepartmentModel.js";
import Attendance from "../models/attendanceModel.js";
import Leave from "../models/leaveModel.js";
import Invoice from "../models/FinanceModel/invoiceModel.js";
import Expense from "../models/FinanceModel/expensesModel.js";
import Budget from "../models/FinanceModel/budgetSchema.js";
import Course from "../models/AcademicsModel/courseModel.js";
import BatchCohort from "../models/AcademicsModel/batchCohortModel.js";
import StudentEnrollment from "../models/AcademicsModel/studentEnrollmentModel.js";
import Client from "../models/CommercialModel/clientModel.js";
import Opportunity from "../models/CommercialModel/opportunityModel.js";

// Helper: Format INR currency
const formatCurrency = (val) => {
  const num = Number(val || 0);
  return "₹ " + num.toLocaleString("en-IN");
};

// Helper: Format short Lakhs / Crores
const formatShortCurrency = (val) => {
  const num = Number(val || 0);
  if (num >= 10000000) {
    return `₹ ${(num / 10000000).toFixed(2)} Cr`;
  }
  if (num >= 100000) {
    return `₹ ${(num / 100000).toFixed(2)} L`;
  }
  return formatCurrency(num);
};

// ════════════════════════════════════════════════════════════════════════════
// GET EXECUTIVE OVERVIEW (100% Database-Driven - Zero Mock Data)
// ════════════════════════════════════════════════════════════════════════════
export const getExecutiveOverview = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Date boundaries for this month & last month
    const startOfThisMonth = new Date(currentYear, currentMonth, 1);
    const endOfThisMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const startOfLastMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfLastMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. Parallel Database Queries directly on MongoDB
    const [
      totalEmployees,
      activeEmployees,
      newEmployeesThisMonth,
      activeDepartments,
      activeCourses,
      draftCourses,
      activeCohorts,
      activeEnrollments,
      completedEnrollments,
      totalEnrollments,
      totalClients,
      newClientsThisMonth,
      newClientsLastMonth,
      pendingLeaves,
      urgentLeaves,
      pendingExpenses,
      pendingBudgets,
      onLeaveToday,
      allReceivableInvoices,
      allApprovedExpenses,
      allPayableInvoices,
      thisMonthAttendance,
      lastMonthAttendance,
      opportunities,
    ] = await Promise.all([
      // Total Employees in DB
      User.countDocuments({ isDeleted: false }),

      // Active Employees in DB
      User.countDocuments({ isDeleted: false, status: "active" }),

      // New employees joined this month
      User.countDocuments({
        isDeleted: false,
        createdAt: { $gte: startOfThisMonth },
      }),

      // Active Departments in DB
      Department.countDocuments({ status: "Active" }),

      // Active Courses in DB
      Course.countDocuments({ isDeleted: false, status: "Active" }),

      // Draft / Upcoming Courses in DB
      Course.countDocuments({ isDeleted: false, status: "Draft" }),

      // Batch Cohorts
      BatchCohort.countDocuments({ isDeleted: false, status: { $in: ["Ongoing", "Upcoming"] } }),

      // Active Student Enrollments
      StudentEnrollment.countDocuments({ status: { $in: ["Enrolled", "In_Progress"] } }),

      // Completed Student Enrollments
      StudentEnrollment.countDocuments({ status: "Completed" }),

      // Total Enrollments
      StudentEnrollment.countDocuments(),

      // Total Clients / Learners
      Client.countDocuments({ isDeleted: false }),

      // New Clients this month
      Client.countDocuments({ isDeleted: false, createdAt: { $gte: startOfThisMonth } }),

      // New Clients last month
      Client.countDocuments({ isDeleted: false, createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),

      // Pending Leaves
      Leave.countDocuments({ status: "Pending" }),

      // Urgent Leaves (within 3 days)
      Leave.countDocuments({
        status: "Pending",
        fromDate: { $lte: new Date(Date.now() + 3 * 86400000) },
      }),

      // Pending Expenses
      Expense.countDocuments({ status: "PENDING", isDeleted: false }),

      // Pending Budgets
      Budget.countDocuments({ status: "pending", isDeleted: false }),

      // On Leave Today
      Leave.countDocuments({
        status: "Approved",
        fromDate: { $lte: todayEnd },
        toDate: { $gte: todayStart },
      }),

      // Receivable Invoices
      Invoice.find({ isDeleted: false, type: "Receivable" }),

      // Approved Expenses
      Expense.find({ isDeleted: false, status: "APPROVED" }),

      // Paid Payable Invoices
      Invoice.find({ isDeleted: false, type: "Payable", status: "Paid" }),

      // Attendance records for this month
      Attendance.find({
        dateAD: { $gte: startOfThisMonth, $lte: endOfThisMonth },
      }),

      // Attendance records for last month
      Attendance.find({
        dateAD: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      }),

      // Commercial Opportunities
      Opportunity.find({ isDeleted: { $ne: true } }),
    ]);

    // 2. Real Financial Totals from Database
    const totalRevenue = allReceivableInvoices.reduce((acc, inv) => {
      const amt = inv.paidAmount > 0 ? inv.paidAmount : (inv.status === "Paid" ? inv.totalAmount : 0);
      return acc + (amt || 0);
    }, 0);

    const approvedExpensesTotal = allApprovedExpenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
    const payableInvoicesTotal = allPayableInvoices.reduce((acc, inv) => acc + (inv.paidAmount || inv.totalAmount || 0), 0);
    const totalExpenses = approvedExpensesTotal + payableInvoicesTotal;

    const netProfit = Math.max(0, totalRevenue - totalExpenses);
    const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    // 3. This Month vs Last Month Revenue
    const thisMonthInvoices = allReceivableInvoices.filter((inv) => {
      const d = new Date(inv.issueDate || inv.createdAt);
      return d >= startOfThisMonth && d <= endOfThisMonth;
    });
    const lastMonthInvoices = allReceivableInvoices.filter((inv) => {
      const d = new Date(inv.issueDate || inv.createdAt);
      return d >= startOfLastMonth && d <= endOfLastMonth;
    });

    const thisMonthRevenue = thisMonthInvoices.reduce(
      (s, i) => s + (i.paidAmount > 0 ? i.paidAmount : (i.status === "Paid" ? i.totalAmount : 0)),
      0
    );
    const lastMonthRevenue = lastMonthInvoices.reduce(
      (s, i) => s + (i.paidAmount > 0 ? i.paidAmount : (i.status === "Paid" ? i.totalAmount : 0)),
      0
    );

    let revGrowthPct = 0;
    if (lastMonthRevenue > 0) {
      revGrowthPct = Number((((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1));
    } else if (thisMonthRevenue > 0) {
      revGrowthPct = 100;
    }

    // 4. This Month vs Last Month Operating Expenses & Profit
    const thisMonthExpenseSum = allApprovedExpenses
      .filter((e) => {
        const d = new Date(e.expenseDate || e.createdAt);
        return d >= startOfThisMonth && d <= endOfThisMonth;
      })
      .reduce((s, e) => s + (e.amount || 0), 0);

    const lastMonthExpenseSum = allApprovedExpenses
      .filter((e) => {
        const d = new Date(e.expenseDate || e.createdAt);
        return d >= startOfLastMonth && d <= endOfLastMonth;
      })
      .reduce((s, e) => s + (e.amount || 0), 0);

    const thisMonthProfit = Math.max(0, thisMonthRevenue - thisMonthExpenseSum);
    const lastMonthProfit = Math.max(0, lastMonthRevenue - lastMonthExpenseSum);

    let profitGrowthPct = 0;
    if (lastMonthProfit > 0) {
      profitGrowthPct = Number((((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100).toFixed(1));
    } else if (thisMonthProfit > 0) {
      profitGrowthPct = 100;
    }

    // 5. Active Students count from DB
    const activeStudentsCount = activeEnrollments > 0 ? activeEnrollments : totalClients;
    const admissionsThisMonth = newClientsThisMonth;
    const admissionsLastMonth = newClientsLastMonth;

    let admissionGrowthPct = 0;
    if (admissionsLastMonth > 0) {
      admissionGrowthPct = Number((((admissionsThisMonth - admissionsLastMonth) / admissionsLastMonth) * 100).toFixed(1));
    } else if (admissionsThisMonth > 0) {
      admissionGrowthPct = 100;
    }

    // 6. Completion Rate & Lead Conversion from DB
    const courseCompletionRate = totalEnrollments > 0 ? Number(((completedEnrollments / totalEnrollments) * 100).toFixed(1)) : 0;
    const totalDeals = opportunities.length;
    const wonDeals = opportunities.filter((o) => o.stage === "Closed_Won").length;
    const leadConversionRate = totalDeals > 0 ? Number(((wonDeals / totalDeals) * 100).toFixed(1)) : 0;

    // 7. Attendance Rate from DB
    const calcAttendanceRate = (records) => {
      if (!records || records.length === 0) return 0;
      const presentCount = records.filter((r) => ["Present", "Half Day", "Late"].includes(r.status)).length;
      return Number(((presentCount / records.length) * 100).toFixed(1));
    };

    const thisMonthAttendanceRate = calcAttendanceRate(thisMonthAttendance);
    const lastMonthAttendanceRate = calcAttendanceRate(lastMonthAttendance);
    const attendanceGrowth = Number((thisMonthAttendanceRate - lastMonthAttendanceRate).toFixed(1));

    // 8. Pending Approvals
    const totalPendingApprovals = pendingLeaves + pendingExpenses + pendingBudgets;
    const urgentCount = urgentLeaves;

    // 9. Monthly Revenue Trend from Real Invoices (No base/mock arrays)
    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const invoiceMonthlyMap = {};
    const expenseMonthlyMap = {};

    for (const inv of allReceivableInvoices) {
      const d = new Date(inv.issueDate || inv.createdAt);
      const mIdx = d.getMonth();
      const fiscalIdx = (mIdx + 9) % 12; // Apr = 0, Mar = 11
      const amt = inv.paidAmount > 0 ? inv.paidAmount : (inv.status === "Paid" ? inv.totalAmount : 0);
      invoiceMonthlyMap[fiscalIdx] = (invoiceMonthlyMap[fiscalIdx] || 0) + (amt || 0);
    }

    for (const exp of allApprovedExpenses) {
      const d = new Date(exp.expenseDate || exp.createdAt);
      const mIdx = d.getMonth();
      const fiscalIdx = (mIdx + 9) % 12;
      expenseMonthlyMap[fiscalIdx] = (expenseMonthlyMap[fiscalIdx] || 0) + (exp.amount || 0);
    }

    const hasAnyInvoices = Object.keys(invoiceMonthlyMap).length > 0;

    const monthlyRevenueData = hasAnyInvoices
      ? monthNames.map((m, idx) => {
          const rev = invoiceMonthlyMap[idx] || 0;
          const exp = expenseMonthlyMap[idx] || 0;
          return {
            month: m,
            revenue: rev,
            displayRev: Number((rev / 100000).toFixed(1)),
            expenses: exp,
            profit: Math.max(0, rev - exp),
          };
        })
      : [];

    // 10. Quick Stats Summary (Real Database Comparisons)
    const quickStats = [
      {
        metric: "Monthly Revenue",
        thisMonth: formatCurrency(thisMonthRevenue),
        lastMonth: formatCurrency(lastMonthRevenue),
        growth: `${revGrowthPct >= 0 ? "+" : ""}${revGrowthPct}%`,
        positive: revGrowthPct >= 0,
      },
      {
        metric: "Operating Profit",
        thisMonth: formatCurrency(thisMonthProfit),
        lastMonth: formatCurrency(lastMonthProfit),
        growth: `${profitGrowthPct >= 0 ? "+" : ""}${profitGrowthPct}%`,
        positive: profitGrowthPct >= 0,
      },
      {
        metric: "Student Admissions",
        thisMonth: String(admissionsThisMonth),
        lastMonth: String(admissionsLastMonth),
        growth: `${admissionGrowthPct >= 0 ? "+" : ""}${admissionGrowthPct}%`,
        positive: admissionGrowthPct >= 0,
      },
      {
        metric: "Course Completion Rate",
        thisMonth: `${courseCompletionRate}%`,
        lastMonth: "—",
        growth: "0%",
        positive: true,
      },
      {
        metric: "Lead Conversion Rate",
        thisMonth: `${leadConversionRate}%`,
        lastMonth: "—",
        growth: "0%",
        positive: true,
      },
      {
        metric: "Employee Attendance",
        thisMonth: `${thisMonthAttendanceRate}%`,
        lastMonth: `${lastMonthAttendanceRate}%`,
        growth: `${attendanceGrowth >= 0 ? "+" : ""}${attendanceGrowth}%`,
        positive: attendanceGrowth >= 0,
      },
    ];

    // 11. Structured Response Payload - Zero Mock Data
    return res.status(200).json({
      success: true,
      data: {
        // Quick Header Strip
        headerStats: {
          ytdRevenue: formatShortCurrency(totalRevenue),
          activeStudents: activeStudentsCount.toLocaleString("en-IN"),
          pendingActions: totalPendingApprovals,
          deptPerformance: `${thisMonthAttendanceRate}%`,
        },

        // 9 KPI Stat Cards
        kpiCards: {
          totalRevenue: {
            value: totalRevenue,
            formatted: formatCurrency(totalRevenue),
            growth: lastMonthRevenue > 0 ? `${revGrowthPct >= 0 ? "+" : ""}${revGrowthPct}%` : "—",
            growthText: lastMonthRevenue > 0 ? "vs previous period" : "No previous period data",
            positive: revGrowthPct >= 0,
          },
          netProfit: {
            value: netProfit,
            formatted: formatCurrency(netProfit),
            growth: lastMonthProfit > 0 ? `${profitGrowthPct >= 0 ? "+" : ""}${profitGrowthPct}%` : "—",
            growthText: totalRevenue > 0 ? `margin: ${profitMargin}%` : "—",
            positive: netProfit > 0,
          },
          totalExpenses: {
            value: totalExpenses,
            formatted: formatCurrency(totalExpenses),
            growth: "—",
            growthText: "Operational expenditure",
            positive: false,
          },
          totalEmployees: {
            value: totalEmployees,
            displayCount: totalEmployees,
            activeCount: activeEmployees,
            newThisMonth: newEmployeesThisMonth,
            growthText:
              totalEmployees > 0
                ? `${activeEmployees} active (${newEmployeesThisMonth} joined this month)`
                : "No employees registered",
          },
          activeStudents: {
            value: activeStudentsCount,
            formatted: activeStudentsCount.toLocaleString("en-IN"),
            newThisMonth: admissionsThisMonth,
            growthText:
              activeStudentsCount > 0
                ? `${admissionsThisMonth} new admissions this month`
                : "No students registered",
          },
          activeCourses: {
            value: activeCourses,
            cohortCount: activeCohorts,
            upcomingCount: draftCourses,
            subtitleText:
              draftCourses > 0
                ? `${draftCourses} upcoming/draft`
                : activeCourses > 0
                ? "All courses active"
                : "No courses created",
          },
          totalDepartments: {
            value: activeDepartments,
            statusText: activeDepartments > 0 ? "Active & Operational" : "No departments configured",
          },
          revenueGrowth: {
            value: `${revGrowthPct >= 0 ? "+" : ""}${revGrowthPct}%`,
            subtitleText: lastMonthRevenue > 0 ? "vs last month" : "No baseline data",
            positive: revGrowthPct >= 0,
          },
          pendingApprovals: {
            value: totalPendingApprovals,
            urgentCount: urgentCount,
            subtitleText:
              urgentCount > 0
                ? `${urgentCount} urgent decisions required`
                : totalPendingApprovals > 0
                ? `${totalPendingApprovals} requests awaiting signoff`
                : "No pending approvals",
            breakdown: {
              leaves: pendingLeaves,
              expenses: pendingExpenses,
              budgets: pendingBudgets,
            },
          },
        },

        // Charts & Comparison Tables
        monthlyRevenueData,
        quickStats,

        meta: {
          fiscalYear: `FY ${currentYear}-${(currentYear + 1).toString().slice(-2)}`,
          lastUpdated: new Date().toISOString(),
          currency: "INR (₹)",
        },
      },
    });
  } catch (error) {
    console.error("Executive Overview Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error while computing Executive Overview",
      error: error.message,
    });
  }
};

// ════════════════════════════════════════════════════════════════════════════
// GET PENDING ACTIONS (For CEO Action Center - Real MongoDB Records)
// ════════════════════════════════════════════════════════════════════════════
export const getPendingActions = async (req, res) => {
  try {
    const [pendingLeaves, pendingExpenses, pendingBudgets] = await Promise.all([
      Leave.find({ status: "Pending" })
        .populate("user", "fullName email employeeId department designation")
        .sort({ fromDate: 1 })
        .limit(10),

      Expense.find({ status: "PENDING", isDeleted: false })
        .populate("requestedBy", "fullName email")
        .populate("budget", "name")
        .sort({ expenseDate: -1 })
        .limit(10),

      Budget.find({ status: "pending", isDeleted: false })
        .populate("department", "name code")
        .populate("createdBy", "fullName")
        .limit(10),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalPending: pendingLeaves.length + pendingExpenses.length + pendingBudgets.length,
        leaves: pendingLeaves,
        expenses: pendingExpenses,
        budgets: pendingBudgets,
      },
    });
  } catch (error) {
    console.error("Pending Actions Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error fetching pending actions",
    });
  }
};
