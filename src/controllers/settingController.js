import CompanySettings from "../models/officeSetting.js";

export const getSettings = async (req, res) => {
  try {
    let settings = await CompanySettings.findOne();

    if (!settings) {
      settings = await CompanySettings.create({
        companyName: "Noteswift Pvt. Ltd.",
        officeStartTime: "09:00",
        officeEndTime: "17:00",
        workingHours: 8,
        gracePeriod: 10,
      });
    }

    return res.status(200).json({
      success: true,
      settings,
    });
  } catch (error) {
    console.error("Get Settings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const {
      companyName,
      officeStartTime,
      officeEndTime,
      workingHours,
      gracePeriod,
    } = req.body;

    let settings = await CompanySettings.findOne();

    if (!settings) {
      settings = new CompanySettings();
    }

    if (companyName !== undefined) settings.companyName = companyName.trim();
    if (officeStartTime !== undefined) settings.officeStartTime = officeStartTime;
    if (officeEndTime !== undefined) settings.officeEndTime = officeEndTime;
    if (workingHours !== undefined) settings.workingHours = Number(workingHours);
    if (gracePeriod !== undefined) settings.gracePeriod = Number(gracePeriod);

    await settings.save();

    return res.status(200).json({
      success: true,
      message: "Office settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Update Settings Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};
