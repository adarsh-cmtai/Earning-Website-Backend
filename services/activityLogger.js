import { ActivityLog } from '../models/activityLogModel.js';

export const logActivity = async ({ admin, actionType, targetUser, details, status }) => {
    try {
        await ActivityLog.create({
            admin: admin._id,
            adminEmail: admin.email,
            actionType,
            targetUser,
            details,
            status,
        });
    } catch (error) {
        console.error("Failed to log activity:", error);
    }
};