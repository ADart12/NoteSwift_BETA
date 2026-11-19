import Budget from "../../models/FinanceModel/budgetSchema.js";
import Expense from "../../models/FinanceModel/expensesModel.js";
import User from "../../models/usersModel.js";

export const getFinanceSummary = async (req, res) => {
  try {
    const [budgets, expenses, totalEmployees] = await Promise.all([
      Budget.find({ isDeleted: false }),
      Expense.find({ isDeleted: false }).sort({ createdAt: -1 }),
      User.countDocuments({ isDeleted: false }),
    ]);

    // ── Financial Totals ──────────────────────────────────────────────────────
    const totalAllocated = budgets.reduce(
      (acc, b) => acc + (b.allocatedAmount || 0),
      0
    );

    const approvedExpenses = expenses.filter(
      (e) => String(e.status).toUpperCase() === "APPROVED"
    );
    const totalSpent = approvedExpenses.reduce(
      (acc, e) => acc + (e.amount || 0),
      0
    );

    const remainingBudget = Math.max(0, totalAllocated - totalSpent);
    const usedPercentage =
      totalAllocated > 0
        ? Number(((totalSpent / totalAllocated) * 100).toFixed(1))
        : 0;
    const remainingPercentage = Number((100 - usedPercentage).toFixed(1));

    // ── Payroll ───────────────────────────────────────────────────────────────
    // Sum all APPROVED expenses whose category indicates payroll / salary
    const payrollKeywords = ["payroll", "salary", "salaries", "wages"];
    const totalPayroll = approvedExpenses
      .filter((e) =>
        payrollKeywords.some((kw) =>
          String(e.category || "").toLowerCase().includes(kw)
        )
      )
      .reduce((acc, e) => acc + (e.amount || 0), 0);

    // ── Pending Approvals ─────────────────────────────────────────────────────
    const pendingExpenses = expenses.filter(
      (e) => String(e.status).toUpperCase() === "PENDING"
    );

    // ── Recent Transactions (last 4 expenses, any status) ─────────────────────
    const recentTransactions = expenses.slice(0, 4).map((e) => {
      const cat = e.category || "General";
      const catLower = cat.toLowerCase();

      let categoryColor = "blue";
      if (
        catLower.includes("it") ||
        catLower.includes("tech") ||
        catLower.includes("software")
      ) {
        categoryColor = "purple";
      } else if (catLower.includes("market")) {
        categoryColor = "amber";
      } else if (catLower.includes("hr") || catLower.includes("event")) {
        categoryColor = "rose";
      }

      const rawDate = e.expenseDate || e.createdAt;
      const dateStr = rawDate
        ? new Date(rawDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "—";

      return {
        id: String(e._id),
        date: dateStr,
        description: e.title || "Expense",
        category: cat,
        categoryColor,
        amount: e.amount || 0,
        status:
          String(e.status).toUpperCase() === "APPROVED" ? "Approved" : "Pending",
      };
    });

    // ── Pending Approvals List (up to 3) ──────────────────────────────────────
    const pendingApprovals = pendingExpenses.slice(0, 3).map((pe) => {
      const titleLower = String(pe.title || "").toLowerCase();

      let type = "travel";
      if (
        titleLower.includes("renovat") ||
        titleLower.includes("office") ||
        titleLower.includes("facility")
      ) {
        type = "facility";
      } else if (
        titleLower.includes("event") ||
        titleLower.includes("team") ||
        titleLower.includes("party")
      ) {
        type = "event";
      }

      const createdAt = pe.createdAt ? new Date(pe.createdAt) : new Date();
      const diffMs = Date.now() - createdAt.getTime();
      const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHrs / 24);
      const timeAgo =
        diffDays > 0
          ? `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
          : diffHrs > 0
          ? `${diffHrs} hour${diffHrs > 1 ? "s" : ""} ago`
          : "Just now";

      return {
        id: String(pe._id),
        title: pe.title || "Expense",
        amount: pe.amount || 0,
        department: pe.department || "General",
        type,
        timeAgo,
      };
    });

    // ── Weekly Expense breakdown (current month, split by week) ───────────────
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const weeklyMap = { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0 };
    approvedExpenses.forEach((e) => {
      const d = new Date(e.expenseDate || e.createdAt);
      if (d >= monthStart && d <= now) {
        const day = d.getDate();
        const weekKey =
          day <= 7 ? "Week 1" :
          day <= 14 ? "Week 2" :
          day <= 21 ? "Week 3" : "Week 4";
        weeklyMap[weekKey] += e.amount || 0;
      }
    });

    // Income side will be 0 until an Invoice/Revenue model is wired in here
    const incomeVsExpenses = Object.entries(weeklyMap).map(([week, exp]) => ({
      week,
      income: 0,
      expenses: exp,
    }));

    // ── Fiscal year label ─────────────────────────────────────────────────────
    const yr = now.getFullYear();
    const mo = now.getMonth(); // 0-indexed; Indian FY starts April (mo=3)
    const fyStart = mo >= 3 ? yr : yr - 1;
    const fyLabel = `FY ${fyStart}-${String(fyStart + 1).slice(2)}`;
    const monthLabel = now.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });

    return res.status(200).json({
      success: true,
      data: {
        fiscalYear: fyLabel,
        currentMonth: monthLabel,
        totalBudget: totalAllocated,
        totalExpenses: totalSpent,
        totalPayroll,
        employeeCount: totalEmployees,
        pendingApprovalsCount: pendingExpenses.length,
        budgetBalance: remainingBudget,
        usedPercentage,
        remainingPercentage,
        incomeVsExpenses,
        recentTransactions,
        pendingApprovals,
      },
    });
  } catch (error) {
    console.error("Finance summary error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching finance dashboard data",
    });
  }
};
