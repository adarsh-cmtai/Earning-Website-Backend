import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Alert } from "../../models/alertModel.js";
import { ApiError } from "../../utils/ApiError.js";

const createAlert = asyncHandler(async (req, res) => {
    const { type, title, description } = req.body;
    if (!type || !title || !description) {
        throw new ApiError(400, "Type, title, and description are required.");
    }
    const alert = await Alert.create({ type, title, description, type: 'system' });
    return res.status(201).json(new ApiResponse(201, alert, "Alert created successfully."));
});

const resolveAlert = asyncHandler(async (req, res) => {
    const { alertId } = req.params;
    const alert = await Alert.findByIdAndUpdate(alertId, { status: 'resolved' }, { new: true });
    if (!alert) {
        throw new ApiError(404, "Alert not found.");
    }
    return res.status(200).json(new ApiResponse(200, alert, "Alert resolved successfully."));
});

const sendUserAlert = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required.");
    }

    const alert = await Alert.create({
        user: userId,
        type: 'warning',
        title,
        description,
    });
    
    return res.status(201).json(new ApiResponse(201, alert, "Alert sent to user successfully."));
});


export { createAlert, resolveAlert, sendUserAlert };