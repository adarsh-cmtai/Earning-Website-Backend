import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ComplianceRecord } from "../../models/complianceRecordModel.js";

const getComplianceHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    
    const records = await ComplianceRecord.find({ user: userId }).sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, records, "Compliance history fetched successfully."));
});

export { getComplianceHistory };