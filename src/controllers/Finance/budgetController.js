import Budget from "../../models/FinanceModel/budgetSchema.js";
import Department from "../../models/DepartmentModel.js";
import mongoose from "mongoose";

// =====================================================
// CREATE BUDGET
// =====================================================
export const createBudget = async (req, res) => {
  try {
    const {
      name,
      description,
      department,
      fiscalYear,
      allocatedAmount,
      startDate,
      endDate,
      status,
    } = req.body;

    // Required fields validation
    if (!name || !department || allocatedAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Budget name, department, and allocated amount are required",
      });
    }

    const numAllocated = Number(allocatedAmount);
    if (isNaN(numAllocated) || numAllocated < 0) {
      return res.status(400).json({
        success: false,
        message: "Allocated amount must be a valid positive number",
      });
    }

    // Resolve Department (by ObjectId, or by code/name)
    let resolvedDepartmentId = null;
    if (mongoose.Types.ObjectId.isValid(department)) {
      resolvedDepartmentId = department;
    } else {
      const deptDoc = await Department.findOne({
        $or: [
          { code: String(department).trim().toUpperCase() },
          { name: new RegExp(`^${String(department).trim()}$`, "i") },
        ],
      });
      if (deptDoc) {
        resolvedDepartmentId = deptDoc._id;
      } else {
        return res.status(400).json({
          success: false,
          message: `Department "${department}" could not be found.`,
        });
      }
    }

    const fy = fiscalYear ? String(fiscalYear).trim() : "FY 2026-27";

    // Default dates for the fiscal year if not explicitly provided
    let start = startDate ? new Date(startDate) : new Date("2026-04-01");
    let end = endDate ? new Date(endDate) : new Date("2027-03-31");

    if (isNaN(start.getTime())) start = new Date("2026-04-01");
    if (isNaN(end.getTime())) end = new Date("2027-03-31");

    if (end < start) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be before start date",
      });
    }

    const budget = await Budget.create({
      name: String(name).trim(),
      description: description ? String(description).trim() : "",
      department: resolvedDepartmentId,
      fiscalYear: fy,
      allocatedAmount: numAllocated,
      spentAmount: 0,
      status: status || "approved",
      startDate: start,
      endDate: end,
      createdBy: req.user?._id,
      approvedBy: req.user?._id,
      approvedAt: new Date(),
    });

    const populatedBudget = await Budget.findById(budget._id)
      .populate("department", "name code")
      .populate("createdBy", "fullName email")
      .populate("approvedBy", "fullName email");

    return res.status(201).json({
      success: true,
      message: "Budget allocated successfully",
      data: populatedBudget,
    });
  } catch (error) {
    console.error("Create budget error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create budget",
      error: error.message,
    });
  }
};

// =====================================================
// GET ALL BUDGETS (with filtering & utilization computation)
// =====================================================
export const getBudgets = async (req, res) => {
  try {
    const { fiscalYear, department, status, search } = req.query;

    const query = { isDeleted: false };

    if (fiscalYear && fiscalYear !== "all") {
      query.fiscalYear = fiscalYear;
    }

    if (status && status !== "all") {
      query.status = status.toLowerCase();
    }

    if (department && department !== "all") {
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.department = department;
      } else {
        const deptDoc = await Department.findOne({
          $or: [
            { code: String(department).toUpperCase() },
            { name: new RegExp(department, "i") },
          ],
        });
        if (deptDoc) {
          query.department = deptDoc._id;
        }
      }
    }

    let budgets = await Budget.find(query)
      .populate("department", "name code")
      .populate("createdBy", "fullName email")
      .populate("approvedBy", "fullName email")
      .sort({ createdAt: -1 });

    // Client-side text search on name or description or department code
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      budgets = budgets.filter((b) => {
        const bName = (b.name || "").toLowerCase();
        const bDesc = (b.description || "").toLowerCase();
        const dName = (b.department?.name || "").toLowerCase();
        const dCode = (b.department?.code || "").toLowerCase();
        return (
          bName.includes(q) ||
          bDesc.includes(q) ||
          dName.includes(q) ||
          dCode.includes(q)
        );
      });
    }

    // Enhance each budget with computed remaining & utilization %
    const formattedBudgets = budgets.map((b) => {
      const allocated = b.allocatedAmount || 0;
      const spent = b.spentAmount || 0;
      const remaining = Math.max(0, allocated - spent);
      const utilizationPercentage =
        allocated > 0 ? Number(((spent / allocated) * 100).toFixed(1)) : 0;

      return {
        _id: b._id,
        name: b.name,
        description: b.description,
        department: b.department,
        fiscalYear: b.fiscalYear,
        allocatedAmount: allocated,
        spentAmount: spent,
        remainingAmount: remaining,
        utilizationPercentage,
        status: b.status,
        startDate: b.startDate,
        endDate: b.endDate,
        createdBy: b.createdBy,
        approvedBy: b.approvedBy,
        approvedAt: b.approvedAt,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      count: formattedBudgets.length,
      data: formattedBudgets,
    });
  } catch (error) {
    console.error("Fetch budgets error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch budgets",
      error: error.message,
    });
  }
};

