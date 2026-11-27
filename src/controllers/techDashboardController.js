import User from "../models/usersModel.js";
import Department from "../models/DepartmentModel.js";
import Attendance from "../models/attendanceModel.js";
import Leave from "../models/leaveModel.js";
import Project from "../models/TechnologyModel/projectModel.js";
import Task from "../models/TechnologyModel/taskModel.js";

// ════════════════════════════════════════════════════════════════════════════
// GET CTO / TECH DASHBOARD DATA (100% Database-Driven — Zero Mock Data)
// ════════════════════════════════════════════════════════════════════════════

export const getTechDashboard = async (req, res) => {
  try {
    const user = req.user;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Find the user's tech department
    const userDeptId = user.department?._id || user.department;

    // Find all tech-related department IDs
    const techDepts = await Department.find({
      status: "Active",
      $or: [
        { name: { $regex: /technology|software|engineering|development|tech/i } },
        { code: { $regex: /^(TECH|SD|ENG|DEV)$/i } },
      ],
    });
    const techDeptIds = techDepts.map((d) => d._id);

    // If user's department isn't in the tech list, include it too
    if (userDeptId && !techDeptIds.some((id) => id.toString() === userDeptId.toString())) {
      techDeptIds.push(userDeptId);
    }

    // ─── Parallel queries ───────────────────────────────────────────────
    const [
      techEmployees,
      todayAttendance,
      activeProjects,
      allTasks,
      pendingLeaves,
      todayLeaves,
      recentlyJoined,
    ] = await Promise.all([
      // All active tech employees (lower roles only)
      User.find({
        isDeleted: false,
        status: "active",
        department: { $in: techDeptIds },
        role: { $in: ["manager", "staff", "employee"] },
      })
        .select("fullName email designation role department")
        .populate("department", "name code"),

      // Today's attendance for tech employees
      Attendance.find({
        dateAD: { $gte: todayStart, $lte: todayEnd },
      })
        .populate({
          path: "employee",
          select: "fullName email designation role department",
          match: {
            isDeleted: false,
            department: { $in: techDeptIds },
            role: { $in: ["manager", "staff", "employee"] },
          },
        }),

      // Active projects in tech departments
      Project.find({
        isDeleted: false,
        status: { $in: ["Planning", "Active", "On_Hold"] },
        department: { $in: techDeptIds },
      })
        .populate("manager", "fullName email")
        .sort({ updatedAt: -1 }),

      // All tasks for active tech projects
      Task.find({
        isDeleted: false,
      })
        .populate("assignedTo", "fullName email")
        .populate({
          path: "project",
          match: {
            isDeleted: false,
            department: { $in: techDeptIds },
          },
          select: "name code department status",
        }),

      // Pending leave requests from tech employees
      Leave.find({ status: "Pending" })
        .populate({
          path: "employee",
          select: "fullName email designation role department",
          match: {
            department: { $in: techDeptIds },
            role: { $in: ["manager", "staff", "employee"] },
          },
        })
        .sort({ createdAt: -1 }),

      // Employees on leave today
      Leave.find({
        status: "Approved",
        fromDate: { $lte: todayEnd },
        toDate: { $gte: todayStart },
      }).populate({
        path: "employee",
        select: "fullName email designation department",
        match: { department: { $in: techDeptIds } },
      }),

      // Recently joined tech employees (last 30 days)
      User.find({
        isDeleted: false,
        department: { $in: techDeptIds },
        role: { $in: ["manager", "staff", "employee"] },
        joiningDate: { $gte: new Date(Date.now() - 30 * 86400000) },
      })
        .select("fullName designation joiningDate")
        .sort({ joiningDate: -1 })
        .limit(5),
    ]);

    // Filter out null-populated results
    const validTodayAttendance = todayAttendance.filter((a) => a.employee);
    const validPendingLeaves = pendingLeaves.filter((l) => l.employee);
    const validTodayLeaves = todayLeaves.filter((l) => l.employee);
    // Only keep tasks whose project matched a tech department
    const techTasks = allTasks.filter((t) => t.project);

    // ─── 1. Engineering Availability ────────────────────────────────────
    const totalTeamSize = techEmployees.length;
    const onLeaveCount = validTodayLeaves.length;
    const remoteCount = 0; // No remote field in the model — show 0
    const availableCount = Math.max(0, totalTeamSize - onLeaveCount);
    const availabilityPct = totalTeamSize > 0
      ? Math.round((availableCount / totalTeamSize) * 100)
      : 0;

    // ─── 2. Active Sprint Velocity ──────────────────────────────────────
    const totalStoryPoints = techTasks.reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const completedStoryPoints = techTasks
      .filter((t) => t.status === "Done")
      .reduce((s, t) => s + (t.estimatedHours || 0), 0);
    const velocityPct = totalStoryPoints > 0
      ? Math.round((completedStoryPoints / totalStoryPoints) * 100)
      : 0;

    // ─── 3. Critical Blockers / Bugs ────────────────────────────────────
    const criticalTasks = techTasks.filter(
      (t) => t.priority === "Critical" && t.status !== "Done"
    );
    const highPriorityTasks = techTasks.filter(
      (t) => t.priority === "High" && t.status !== "Done"
    );

    // ─── 4. Avg. Engineering Working Hours ──────────────────────────────
    const totalWorkingHours = validTodayAttendance.reduce(
      (s, a) => s + (a.workingHours || 0),
      0
    );
    const checkedInCount = validTodayAttendance.filter((a) => a.checkIn).length;
    const avgHours = checkedInCount > 0 ? totalWorkingHours / checkedInCount : 0;
    const avgHoursStr = checkedInCount > 0
      ? `${Math.floor(avgHours)}h ${Math.round((avgHours % 1) * 60)}m`
      : "0h 0m";

    // ─── 5. Active Projects & Sprint Health ─────────────────────────────
    const projectsWithHealth = activeProjects.map((proj) => {
      const projectTasks = techTasks.filter(
        (t) => t.project._id.toString() === proj._id.toString()
      );
      const total = projectTasks.length;
      const done = projectTasks.filter((t) => t.status === "Done").length;
      const inProgress = projectTasks.filter((t) => t.status === "In_Progress").length;
      const inReview = projectTasks.filter((t) => t.status === "In_Review").length;
      const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

      // Status pill logic
      let statusPill = "On Track";
      if (proj.endDate && new Date(proj.endDate) < now && progressPct < 100) {
        statusPill = "Delayed";
      } else if (progressPct < 30 && proj.status === "Active") {
        statusPill = "At Risk";
      }
      if (proj.status === "On_Hold") {
        statusPill = "On Hold";
      }

      return {
        _id: proj._id,
        name: proj.name,
        code: proj.code,
        techLead: proj.manager?.fullName || "—",
        status: proj.status,
        statusPill,
        progressPct,
        targetDate: proj.endDate || null,
        taskStats: { total, done, inProgress, inReview },
      };
    });

    const overallSprintHealth = activeProjects.length > 0
      ? Math.round(
          projectsWithHealth.reduce((s, p) => s + p.progressPct, 0) /
            projectsWithHealth.length
        )
      : 0;

    // ─── 6. Team Attendance Live (Donut) ────────────────────────────────
    const checkedInEmployees = validTodayAttendance.filter(
      (a) => a.status === "Present"
    );
    const lateEmployees = validTodayAttendance.filter(
      (a) => a.status === "Late"
    );
    const halfDayEmployees = validTodayAttendance.filter(
      (a) => a.status === "Half Day"
    );
    const notCheckedInCount = Math.max(
      0,
      totalTeamSize - validTodayAttendance.length - onLeaveCount
    );

    const attendanceLive = {
      checkedIn: checkedInEmployees.length,
      late: lateEmployees.length + halfDayEmployees.length,
      onLeave: onLeaveCount,
      notCheckedIn: notCheckedInCount,
      totalTeam: totalTeamSize,
      recentCheckins: [
        ...lateEmployees.slice(0, 2).map((a) => ({
          name: a.employee?.fullName || "—",
          label: "Late",
        })),
        ...validTodayLeaves.slice(0, 2).map((l) => ({
          name: l.employee?.fullName || "—",
          label: "On Leave",
        })),
      ],
    };

    // If nobody is late/on-leave, show recent check-ins instead
    if (attendanceLive.recentCheckins.length === 0) {
      attendanceLive.recentCheckins = checkedInEmployees.slice(0, 3).map((a) => ({
        name: a.employee?.fullName || "—",
        label: "Checked In",
      }));
    }

    // ─── 7. Executive Approvals & Escalations ───────────────────────────
    const approvals = validPendingLeaves.slice(0, 5).map((l) => ({
      _id: l._id,
      type: "Leave Request",
      description: `${l.employee?.fullName} (${l.employee?.designation || l.employee?.role})`,
      leaveType: l.leaveType,
      fromDate: l.fromDate,
      toDate: l.toDate,
      days: l.days,
      reason: l.reason,
    }));

    // Escalations: Critical tasks that are overdue
    const escalations = criticalTasks
      .filter((t) => t.dueDate && new Date(t.dueDate) < now)
      .slice(0, 3)
      .map((t) => ({
        _id: t._id,
        type: "Escalation",
        description: `${t.title} (${t.project?.name || "—"})`,
        priority: t.priority,
        dueDate: t.dueDate,
        assignedTo: t.assignedTo?.fullName || "—",
      }));

    // ─── 8. Recent Engineering Activity Feed ────────────────────────────
    // Build from recent task updates & attendance activity
    const recentActivity = [];

    // Recently completed tasks
    const recentDoneTasks = techTasks
      .filter((t) => t.status === "Done")
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 3);

    recentDoneTasks.forEach((t) => {
      recentActivity.push({
        type: "task_completed",
        description: `${t.title} completed`,
        detail: `by ${t.assignedTo?.fullName || "—"}`,
        time: t.updatedAt,
      });
    });

    // Recent check-ins today
    validTodayAttendance
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2)
      .forEach((a) => {
        recentActivity.push({
          type: "checkin",
          description: `${a.employee?.fullName || "—"} checked in`,
          detail: a.checkIn || "",
          time: a.createdAt,
        });
      });

    // Recently joined
    recentlyJoined.slice(0, 2).forEach((u) => {
      recentActivity.push({
        type: "new_member",
        description: `${u.fullName} joined the team`,
        detail: u.designation || "",
        time: u.joiningDate,
      });
    });

    // Sort all activity by time descending
    recentActivity.sort((a, b) => new Date(b.time) - new Date(a.time));

    // ─── RESPONSE ───────────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      data: {
        // Header Stats
        engineeringAvailability: {
          percentage: availabilityPct,
          available: availableCount,
          total: totalTeamSize,
          onLeave: onLeaveCount,
          remote: remoteCount,
        },
        sprintVelocity: {
          percentage: velocityPct,
          completed: completedStoryPoints,
          total: totalStoryPoints,
        },
        criticalBlockers: {
          open: criticalTasks.length,
          highPriority: highPriorityTasks.length,
          topBlocker: criticalTasks[0]
            ? `${criticalTasks[0].title} (${criticalTasks[0].project?.name || "—"})`
            : null,
        },
        avgWorkingHours: {
          display: avgHoursStr,
          avgNumeric: Math.round(avgHours * 100) / 100,
          squads: techDepts.length,
        },

        // Projects table
        projects: projectsWithHealth,
        overallSprintHealth,

        // Team attendance donut
        attendanceLive,

        // Approvals & escalations
        approvals,
        escalations,

        // Activity feed
        recentActivity: recentActivity.slice(0, 5),

        meta: {
          lastUpdated: new Date().toISOString(),
          department: techDepts.map((d) => d.name).join(", ") || "Technology",
        },
      },
    });
  } catch (error) {
    console.error("Tech Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while computing Tech Dashboard",
      error: error.message,
    });
  }
};
