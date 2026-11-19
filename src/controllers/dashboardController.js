import User from "../models/usersModel.js";
import Attendance from "../models/attendanceModel.js";
import Leave from "../models/leaveModel.js";
import { getDateRange } from "../utils/dateUtils.js";

export const getDashboardSummary = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [totalEmployees, presentToday, lateToday, onLeaveCount] = await Promise.all([
      User.countDocuments({
        isDeleted: false,
        status: "active",
      }),

      Attendance.countDocuments({
        dateAD: { $gte: todayStart, $lte: todayEnd },
        status: { $in: ["Present", "Late", "Half Day"] },
      }),

      Attendance.countDocuments({
        dateAD: { $gte: todayStart, $lte: todayEnd },
        $or: [{ isLate: true }, { status: "Late" }],
      }),

      Leave.countDocuments({
        status: "Approved",
        fromDate: { $lte: todayEnd },
        toDate: { $gte: todayStart },
      }),
    ]);

    const absentToday = Math.max(0, totalEmployees - presentToday - onLeaveCount);

    const attendancePercentage =
      totalEmployees > 0
        ? Number(((presentToday / totalEmployees) * 100).toFixed(1))
        : 0;

    return res.status(200).json({
      success: true,
      summary: {
        totalEmployees,
        presentToday,
        absentToday,
        lateToday,
        onLeave: onLeaveCount,
        attendancePercentage,
      },
    });
  } catch (error) {
    console.error("Dashboard Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getAttendanceOverview = async (req, res) => {
  try {
    const { range = "10d" } = req.query;

    const { startDate, endDate } = getDateRange(range);

    const overview = await Attendance.aggregate([
      {
        $match: {
          dateAD: {
            $gte: startDate,
            $lte: endDate,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$dateAD" },
          },
          dateRaw: { $first: "$dateAD" },
          present: {
            $sum: {
              $cond: [{ $in: ["$status", ["Present", "Half Day"]] }, 1, 0],
            },
          },
          late: {
            $sum: {
              $cond: [{ $or: [{ $eq: ["$status", "Late"] }, { $eq: ["$isLate", true] }] }, 1, 0],
            },
          },
          leave: {
            $sum: {
              $cond: [{ $eq: ["$status", "Leave"] }, 1, 0],
            },
          },
          absent: {
            $sum: {
              $cond: [{ $eq: ["$status", "Absent"] }, 1, 0],
            },
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const formattedOverview = overview.map((item) => ({
      date: new Date(item.dateRaw || item._id).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      present: item.present,
      late: item.late,
      leave: item.leave,
      absent: item.absent,
    }));

    return res.status(200).json({
      success: true,
      overview: formattedOverview,
    });
  } catch (error) {
    console.error("Attendance Overview Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
