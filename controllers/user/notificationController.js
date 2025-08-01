import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Notification } from "../../models/notificationModel.js";
import { ApiError } from "../../utils/ApiError.js";

const getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });

    if (notifications.length === 0) {
        await Notification.create([
            { user: userId, type: "income", title: "Payment Received: ₹1,200", description: "Your withdrawal request has been processed." },
            { user: userId, type: "assignment", title: "Daily Assignments Completed!", description: "Congratulations! You've completed all tasks for today." },
            { user: userId, type: "referral", title: "New Referral Joined: REF***789", description: "A new member has joined your Level 1 downline.", read: true },
        ]);
        const newNotifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
        return res.status(200).json(new ApiResponse(200, newNotifications, "Notifications fetched successfully."));
    }
    
    return res.status(200).json(new ApiResponse(200, notifications, "Notifications fetched successfully."));
});

const markAsRead = asyncHandler(async (req, res) => {
    const { notificationId } = req.params;
    const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, user: req.user._id },
        { read: true },
        { new: true }
    );
    if (!notification) { throw new ApiError(404, "Notification not found."); }
    return res.status(200).json(new ApiResponse(200, notification, "Notification marked as read."));
});

const markAllAsRead = asyncHandler(async (req, res) => {
    await Notification.updateMany(
        { user: req.user._id, read: false },
        { read: true }
    );
    return res.status(200).json(new ApiResponse(200, {}, "All notifications marked as read."));
});

export { getNotifications, markAsRead, markAllAsRead };