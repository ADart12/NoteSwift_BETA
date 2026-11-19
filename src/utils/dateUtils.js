import NepaliDateModule from "nepali-date-converter";

const NepaliDate = NepaliDateModule.default || NepaliDateModule;

export const nepaliDate = (date = new Date()) => {
  try {
    const bs = new NepaliDate(date);
    return `${bs.getYear()}-${String(bs.getMonth() + 1).padStart(2, "0")}-${String(bs.getDate()).padStart(2, "0")}`;
  } catch (err) {
    console.error("Nepali Date conversion error:", err);
    return new Date().toISOString().split("T")[0];
  }
};

export const formatTime = (date = new Date()) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

export const calculateLateStatus = (officeStartTime = "09:00", gracePeriod = 10) => {
  const now = new Date();

  const [startHour, startMinute] = officeStartTime
    .split(":")
    .map(Number);

  const officeStart = new Date(now);
  officeStart.setHours(startHour, startMinute, 0, 0);

  const allowedTime = new Date(
    officeStart.getTime() + gracePeriod * 60 * 1000
  );

  const isLate = now > allowedTime;

  const lateMinutes = isLate
    ? Math.floor((now.getTime() - officeStart.getTime()) / (1000 * 60))
    : 0;

  return {
    now,
    isLate,
    lateMinutes,
  };
};

export const calculateCheckoutDetails = (checkInRaw, officeEndTime = "17:00") => {
  const now = new Date();

  // Parse checkIn
  let checkInDate = new Date(checkInRaw);
  if (isNaN(checkInDate.getTime())) {
    // If stored as "HH:MM AM/PM"
    const match = String(checkInRaw).match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && h < 12) h += 12;
      if (ampm === "AM" && h === 12) h = 0;
      checkInDate = new Date(now);
      checkInDate.setHours(h, m, 0, 0);
    } else {
      checkInDate = now;
    }
  }

  // Working Hours
  const workedMilliseconds = Math.max(0, now.getTime() - checkInDate.getTime());
  const workingHours = Number(
    (workedMilliseconds / (1000 * 60 * 60)).toFixed(2)
  );

  // Office End Time
  const officeEnd = new Date(now);
  const [hour, minute] = officeEndTime
    .split(":")
    .map(Number);
  officeEnd.setHours(hour, minute, 0, 0);

  // Overtime
  let overtime = 0;
  if (now > officeEnd) {
    overtime = Number(
      ((now.getTime() - officeEnd.getTime()) / (1000 * 60 * 60)).toFixed(2)
    );
  }

  return {
    now,
    workingHours,
    overtime,
  };
};

export const getDateRange = (range = "1w") => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  // YYYY-MM => full selected month
  if (/^\d{4}-\d{2}$/.test(range)) {
    const [year, month] = range.split("-").map(Number);

    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);

    const fullMonthEnd = new Date(year, month, 0);
    fullMonthEnd.setHours(23, 59, 59, 999);

    return {
      startDate,
      endDate: fullMonthEnd,
    };
  }

  const startDate = new Date(endDate);

  switch (range) {
    case "10d":
      startDate.setDate(startDate.getDate() - 10);
      break;
    case "2w":
      startDate.setDate(startDate.getDate() - 14);
      break;
    case "1m":
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "3m":
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case "1w":
    default:
      startDate.setDate(startDate.getDate() - 7);
      break;
  }

  startDate.setHours(0, 0, 0, 0);

  return {
    startDate,
    endDate,
  };
};