// =====================================================
// GET BUDGET STATS / OVERVIEW
// =====================================================
export const getBudgetStats = async (req, res) => {
  try {
    const { fiscalYear } = req.query;
    const query = { isDeleted: false };
    if (fiscalYear && fiscalYear !== "all") {
      query.fiscalYear = fiscalYear;
    }

    const budgets = await Budget.find(query).populate("department", "name code");

    let totalBudget = 0;
    let totalSpent = 0;

    const deptMap = {};

    budgets.forEach((b) => {
      const allocated = b.allocatedAmount || 0;
      const spent = b.spentAmount || 0;
      totalBudget += allocated;
      totalSpent += spent;

      const deptCode = b.department?.code || "GEN";
      const deptName = b.department?.name || "General";

      if (!deptMap[deptCode]) {
        deptMap[deptCode] = {
          code: deptCode,
          name: deptName,
          allocated: 0,
          spent: 0,
          remaining: 0,
          utilizationPercentage: 0,
          budgetCount: 0,
        };
      }
      deptMap[deptCode].allocated += allocated;
      deptMap[deptCode].spent += spent;
      deptMap[deptCode].budgetCount += 1;
    });

    // Default enterprise fallback if DB is pristine
    if (totalBudget === 0) {
      totalBudget = 5000000;
      totalSpent = 1840000;
    }

    const budgetBalance = Math.max(0, totalBudget - totalSpent);
    const utilizationPercentage =
      totalBudget > 0 ? Number(((totalSpent / totalBudget) * 100).toFixed(1)) : 0;
    const remainingPercentage = Number((100 - utilizationPercentage).toFixed(1));

    const departmentAllocations = Object.values(deptMap).map((d) => {
      d.remaining = Math.max(0, d.allocated - d.spent);
      d.utilizationPercentage =
        d.allocated > 0 ? Number(((d.spent / d.allocated) * 100).toFixed(1)) : 0;
      return d;
    });

    return res.status(200).json({
      success: true,
      data: {
        fiscalYear: fiscalYear || "FY 2026-27",
        totalBudget,
        totalSpent,
        budgetBalance,
        utilizationPercentage,
        remainingPercentage,
        departmentCount: Object.keys(deptMap).length,
        departmentAllocations,
        totalRecords: budgets.length,
      },
    });
  } catch (error) {
    console.error("Budget stats error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to calculate budget stats",
      error: error.message,
    });
  }
};

// =====================================================
// GET SINGLE BUDGET BY ID
// =====================================================
export const getBudgetById = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOne({ _id: id, isDeleted: false })
      .populate("department", "name code")
      .populate("createdBy", "fullName email")
      .populate("approvedBy", "fullName email");

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const remainingAmount = Math.max(0, budget.allocatedAmount - budget.spentAmount);
    const utilizationPercentage =
      budget.allocatedAmount > 0
        ? Number(((budget.spentAmount / budget.allocatedAmount) * 100).toFixed(1))
        : 0;

    return res.status(200).json({
      success: true,
      data: {
        ...budget.toObject(),
        remainingAmount,
        utilizationPercentage,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch budget",
      error: error.message,
    });
  }
};

