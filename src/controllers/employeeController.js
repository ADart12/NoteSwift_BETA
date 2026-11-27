import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/usersModel.js";
import Department from "../models/DepartmentModel.js";
import AuditLog from "../models/auditLogModel.js";
import { generateEmployeeId } from "../utils/generateEmployeeId.js";

export const getEmployees = async (req, res) => {
  try {
    const {
      search,
      department,
      role,
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const requestingUser = req.user;
    const requestingRole = (requestingUser?.role || "").toLowerCase();

    // C-Level employees can only see lower-level staff in their own department
    // Higher-tier roles: super_admin, ceo, admin → see all
    const isCLevel = requestingRole === "c_level";
    const isRestrictedRole = !["super_admin", "ceo", "admin"].includes(requestingRole);

    const query = {
      isDeleted: false,
    };

    // ── Department Scoping for C-Level ──────────────────────────────────────
    // A c_level user may only view employees in their own department,
    // and only those with roles strictly below c_level (manager, staff, employee).
    if (isCLevel) {
      const userDeptId = requestingUser.department?._id || requestingUser.department;
      if (!userDeptId) {
        return res.status(403).json({
          success: false,
          message: "Access Denied: Your account has no department assigned.",
        });
      }
      // Lock department to the c_level user's own department (ignore query param)
      query.department = userDeptId;
      // Exclude c_level and higher roles so they cannot see peers or superiors
      query.role = { $in: ["manager", "staff", "employee"] };
    } else if (!["super_admin", "ceo", "admin"].includes(requestingRole)) {
      // Manager-level: also scope to own department if no explicit filter given
      if (!department || department === "All") {
        const userDeptId = requestingUser.department?._id || requestingUser.department;
        if (userDeptId) {
          query.department = userDeptId;
        }
      }
    }

    // Search by name, email, or employeeId
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { employeeId: { $regex: search, $options: "i" } },
      ];
    }

    // Filter by department (ObjectId or Name/Code) — only for non-c_level
    if (!isCLevel && department && department !== "All") {
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
        } else {
          query.department = new mongoose.Types.ObjectId(); // Guarantee 0 results if dept not found
        }
      }
    }

    // Role filter — only allow if not already set by c_level scoping
    if (role && !isCLevel) {
      query.role = role.toLowerCase();
    }

    if (status && status !== "All") {
      query.status = status.toLowerCase();
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const limitNumber = Math.max(1, Number(limit) || 10);
    const skip = (pageNumber - 1) * limitNumber;

    const [employees, totalEmployees] = await Promise.all([
      User.find(query)
        .select("-password")
        .populate("department", "name code")
        .skip(skip)
        .limit(limitNumber)
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      totalEmployees,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalEmployees / limitNumber) || 1,
      employees,
    });
  } catch (error) {
    console.error("Get Employees Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch employees",
    });
  }
};

// get Employee by ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id)
      .select("-password")
      .populate("department", "name code");

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    res.status(200).json({
      success: true,
      employee,
    });
  } catch (error) {
    console.error("Get Employee By ID Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      fullName,
      email,
      phone,
      department,
      designation,
      role,
      status,
      joiningDate,
    } = req.body;

    const employee = await User.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Update only provided fields
    if (fullName !== undefined) employee.fullName = fullName;
    if (email !== undefined) employee.email = email;
    if (phone !== undefined) employee.phone = phone;
    if (department !== undefined) employee.department = department;
    if (designation !== undefined) employee.designation = designation;
    if (role !== undefined) employee.role = role;
    if (status !== undefined) employee.status = status;
    if (joiningDate !== undefined) employee.joiningDate = joiningDate;

    await employee.save();

    const updatedEmployee = await User.findById(id)
      .select("-password")
      .populate("department", "name code");

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Update Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const employee = await User.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.status = status;
    await employee.save();

    res.status(200).json({
      success: true,
      message: "Employee status updated successfully",
      employee,
    });
  } catch (error) {
    console.error("Update Employee Status Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await User.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    employee.isDeleted = true;
    employee.status = "inactive";
    employee.deletedAt = new Date();

    await employee.save();

    res.status(200).json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error("Delete Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Direct Employee Creation (Admin & Manager)
export const createEmployee = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      departmentId,
      department,
      designation,
      role = "employee",
      password,
      joiningDate,
      dateOfBirth,
      address,
      city,
      country,
      status = "active",
    } = req.body;

    const deptId = departmentId || department;

    if (!fullName || !email || !phone || !deptId || !designation) {
      return res.status(400).json({
        success: false,
        message: "Full name, email, phone, department, and designation are required.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "An employee with this email address already exists.",
      });
    }

    // Find department
    let departmentDoc;
    if (mongoose.Types.ObjectId.isValid(deptId)) {
      departmentDoc = await Department.findById(deptId);
    } else {
      departmentDoc = await Department.findOne({
        $or: [
          { name: { $regex: `^${deptId}$`, $options: "i" } },
          { code: String(deptId).toUpperCase() },
        ],
      });
    }

    if (!departmentDoc) {
      return res.status(400).json({
        success: false,
        message: "Specified department does not exist.",
      });
    }

    // Generate unique employee ID for department
    const employeeId = await generateEmployeeId(
      departmentDoc.name,
      departmentDoc.code
    );

    // Initial password setup
    const plainPassword = password && password.trim().length >= 6 ? password.trim() : "NoteSwift@123";
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const newEmployee = await User.create({
      employeeId,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      department: departmentDoc._id,
      designation: designation.trim(),
      role: role.toLowerCase(),
      password: hashedPassword,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      address: address ? address.trim() : "",
      city: city ? city.trim() : "",
      country: country ? country.trim() : "Nepal",
      status: status || "active",
    });

    // Optional audit log
    try {
      if (req.user?._id) {
        await AuditLog.create({
          performedBy: req.user._id,
          action: "CREATE",
          entity: "EMPLOYEE",
          entityId: String(newEmployee._id),
          newState: {
            employeeId,
            fullName: newEmployee.fullName,
            email: newEmployee.email,
            department: departmentDoc.name,
            role: newEmployee.role,
          },
          ipAddress: req.ip || "",
          userAgent: req.headers["user-agent"] || "",
        });
      }
    } catch (auditErr) {
      console.warn("Audit log creation notice:", auditErr.message);
    }

    const populatedEmployee = await User.findById(newEmployee._id)
      .select("-password")
      .populate("department", "name code");

    return res.status(201).json({
      success: true,
      message: `Employee ${fullName} created successfully with ID ${employeeId}.`,
      employee: populatedEmployee,
      credentials: {
        employeeId,
        fullName: fullName.trim(),
        email: email.toLowerCase().trim(),
        temporaryPassword: plainPassword,
        role: role.toLowerCase(),
        departmentName: departmentDoc.name,
        designation: designation.trim(),
      },
    });
  } catch (error) {
    console.error("Create Employee Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create employee",
    });
  }
};
