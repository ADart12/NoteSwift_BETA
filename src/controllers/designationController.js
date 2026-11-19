import Designation from "../models/DesignationModel.js";
import Department from "../models/DepartmentModel.js";
import mongoose from "mongoose";

// Get designations, optionally filtered by department ID or name
export const getDesignations = async (req, res) => {
  try {
    const { department } = req.query;
    const query = { status: "Active" };

    if (department && department !== "All") {
      if (mongoose.Types.ObjectId.isValid(department)) {
        query.department = department;
      } else {
        const foundDept = await Department.findOne({
          $or: [
            { name: { $regex: `^${department}$`, $options: "i" } },
            { code: department.toUpperCase() },
          ],
        });
        if (foundDept) {
          query.department = foundDept._id;
        }
      }
    }

    const designations = await Designation.find(query)
      .populate("department", "name code")
      .sort({ hierarchyLevel: 1, title: 1 });

    return res.status(200).json({
      success: true,
      count: designations.length,
      designations,
    });
  } catch (error) {
    console.error("Get Designations Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch designations",
    });
  }
};

// Create a new designation (Admin & Manager)
export const createDesignation = async (req, res) => {
  try {
    const { title, department, hierarchyLevel, minSalary, maxSalary, description } = req.body;

    if (!title || !department) {
      return res.status(400).json({
        success: false,
        message: "Title and Department are required.",
      });
    }

    const existing = await Designation.findOne({
      title: { $regex: `^${title.trim()}$`, $options: "i" },
      department,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Designation already exists in this department.",
      });
    }

    const designation = await Designation.create({
      title: title.trim(),
      department,
      hierarchyLevel: hierarchyLevel || "STAFF",
      salaryRange: {
        min: Number(minSalary) || 0,
        max: Number(maxSalary) || 0,
      },
      description: description ? description.trim() : "",
      status: "Active",
    });

    const populated = await Designation.findById(designation._id).populate("department", "name code");

    return res.status(201).json({
      success: true,
      message: "Designation created successfully.",
      designation: populated,
    });
  } catch (error) {
    console.error("Create Designation Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create designation",
    });
  }
};