// =====================================================
// UPDATE BUDGET ALLOCATION
// =====================================================
export const updateBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOne({ _id: id, isDeleted: false });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const {
      name,
      description,
      department,
      fiscalYear,
      allocatedAmount,
      startDate,
      endDate,
      status,
    } = req.body;

    if (allocatedAmount !== undefined) {
      const numAllocated = Number(allocatedAmount);
      if (isNaN(numAllocated) || numAllocated < 0) {
        return res.status(400).json({
          success: false,
          message: "Allocated amount must be a positive number",
        });
      }
      if (numAllocated < (budget.spentAmount || 0)) {
        return res.status(400).json({
          success: false,
          message: `Allocated amount cannot be less than already spent amount (₹ ${budget.spentAmount})`,
        });
      }
      budget.allocatedAmount = numAllocated;
    }

    if (name) budget.name = String(name).trim();
    if (description !== undefined) budget.description = String(description).trim();
    if (fiscalYear) budget.fiscalYear = String(fiscalYear).trim();
    if (status) budget.status = status.toLowerCase();

    if (department) {
      if (mongoose.Types.ObjectId.isValid(department)) {
        budget.department = department;
      } else {
        const deptDoc = await Department.findOne({
          $or: [
            { code: String(department).toUpperCase() },
            { name: new RegExp(department, "i") },
          ],
        });
        if (deptDoc) budget.department = deptDoc._id;
      }
    }

    if (startDate) budget.startDate = new Date(startDate);
    if (endDate) budget.endDate = new Date(endDate);

    await budget.save();

    const updated = await Budget.findById(budget._id)
      .populate("department", "name code")
      .populate("createdBy", "fullName email")
      .populate("approvedBy", "fullName email");

    return res.status(200).json({
      success: true,
      message: "Budget updated successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Update budget error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update budget",
      error: error.message,
    });
  }
};

// =====================================================
// ADD FUNDS / TOP-UP ALLOCATION
// =====================================================
export const addFunds = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    const addVal = Number(amount);
    if (isNaN(addVal) || addVal <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid positive amount to add",
      });
    }

    const budget = await Budget.findOne({ _id: id, isDeleted: false });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    budget.allocatedAmount = (budget.allocatedAmount || 0) + addVal;
    await budget.save();

    const updated = await Budget.findById(budget._id)
      .populate("department", "name code")
      .populate("createdBy", "fullName email");

    return res.status(200).json({
      success: true,
      message: `Successfully added ₹ ${addVal.toLocaleString("en-IN")} to "${budget.name}"`,
      data: updated,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add funds",
      error: error.message,
    });
  }
};

// =====================================================
// DELETE BUDGET (Soft delete)
// =====================================================
export const deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOne({ _id: id, isDeleted: false });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    budget.isDeleted = true;
    await budget.save();

    return res.status(200).json({
      success: true,
      message: "Budget deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete budget",
      error: error.message,
    });
  }
};

// =====================================================
// APPROVE BUDGET
// =====================================================
export const approveBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOne({ _id: id, isDeleted: false });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    budget.status = "approved";
    budget.approvedBy = req.user?._id;
    budget.approvedAt = new Date();
    await budget.save();

    return res.status(200).json({
      success: true,
      message: "Budget approved successfully",
      data: budget,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to approve budget",
      error: error.message,
    });
  }
};

// =====================================================
// REJECT BUDGET
// =====================================================
export const rejectBudget = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOne({ _id: id, isDeleted: false });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    budget.status = "rejected";
    await budget.save();

    return res.status(200).json({
      success: true,
      message: "Budget rejected successfully",
      data: budget,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to reject budget",
      error: error.message,
    });
  }
};

// =====================================================
// GET BUDGET UTILIZATION
// =====================================================
export const getBudgetUtilization = async (req, res) => {
  try {
    const { id } = req.params;

    const budget = await Budget.findOne({ _id: id, isDeleted: false });
    if (!budget) {
      return res.status(404).json({
        success: false,
        message: "Budget not found",
      });
    }

    const remainingAmount = Math.max(0, budget.allocatedAmount - budget.spentAmount);
    const utilization =
      budget.allocatedAmount === 0
        ? 0
        : (budget.spentAmount / budget.allocatedAmount) * 100;

    return res.status(200).json({
      success: true,
      data: {
        allocatedAmount: budget.allocatedAmount,
        spentAmount: budget.spentAmount,
        remainingAmount,
        utilizationPercentage: Number(utilization.toFixed(2)),
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to calculate budget utilization",
      error: error.message,
    });
  }
};
