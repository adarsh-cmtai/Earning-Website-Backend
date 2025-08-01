import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateAccessAndRefreshTokens } from "./userAuthController.js";

const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).select("fullName email mobile upiName upiId notificationPreferences activeSessions");
    return res.status(200).json(new ApiResponse(200, user, "Profile fetched successfully."));
});

const updatePersonalDetails = asyncHandler(async (req, res) => {
    const { fullName, mobile } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { fullName, mobile }, { new: true }).select("fullName mobile");
    return res.status(200).json(new ApiResponse(200, user, "Personal details updated."));
});

const updatePaymentDetails = asyncHandler(async (req, res) => {
    const { upiName, upiId } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { upiName, upiId }, { new: true }).select("upiName upiId");
    return res.status(200).json(new ApiResponse(200, user, "Payment details updated."));
});

const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(currentPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(401, "Invalid current password.");
    }
    user.password = newPassword;
    user.tokensVersion = (user.tokensVersion || 0) + 1;
    await user.save();
    return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully."));
});

const updateNotificationPreferences = asyncHandler(async (req, res) => {
    const preferences = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { notificationPreferences: preferences }, { new: true }).select("notificationPreferences");
    return res.status(200).json(new ApiResponse(200, user, "Notification preferences updated."));
});

const logoutAllDevices = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id);
    const currentDeviceId = req.cookies.deviceId;
    
    user.activeSessions = user.activeSessions.filter(session => session.deviceId === currentDeviceId);
    user.tokensVersion = (user.tokensVersion || 0) + 1;
    
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    
    const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production' };
    
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, {}, "Logged out from all other devices successfully."));
});

export { getProfile, updatePersonalDetails, updatePaymentDetails, changePassword, updateNotificationPreferences, logoutAllDevices };