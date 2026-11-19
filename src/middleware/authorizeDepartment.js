/**
 * Authorize users based on their assigned department.
 * Super Admin, CEO, and Enterprise Admin retain cross-departmental access.
 * @param {string|string[]} allowedDepartments Single department code/name or array of them
 */
export const authorizeDepartment = (...allowedDepartments) => {
  const normalizedAllowed = allowedDepartments
    .flat()
    .map((d) => (d || "").trim().toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Authentication required",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();

    // Super Admin, CEO, and Admin possess universal cross-department access
    if (userRole === "super_admin" || userRole === "admin" || userRole === "ceo") {
      return next();
    }

    const userDeptCode = req.user.department?.code?.trim().toLowerCase();
    const userDeptName = req.user.department?.name?.trim().toLowerCase();

    if (!userDeptCode && !userDeptName) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Department assignment required",
      });
    }

    const isAuthorized = normalizedAllowed.some(
      (dept) =>
        dept === userDeptCode ||
        dept === userDeptName ||
        // Map common aliases
        (dept === "academic" && (userDeptCode === "acad" || userDeptCode === "ada")) ||
        (dept === "acad" && userDeptName === "academics") ||
        (dept === "technology" && (userDeptCode === "tech" || userDeptCode === "sd")) ||
        (dept === "tech" && userDeptName === "technology") ||
        (dept === "hr" && (userDeptCode === "hr" || userDeptName === "human resources")) ||
        (dept === "fin" && (userDeptCode === "fin" || userDeptName === "finance"))
    );

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You are not authorized to access this department's resources",
      });
    }

    next();
  };
};

export default authorizeDepartment;
