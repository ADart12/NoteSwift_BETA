// NoteSwift EdTech Enterprise 5-Tier Hierarchical RBAC Middleware

const ROLE_HIERARCHY = {
  super_admin: 100,
  ceo: 90,
  c_level: 80,
  admin: 80,
  manager: 50,
  staff: 20,
  employee: 20,
  client: 10,
};

/**
 * Authorize users based on explicitly allowed roles or hierarchical rank.
 * @param  {...string} roles Allowed roles (e.g. 'admin', 'manager', 'C_LEVEL')
 */
export const authorizeRoles = (...roles) => {
  const normalizedAllowedRoles = roles.map((r) => r.toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Authentication required",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();

    // 1. Exact match check
    if (normalizedAllowedRoles.includes(userRole)) {
      return next();
    }

    // 2. Super admin and CEO always possess global override
    if (userRole === "super_admin" || userRole === "admin" || userRole === "ceo") {
      return next();
    }

    // 3. Hierarchical escalation check (higher tier users can access lower tier operational routes)
    const userRank = ROLE_HIERARCHY[userRole] || 0;
    const minRequiredRank = Math.min(
      ...normalizedAllowedRoles.map((r) => ROLE_HIERARCHY[r] || 0)
    );

    if (minRequiredRank > 0 && userRank >= minRequiredRank) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied: Role '${req.user.role}' lacks sufficient enterprise privileges`,
    });
  };
};

export default authorizeRoles;
