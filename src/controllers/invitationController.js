import crypto from "crypto";
import Invitation from "../models/invitationModel.js";
import Department from "../models/DepartmentModel.js";
import User from "../models/usersModel.js";
import { generateEmployeeId } from "../utils/generateEmployeeId.js"
import { resend } from "../cofig/resend.js";




export const sendInvitation = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      departmentId,
      designation,
      role,
    } = req.body;

    // Check if user already exists
    const user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "Employee already exists.",
      });
    }

    // Check if invitation already exists
    const existingInvitation = await Invitation.findOne({
      email,
      used: false,
    });

    if (existingInvitation) {
      return res.status(400).json({
        success: false,
        message: "Invitation already sent.",
      });
    }

    console.log(departmentId)

    // Find department
    const departmentData = await Department.findOne({
      _id: departmentId,
      status: "Active",
    });


    if (!departmentData) {
      return res.status(400).json({
        success: false,
        message: "Invalid or inactive department.",
      });
    }


    const employeeId = await generateEmployeeId(
      departmentData.name,
      departmentData.code
    );

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");

    // Save invitation
    await Invitation.create({
      employeeId: employeeId,
      fullName,
      email,
      phone,

      // Store Department ObjectId
      department: departmentData._id,
      
      designation,
      role,
      token,
      invitedBy: req.user._id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Registration link
    const clientBase = process.env.CLIENT_URL || "http://localhost:5173";
    const invitationLink = `${clientBase}/register?token=${token}`;

    let emailSent = false;
    let emailErrorMsg = "";

    try {
      if (resend && process.env.RESEND_API_KEY) {
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
          to: email,
          subject: "You're invited to NoteSwift Employee Management",
          html: `
            <h2>Welcome to NoteSwift!</h2>
            <p>Hello ${fullName},</p>
            <p>You have been invited to join NoteSwift as <strong>${designation}</strong> in <strong>${departmentData.name}</strong>.</p>
            <p><a href="${invitationLink}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;">Complete Your Registration</a></p>
            <p>Or copy this link: ${invitationLink}</p>
            <p>This link expires in 24 hours.</p>
          `,
        });
        emailSent = true;
      }
    } catch (mailErr) {
      console.warn("Resend email delivery skipped or failed:", mailErr.message);
      emailErrorMsg = mailErr.message;
    }

    return res.status(200).json({
      success: true,
      message: emailSent
        ? "Invitation email dispatched successfully."
        : "Invitation created successfully. You can copy and share the invitation link directly.",
      token,
      invitationLink,
      emailSent,
      employeeId,
      notice: emailSent ? null : "Email sending skipped (using direct invitation link fallback).",
    });

  } catch (error) {
    console.error("SEND INVITATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const validateInvitation = async (req, res) => {
  try {
    const { token } = req.query;

    const invitation = await Invitation.findOne({
      token,
      used: false,
    }).populate("department", "name code");

    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: "Invalid invitation.",
      });
    }

    if (invitation.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "Invitation has expired.",
      });
    }

    return res.status(200).json({
      success: true,

      employeeId: invitation.employeeId,
      fullName: invitation.fullName,
      email: invitation.email,
      phone: invitation.phone,

      department: invitation.department,

      designation: invitation.designation,
      role: invitation.role,
    });

  } catch (error) {
    console.error("Validate invitation error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};