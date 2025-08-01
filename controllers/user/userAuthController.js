import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { User } from "../../models/user.model.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { sendEmail } from "../../services/emailService.js";
import crypto from "crypto";

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "Current user fetched successfully."));
});

const generateAccessAndRefreshTokens = async(userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating tokens");
    }
}

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) { throw new ApiError(400, "Email and password are required"); }
    const user = await User.findOne({ email });
    if (!user) { throw new ApiError(404, "User with this email does not exist."); }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) { throw new ApiError(401, "Invalid password. Please try again."); }
    
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    
    const deviceId = crypto.randomBytes(16).toString("hex");
    user.activeSessions.push({
        deviceId,
        deviceName: req.headers['user-agent'] || 'Unknown Device',
        ipAddress: req.ip,
        lastActive: new Date()
    });
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };
    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).cookie("deviceId", deviceId, options).json(new ApiResponse(200, { user: loggedInUser, accessToken }, "User logged in successfully"));
});

const logoutUser = asyncHandler(async (req, res) => {
    const { deviceId } = req.cookies;
    await User.findByIdAndUpdate(req.user._id, { 
        $unset: { refreshToken: 1 },
        $pull: { activeSessions: { deviceId: deviceId } }
    });
    
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };
    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).clearCookie("deviceId", options).json(new ApiResponse(200, {}, "User logged out successfully"));
});

const sendOtp = asyncHandler(async (req, res) => {
    const { email, mobile } = req.body;
    if (!email || !mobile) { throw new ApiError(400, "Email and mobile number are required"); }
    const existingVerifiedUser = await User.findOne({ $or: [{ email }, { mobile }], isEmailVerified: true, isMobileVerified: true });
    if (existingVerifiedUser) { throw new ApiError(409, "A verified user with this email or mobile already exists."); }
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const mobileOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await User.findOneAndUpdate({ $or: [{ email }, { mobile }] }, { email, mobile, emailOtp, emailOtpExpiry: otpExpiry, mobileOtp, mobileOtpExpiry: otpExpiry, isEmailVerified: false, isMobileVerified: false }, { upsert: true, new: true, setDefaultsOnInsert: true });
    try { await sendEmail({ to: email, subject: "Your UEIEP Verification Code", html: `<h1>Your OTP is: ${emailOtp}</h1><p>It is valid for 10 minutes.</p>` }); console.log(`Mobile OTP for ${mobile} is ${mobileOtp}`); } catch (error) { throw new ApiError(500, "Failed to send OTP. Please try again."); }
    return res.status(200).json(new ApiResponse(200, {}, "OTP sent successfully."));
});

const verifyOtp = asyncHandler(async (req, res) => {
    const { email, mobile, emailOtp, mobileOtp } = req.body;
    if (!emailOtp || !mobileOtp) { throw new ApiError(400, "Email and Mobile OTPs are required."); }
    const user = await User.findOne({ email, mobile, emailOtp, mobileOtp, emailOtpExpiry: { $gt: Date.now() } });
    if (!user) { throw new ApiError(400, "Invalid or expired OTP."); }
    user.isEmailVerified = true;
    user.isMobileVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpiry = undefined;
    user.mobileOtp = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json(new ApiResponse(200, { verified: true }, "OTP verified successfully."));
});

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, mobile, password, referralId: referredById, upiName, upiId } = req.body;
    if (!password || !fullName) { throw new ApiError(400, "Full name and password are required."); }

    const user = await User.findOne({ email, mobile });
    if (!user) { throw new ApiError(404, "User not found. Please complete OTP verification first."); }
    if (!user.isEmailVerified || !user.isMobileVerified) { throw new ApiError(400, "Email and mobile must be verified first."); }

    if (referredById && referredById !== "UEIEP-DEFAULT-REF") {
        const referrer = await User.findOne({ referralId: referredById });
        if (!referrer) { throw new ApiError(404, "Referrer not found."); }

        const referralCount = await User.countDocuments({ referredBy: referrer._id });
        if (referralCount >= 6) { throw new ApiError(403, "This referrer has already reached the maximum of 6 direct referrals."); }
        
        user.referredBy = referrer._id;
    }

    user.fullName = fullName;
    user.password = password;
    user.upiName = upiName || "";
    user.upiId = upiId || "";
    
    await user.save();

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };
    return res.status(201).cookie("refreshToken", refreshToken, options).cookie("accessToken", accessToken, options).json(new ApiResponse(201, { user: createdUser, accessToken }, "User registered successfully"));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new ApiError(400, "Email is required.");
    }
    const user = await User.findOne({ email });
    if (!user) {
        throw new ApiError(404, "User with this email does not exist.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordResetOtp = otp;
    user.passwordResetOtpExpiry = otpExpiry;
    await user.save();

    try {
        await sendEmail({
            to: email,
            subject: "Your Password Reset Code",
            html: `<h1>Your password reset OTP is: ${otp}</h1><p>It is valid for 10 minutes.</p>`
        });
    } catch (error) {
        throw new ApiError(500, "Failed to send password reset email.");
    }

    return res.status(200).json(new ApiResponse(200, {}, "Password reset OTP sent to your email."));
});

const resetPassword = asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
        throw new ApiError(400, "Email, OTP, and new password are required.");
    }
    const user = await User.findOne({
        email,
        passwordResetOtp: otp,
        passwordResetOtpExpiry: { $gt: Date.now() }
    });
    if (!user) {
        throw new ApiError(400, "Invalid or expired OTP.");
    }

    user.password = newPassword;
    user.passwordResetOtp = undefined;
    user.passwordResetOtpExpiry = undefined;
    await user.save();

    return res.status(200).json(new ApiResponse(200, {}, "Password has been reset successfully."));
});

export { getCurrentUser, loginUser, logoutUser, sendOtp, verifyOtp, registerUser, generateAccessAndRefreshTokens, resetPassword, forgotPassword };