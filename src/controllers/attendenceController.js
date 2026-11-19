import Attendance from "../models/attendanceModel.js";
import User from "../models/usersModel.js";
import OfficeSettings from "../models/officeSetting.js";
import {
  nepaliDate,
  formatTime,
  calculateLateStatus,
  calculateCheckoutDetails,
  getDateRange,
} from "../utils/dateUtils.js";

// Employee retrieves their own today's attendance status
export const getMyAttendance = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      dateAD: today,
    }).populate(
      "employee",
      "employeeId fullName email department designation role profileImage"
    );

    return res.status(200).json({
      success: true,
      attendance: attendance || null,
      message: attendance ? "Today's attendance retrieved" : "Not checked in yet today",
    });
  } catch (error) {
    console.error("Get My Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Employee self check-in with webcam photo & geo-location
export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const { photo, location } = req.body;

    const employeeExists = await User.findById(employeeId);
    if (!employeeExists) {
      return res.status(404).json({
        success: false,
        message: "Employee account not found.",
      });
    }

    // Today's date (00:00:00)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Prevent duplicate attendance
    const alreadyMarked = await Attendance.findOne({
      employee: employeeId,
      dateAD: today,
    });

    if (alreadyMarked && alreadyMarked.checkIn) {
      return res.status(400).json({
        success: false,
        message: "You have already checked in for today.",
        attendance: alreadyMarked,
      });
    }

    let settings = await OfficeSettings.findOne();
    if (!settings) {
      settings = {
        officeStartTime: "09:00",
        officeEndTime: "17:00",
        workingHours: 8,
        gracePeriod: 10,
      };
    }

    const { now, isLate, lateMinutes } = calculateLateStatus(
      settings.officeStartTime,
      settings.gracePeriod
    );

    const dateBS = nepaliDate(today);
    const formattedCheckIn = formatTime(now);

    const checkInLocationData = {
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      accuracy: location?.accuracy ?? null,
      address: location?.address || "",
    };

    let attendance;
    if (alreadyMarked) {
      alreadyMarked.status = isLate ? "Late" : "Present";
      alreadyMarked.checkIn = formattedCheckIn;
      alreadyMarked.checkInPhoto = photo || null;
      alreadyMarked.checkInLocation = checkInLocationData;
      alreadyMarked.isLate = isLate;
      alreadyMarked.lateMinutes = lateMinutes;
      await alreadyMarked.save();
      attendance = alreadyMarked;
    } else {
      attendance = await Attendance.create({
        employee: employeeId,
        dateAD: today,
        dateBS,
        status: isLate ? "Late" : "Present",
        checkIn: formattedCheckIn,
        checkInPhoto: photo || null,
        checkInLocation: checkInLocationData,
        isLate,
        lateMinutes,
        workingHours: 0,
        overtime: 0,
      });
    }

    const populatedAttendance = await Attendance.findById(attendance._id).populate(
      "employee",
      "employeeId fullName email department designation role profileImage"
    );

    return res.status(201).json({
      success: true,
      message: "Check in successful with photo and geo-location tag.",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Check In Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

// Employee self check-out with optional photo & geo-location
export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const { photo, location } = req.body;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOne({
      employee: employeeId,
      dateAD: today,
    });

    if (!attendance || !attendance.checkIn) {
      return res.status(404).json({
        success: false,
        message: "You have not checked in yet today.",
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        message: "You have already checked out today.",
        attendance,
      });
    }

    let officeSetting = await OfficeSettings.findOne();
    if (!officeSetting) {
      officeSetting = {
        officeStartTime: "09:00",
        officeEndTime: "17:00",
        workingHours: 8,
        gracePeriod: 10,
      };
    }

    const { now, workingHours, overtime } = calculateCheckoutDetails(
      attendance.checkIn,
      officeSetting.officeEndTime
    );

    attendance.checkOut = formatTime(now);
    if (photo) attendance.checkOutPhoto = photo;
    if (location) {
      attendance.checkOutLocation = {
        latitude: location.latitude ?? null,
        longitude: location.longitude ?? null,
        accuracy: location.accuracy ?? null,
        address: location.address || "",
      };
    }
    attendance.workingHours = workingHours;
    attendance.overtime = overtime;

    await attendance.save();

    const populatedAttendance = await Attendance.findById(attendance._id).populate(
      "employee",
      "employeeId fullName email department designation role profileImage"
    );

    return res.status(200).json({
      success: true,
      message: "Check out successful. Have a great day!",
      attendance: populatedAttendance,
    });
  } catch (error) {
    console.error("Check Out Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const getMyAttendanceHistory = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const { range = "1w" } = req.query;

    const { startDate, endDate } = getDateRange(range);

    const attendanceHistory = await Attendance.find({
      employee: employeeId,
      dateAD: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ dateAD: -1 })
      .populate(
        "employee",
        "employeeId fullName email department designation"
      );

    return res.status(200).json({
      success: true,
      range,
      count: attendanceHistory.length,
      attendanceHistory,
    });
  } catch (error) {
    console.error("Get Attendance History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// Admin & Managers query today's attendance to monitor staff
export const getTodayAttendance = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rawAttendance = await Attendance.find({
      dateAD: today,
    })
      .populate(
        "employee",
        "employeeId fullName email department designation profileImage"
      )
      .sort({ checkIn: 1 });

    const attendance = rawAttendance.filter((item) => item.employee != null);

    return res.status(200).json({
      success: true,
      count: attendance.length,
      attendance,
    });
  } catch (error) {
    console.error("Get Today Attendance Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getEmployeeAttendanceHistory = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { range = "1w" } = req.query;

    const { startDate, endDate } = getDateRange(range);

    const attendanceHistory = await Attendance.find({
      employee: employeeId,
      dateAD: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate(
        "employee",
        "employeeId fullName email department designation"
      )
      .sort({ dateAD: -1 });

    return res.status(200).json({
      success: true,
      range,
      count: attendanceHistory.length,
      attendanceHistory,
    });
  } catch (error) {
    console.error("Get Employee Attendance History Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getMyAttendanceSummary = async (req, res) => {
  try {
    const employeeId = req.user._id || req.user.id;
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { month = currentMonth } = req.query;

    const [year, monthNumber] = month.split("-").map(Number);

    const startDate = new Date(year, monthNumber - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(year, monthNumber, 0);
    endDate.setHours(23, 59, 59, 999);

    const attendance = await Attendance.find({
      employee: employeeId,
      dateAD: {
        $gte: startDate,
        $lte: endDate,
      },
    });

    const present = attendance.filter(
      (item) => item.status === "Present" || item.status === "Half Day"
    ).length;

    const late = attendance.filter(
      (item) => item.isLate === true || item.status === "Late"
    ).length;

    const absent = attendance.filter(
      (item) => item.status === "Absent"
    ).length;

    const onLeave = attendance.filter(
      (item) => item.status === "Leave"
    ).length;

    const workingDays = attendance.length;

    const attendancePercentage =
      workingDays > 0
        ? Math.round(((present + late) / workingDays) * 100)
        : 0;

    return res.status(200).json({
      success: true,
      month,
      summary: {
        present: present + late,
        absent,
        late,
        onLeave,
        workingDays,
        attendancePercentage,
      },
    });
  } catch (error) {
    console.error("Get My Attendance Summary Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const markAbsentEmployees = async () => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const users = await User.find({
      status: "active",
      isDeleted: false,
    });

    for (const user of users) {
      const existingAttendance = await Attendance.findOne({
        employee: user._id,
        dateAD: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      });

      if (!existingAttendance) {
        await Attendance.create({
          employee: user._id,
          dateAD: startOfDay,
          dateBS: nepaliDate(startOfDay),
          status: "Absent",
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          overtime: 0,
        });
      }
    }

    return {
      success: true,
      message: "Absent employees marked successfully",
    };
  } catch (error) {
    console.error("Mark Absent Error:", error);

    return {
      success: false,
      message: error.message,
    };
  }
};

export const markAbsentEmployeesController = async (req, res) => {
  try {
    const result = await markAbsentEmployees();

    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
