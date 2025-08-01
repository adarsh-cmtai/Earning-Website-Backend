import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { logActivity } from "../../services/activityLogger.js";

const getUserIncomeProfiles = asyncHandler(async (req, res) => {
    const { search = "", contributionStatus = "all" } = req.query;

    const query = { role: 'user' };

    if (search) {
        query.$or = [
            { fullName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }
    
    if (contributionStatus && contributionStatus !== 'all') {
        query.contributionStatus = contributionStatus;
    }

    const users = await User.find(query).select("email fullName totalEarnings pendingPayout contributionStatus incomeStatus platformContributionDue suggestedContributionPercentage").sort({ pendingPayout: -1 });

    return res.status(200).json(new ApiResponse(200, users, "User income profiles fetched successfully."));
});

const updateIncomeStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status, reason } = req.body;
    if (!['Active', 'Suspended'].includes(status)) { throw new ApiError(400, "Invalid income status provided."); }
    if (status === 'Suspended' && !reason) { throw new ApiError(400, "A reason is required to suspend income."); }
    const user = await User.findByIdAndUpdate(userId, { incomeStatus: status }, { new: true });
    if (!user) { throw new ApiError(404, "User not found."); }
    await logActivity({ admin: req.user, actionType: `Income${status}`, targetUser: user.email, details: `Reason: ${reason || 'Reactivated'}`, status: 'warning' });
    return res.status(200).json(new ApiResponse(200, user, `User income has been ${status.toLowerCase()}.`));
});

const processBulkPayout = asyncHandler(async (req, res) => {
    const { userIds, totalAmount } = req.body;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) { throw new ApiError(400, "An array of user IDs is required."); }
    await User.updateMany({ _id: { $in: userIds } }, { $set: { pendingPayout: 0 } });
    await logActivity({ admin: req.user, actionType: 'BulkPayoutProcessed', details: `Processed payouts for ${userIds.length} users, totaling ₹${totalAmount}.`, status: 'success' });
    return res.status(200).json(new ApiResponse(200, { userIds }, "Bulk payout processed successfully."));
});

const markContributionAsPaid = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    user.contributionStatus = 'Paid';
    user.lastContributionDate = new Date();
    await user.save({ validateBeforeSave: false });

    await logActivity({
        admin: req.user,
        actionType: 'ContributionPaid',
        targetUser: user.email,
        details: `Marked platform contribution as paid for user ${user.email}.`,
        status: 'success'
    });

    return res.status(200).json(new ApiResponse(200, user, "User contribution marked as paid."));
});

const setSuggestedContribution = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { percentage } = req.body;

    if (percentage === undefined || percentage < 0 || percentage > 100) {
        throw new ApiError(400, "A valid percentage between 0 and 100 is required.");
    }

    const user = await User.findByIdAndUpdate(
        userId,
        { suggestedContributionPercentage: percentage },
        { new: true }
    );

    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    await logActivity({
        admin: req.user,
        actionType: 'SetContributionPercentage',
        targetUser: user.email,
        details: `Set suggested contribution to ${percentage}% for ${user.email}.`,
        status: 'success'
    });

    return res.status(200).json(new ApiResponse(200, user, "Suggested contribution percentage updated."));
});

export { getUserIncomeProfiles, updateIncomeStatus, processBulkPayout, markContributionAsPaid, setSuggestedContribution };