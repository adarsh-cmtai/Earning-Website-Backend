import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ActivityLog } from "../../models/activityLogModel.js";
import { ErrorLog } from "../../models/errorLogModel.js";

const getAuditLogs = asyncHandler(async (req, res) => {
    const auditLogs = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json(new ApiResponse(200, auditLogs, "Audit logs fetched successfully."));
});

const getErrorLogs = asyncHandler(async (req, res) => {
    // In a real application, these would be populated by a global error handler.
    // We will seed some dummy data if none exists for demonstration.
    const count = await ErrorLog.countDocuments();
    if (count === 0) {
        await ErrorLog.create([
            { errorCode: 500, errorMessage: "Database connection failed", stackTrace: "at db.js:15", route: "/api/v1/users/login" },
            { errorCode: 404, errorMessage: "User not found for ID: 12345", stackTrace: "at userController.js:42", route: "/api/v1/admin/users/12345" }
        ]);
    }
    const errorLogs = await ErrorLog.find({}).sort({ createdAt: -1 }).limit(50);
    return res.status(200).json(new ApiResponse(200, errorLogs, "Error logs fetched successfully."));
});

export { getAuditLogs, getErrorLogs };