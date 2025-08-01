import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { Transaction } from "../../models/transactionModel.js";
import { Contribution } from "../../models/contributionModel.js";
import { Alert } from "../../models/alertModel.js";
import { ApiError } from "../../utils/ApiError.js";
import crypto from "crypto";
import mongoose from "mongoose";

const getIncomeSummary = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("pendingPayout totalEarnings currentBalance suggestedContributionPercentage");
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const categoryTotals = await Transaction.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } }
    ]);
    
    const paidContributions = await Contribution.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(userId), status: 'Success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const alerts = await Alert.find({ user: userId, status: 'active' }).sort({ createdAt: -1 });
    
    const platformContributionPercentage = parseFloat(process.env.PLATFORM_CONTRIBUTION_PERCENTAGE || '0.1');
    const totalDues = user.totalEarnings * platformContributionPercentage;
    const totalPaid = paidContributions[0]?.total || 0;
    const platformContributionDue = Math.max(0, totalDues - totalPaid);

    const summary = {
        totalBalance: user.currentBalance || 0,
        totalWithdrawn: 0,
        totalReferralEarnings: 0,
        totalAssignmentEarnings: 0,
        totalYoutubeEarnings: 0,
        platformContributionDue: platformContributionDue,
        suggestedContributionPercentage: user.suggestedContributionPercentage,
        alerts: alerts,
    };

    categoryTotals.forEach(category => {
        switch (category._id) {
            case 'Payout': summary.totalWithdrawn = Math.abs(category.total); break;
            case 'Referral': summary.totalReferralEarnings = category.total; break;
            case 'Assignment': case 'Bonus': summary.totalAssignmentEarnings += category.total; break;
            case 'YouTube': summary.totalYoutubeEarnings = category.total; break;
        }
    });

    return res.status(200).json(new ApiResponse(200, summary, "Income summary fetched successfully."));
});

const getTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find({ user: req.user._id, category: { $ne: 'Platform Fee' } }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, transactions, "Transactions fetched successfully."));
});

const getContributionHistory = asyncHandler(async (req, res) => {
    const contributions = await Contribution.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, contributions, "Contribution history fetched successfully."));
});

const createContributionOrder = asyncHandler(async (req, res) => {
    const { percentage } = req.body;
    if (!percentage || percentage <= 0 || percentage > 100) {
        throw new ApiError(400, "A valid percentage (1-100) is required.");
    }
    
    const user = await User.findById(req.user._id).select('currentBalance');
    if (!user || user.currentBalance <= 0) {
        throw new ApiError(400, "No current balance available to pay contribution from.");
    }
    
    const amountToPay = (user.currentBalance * percentage) / 100;

    const mockOrder = {
        orderId: `mock_order_${crypto.randomBytes(12).toString('hex')}`,
        amount: Math.round(amountToPay * 100),
        currency: "INR",
        percentage,
    };

    return res.status(200).json(new ApiResponse(200, mockOrder, "Mock payment order created successfully."));
});

const verifyContributionPayment = asyncHandler(async (req, res) => {
    const { orderId, paymentId, signature, percentage } = req.body;
    const user = await User.findById(req.user._id);

    if (!user || !percentage) {
        throw new ApiError(400, "Invalid request. User or percentage missing.");
    }
    
    const amountPaid = (user.currentBalance * percentage) / 100;

    if (amountPaid <= 0) {
        throw new ApiError(400, "Calculated payment amount is zero or less.");
    }

    const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

    await Contribution.create({
        user: user._id,
        amount: amountPaid,
        paymentId: paymentId || `mock_payment_${crypto.randomBytes(12).toString('hex')}`,
        status: 'Success',
        period: `${currentMonth} (${percentage}%)`
    });
    
    user.currentBalance -= amountPaid;
    user.contributionStatus = 'Paid';
    user.lastContributionDate = new Date();
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, {}, "Payment successful and contribution recorded."));
});

export { getIncomeSummary, getTransactions, getContributionHistory, createContributionOrder, verifyContributionPayment };