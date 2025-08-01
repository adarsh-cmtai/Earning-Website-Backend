import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { Transaction } from "../../models/transactionModel.js";
import { ManualIncome } from "../../models/manualIncomeModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { logActivity } from "../../services/activityLogger.js";

const getDownlineData = asyncHandler(async (req, res) => {
    const user = req.user;
    let downlineLevels = [];
    let currentLevelIds = [user._id];
    let allMemberIds = new Set();
    let totalActiveReferrals = 0;

    const allTransactions = await Transaction.find({ user: user._id, category: 'Referral' });

    for (let level = 1; level <= 5; level++) {
        if (currentLevelIds.length === 0) break;
        const members = await User.find({ referredBy: { $in: currentLevelIds } }).select("_id fullName email status createdAt");
        if (members.length === 0) break;
        const memberIds = members.map(m => m._id);
        memberIds.forEach(id => allMemberIds.add(id.toString()));
        const memberDetails = members.map(member => {
            if (member.status === 'Approved') totalActiveReferrals++;
            const incomeFromThisMember = allTransactions.filter(t => t.description.includes(member.fullName)).reduce((sum, t) => sum + t.amount, 0);
            return {
                _id: member._id,
                userIdMasked: `${member.fullName.substring(0, 3)}...${member._id.toString().slice(-4)}`,
                status: member.status,
                incomeContribution: incomeFromThisMember,
                joinDate: member.createdAt,
            };
        });
        downlineLevels.push({
            level,
            count: memberDetails.length,
            income: memberDetails.reduce((sum, m) => sum + m.incomeContribution, 0),
            percentage: 20,
            members: memberDetails
        });
        currentLevelIds = memberIds;
    }
    
    const totalIncomeResult = await Transaction.aggregate([
        { $match: { user: user._id, category: 'Referral' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const updatedUser = await User.findById(user._id).select('currentBalance');

    const responseData = {
        referralId: user.referralId,
        referralLink: `${process.env.CORS_ORIGIN}/register?ref=${user.referralId}`,
        totalReferrals: allMemberIds.size,
        activeReferrals: totalActiveReferrals,
        totalIncome: totalIncomeResult[0]?.total || 0,
        currentBalance: updatedUser.currentBalance,
        levels: downlineLevels
    };

    return res.status(200).json(new ApiResponse(200, responseData, "Downline data fetched successfully."));
});

const uploadAnalyticsScreenshot = asyncHandler(async (req, res) => {
    if (!req.file) { throw new ApiError(400, "Screenshot file is required."); }
    const user = await User.findById(req.user._id);
    user.youtubeAnalyticsUrl = req.file.location;
    await user.save();
    return res.status(200).json(new ApiResponse(200, { fileUrl: req.file.location }, "Screenshot uploaded successfully."));
});

const submitManualIncome = asyncHandler(async (req, res) => {
    const { month, year, amount } = req.body;
    if (!req.file) { throw new ApiError(400, "Screenshot file is required."); }
    if (!month || !year || !amount) { throw new ApiError(400, "Month, year, and amount are required."); }

    const existingSubmission = await ManualIncome.findOne({ user: req.user._id, month, year, status: { $in: ['Pending', 'Approved'] } });
    if (existingSubmission) {
        throw new ApiError(409, `You have already submitted an income report for ${month} ${year}.`);
    }

    const submission = await ManualIncome.create({
        user: req.user._id,
        month,
        year: parseInt(year, 10),
        amount: parseFloat(amount),
        screenshotUrl: req.file.location,
    });

    return res.status(201).json(new ApiResponse(201, submission, "Manual income submitted for verification."));
});

export { getDownlineData, uploadAnalyticsScreenshot, submitManualIncome };