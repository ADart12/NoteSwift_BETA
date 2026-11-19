import Department from "../models/DepartmentModel.js";

export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({}).sort({ name: 1 });

    res.status(200).json({
      success: true,
      departments,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch departments",
    });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Department name and code are required",
      });
    }

    const existing = await Department.findOne({
      $or: [{ name: name.trim() }, { code: code.trim().toUpperCase() }],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Department with this name or code already exists",
      });
    }

    const department = await Department.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description ? description.trim() : "",
      status: "Active",
    });

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create department error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create department",
    });
  }
};
