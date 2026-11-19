import Expense from "../../models/FinanceModel/expensesModel.js";
import Budget from "../../models/FinanceModel/budgetSchema.js";
import Department from "../../models/DepartmentModel.js";

// Helper for finance authorization
const isAuthorizedFinanceUser = (user) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  if (role === "admin" || role === "super_admin" || role === "ceo") return true;
  const deptCode = (user.department?.code || "").toUpperCase();
  const deptName = (user.department?.name || "").toLowerCase();
  return (
    (role === "manager" || role === "c_level") &&
    (deptCode === "FIN" || deptName === "finance")
  );
};

// =====================================================
// CREATE EXPENSE
// =====================================================
export const createExpense = async (req, res) => {
  try {
    const {
      title,
      description,
      amount,
      category,
      department,
      budget,
      expenseDate,
      status,
    } = req.body;

    // 1. Validate required fields
    if (!title || amount === undefined || !category) {
      return res.status(400).json({
        success: false,
        message: "Title, amount, and category are required",
      });
    }

    // 2. Validate amount
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than 0",
      });
    }

    const deptString = department || "Finance";

    // 3. Check whether budget exists or auto-resolve default budget
    let existingBudget = null;
    if (budget) {
      existingBudget = await Budget.findById(budget);
    } else {
      const deptDoc = await Department.findOne({
        $or: [
          { code: String(deptString).toUpperCase() },
          { name: new RegExp(deptString, "i") },
        ],
      });
      if (deptDoc) {
        existingBudget = await Budget.findOne({
          department: deptDoc._id,
          isDeleted: false,
        });
      }
      if (!existingBudget) {
        existingBudget = await Budget.findOne({ isDeleted: false });
      }
    }

    const budgetId = existingBudget ? existingBudget._id : null;
    const expenseStatus = status ? status.toUpperCase() : "APPROVED";

    // 4. Create expense
    const expense = await Expense.create({
      title: String(title).trim(),
      description: description ? String(description).trim() : "",
      amount: numAmount,
      category: String(category).trim(),
      department: deptString,
      budget: budgetId,
      requestedBy: req.user?._id,
      expenseDate: expenseDate || Date.now(),
      status: expenseStatus,
    });

    // 5. Update budget spentAmount if expense is APPROVED
    if (existingBudget && expenseStatus === "APPROVED") {
      existingBudget.spentAmount = (existingBudget.spentAmount || 0) + numAmount;
      await existingBudget.save();
    }

    return res.status(201).json({
      success: true,
      message: "Expense created successfully",
      expense,
    });
  } catch (error) {
    console.error("Create Expense Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create expense",
      error: error.message,
    });
  }
};

// =====================================================
// GET EXPENSES
// =====================================================
export const getExpenses = async (req, res) => {
  try {
    if (!isAuthorizedFinanceUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Finance Manager or Admin can access expenses",
      });
    }

    const expenses = await Expense.find({ isDeleted: false })
      .populate("budget", "name allocatedAmount spentAmount fiscalYear")
      .populate("requestedBy", "fullName email")
      .populate("approvedBy", "fullName email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
    });
  }
};

// =====================================================
// GET EXPENSE BY ID
// =====================================================
export const getExpenseById = async (req, res) => {
  try {
    if (!isAuthorizedFinanceUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Finance Manager or Admin can view expense details",
      });
    }

    const { id } = req.params;
    const expense = await Expense.findOne({ _id: id, isDeleted: false })
      .populate("budget", "name allocatedAmount spentAmount")
      .populate("requestedBy", "fullName email");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      expense,
    });
  } catch (error) {
    console.error("Error fetching expense:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch expense",
    });
  }
};

// =====================================================
// UPDATE EXPENSE
// =====================================================
export const updateExpense = async (req, res) => {
  try {
    if (!isAuthorizedFinanceUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Finance Manager or Admin can update expenses",
      });
    }

    const { id } = req.params;
    const expense = await Expense.findOne({ _id: id, isDeleted: false });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    Object.assign(expense, req.body);
    const updatedExpense = await expense.save();

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update expense",
    });
  }
};

// =====================================================
// DELETE EXPENSE
// =====================================================
export const deleteExpense = async (req, res) => {
  try {
    if (!isAuthorizedFinanceUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Only Finance Manager or Admin can delete expenses",
      });
    }

    const { id } = req.params;
    const expense = await Expense.findOne({ _id: id, isDeleted: false });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    expense.isDeleted = true;
    expense.deletedAt = new Date();
    expense.deletedBy = req.user._id;

    await expense.save();

    return res.status(200).json({
      success: true,
      message: "Expense deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting expense:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete expense",
    });
  }
};
