import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { sendEmail } from "../../services/emailService.js";

const sendAdminOtp = asyncHandler(async (req, res) => {
    const { email, mobile } = req.body;

    if (!email || !mobile) {
        throw new ApiError(400, "Email and mobile number are required.");
    }

    const existedAdmin = await User.findOne({ $or: [{ email }, { mobile }], role: 'admin' });
    if (existedAdmin && existedAdmin.isEmailVerified) {
        throw new ApiError(409, "A verified admin with this email or mobile already exists.");
    }

    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const mobileOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await User.findOneAndUpdate(
        { email, role: 'admin' },
        { email, mobile, emailOtp, mobileOtp, emailOtpExpiry: otpExpiry, isEmailVerified: false, isMobileVerified: false, role: 'admin' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    try {
        await sendEmail({
            to: email,
            subject: "Admin Account Verification Code",
            html: `<h1>Your UEIEP Admin OTP is: ${emailOtp}</h1>`
        });
        console.log(`Admin Mobile OTP for ${mobile} is ${mobileOtp}`);
    } catch (error) {
        throw new ApiError(500, "Failed to send OTP to admin.");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Admin OTP sent successfully."));
});

const verifyAndRegisterAdmin = asyncHandler(async (req, res) => {
    const { fullName, email, mobile, password, adminRole, emailOtp, mobileOtp } = req.body;

    const requiredFields = { fullName, email, mobile, password, adminRole, emailOtp, mobileOtp };
    for (const [key, value] of Object.entries(requiredFields)) {
        if (!value || String(value).trim() === "") {
            throw new ApiError(400, `${key} is a required field.`);
        }
    }

    const admin = await User.findOne({
        email,
        mobile,
        emailOtp,
        mobileOtp,
        role: 'admin',
        emailOtpExpiry: { $gt: Date.now() }
    });

    if (!admin) {
        throw new ApiError(400, "Invalid or expired OTP. Please try again.");
    }

    admin.fullName = fullName;
    admin.password = password;
    admin.adminRole = adminRole;
    admin.isEmailVerified = true;
    admin.isMobileVerified = true;
    admin.emailOtp = undefined;
    admin.mobileOtp = undefined;
    admin.emailOtpExpiry = undefined;

    await admin.save();

    const createdAdmin = await User.findById(admin._id).select("-password -refreshToken");

    return res.status(201).json(new ApiResponse(201, createdAdmin, "Admin account verified and created successfully."));
});

export { sendAdminOtp, verifyAndRegisterAdmin };