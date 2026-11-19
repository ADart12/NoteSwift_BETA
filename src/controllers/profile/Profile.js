import User from "../../models/usersModel.js";

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId)
      .select("-password")
      .populate("department", "name code");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const {
      fullName,
      phone,
      dateOfBirth,
      address,
      city,
      country,
    } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (address !== undefined) user.address = address.trim();
    if (city !== undefined) user.city = city.trim();
    if (country !== undefined) user.country = country.trim();

    await user.save();

    const updatedUser = await User.findById(userId)
      .select("-password")
      .populate("department", "name code");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
