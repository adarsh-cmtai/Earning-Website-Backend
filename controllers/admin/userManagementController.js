import mongoose from "mongoose";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { ManualIncome } from "../../models/manualIncomeModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { logActivity } from "../../services/activityLogger.js";
import { sendEmail } from "../../services/emailService.js";
import crypto, { randomBytes } from "crypto";
import { Transaction } from "../../models/transactionModel.js";
import { format, subDays } from 'date-fns';

const getUserCompliance = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found.");

    const todaysDate = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgo = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    const recentAssignments = await UserAssignment.find({
        user: userId,
        date: { $gte: thirtyDaysAgo }
    }).populate('batch');

    let dailyCompletion = 0;
    const todaysAssignment = recentAssignments.find(a => a.date === todaysDate);

    if (todaysAssignment && todaysAssignment.batch && todaysAssignment.totalTasks > 0) {
        const validLinks = new Set(todaysAssignment.batch.links.map(link => link.url));
        const completedLinks = new Set(
            todaysAssignment.completedTasks.map(t => t.link)
        );
        
        let completedCount = 0;
        completedLinks.forEach(link => {
            if (validLinks.has(link)) {
                completedCount++;
            }
        });

        dailyCompletion = Math.round((completedCount / todaysAssignment.totalTasks) * 100);
    }

    let monthlyCompletion = 0;
    if (recentAssignments.length > 0) {
        const dailyRates = recentAssignments.map(ua => {
            if (!ua.batch || ua.totalTasks === 0) return 0;
            const validLinks = new Set(ua.batch.links.map(link => link.url));
            const completedLinks = new Set(ua.completedTasks.map(t => t.link));
            
            let completedCount = 0;
            completedLinks.forEach(link => {
                if (validLinks.has(link)) {
                    completedCount++;
                }
            });

            return completedCount / ua.totalTasks;
        });
        const averageRate = dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length;
        monthlyCompletion = Math.round(averageRate * 100);
    }

    let overallStatus = "Good Standing";
    if (monthlyCompletion < 75) overallStatus = "At Risk";
    if (monthlyCompletion < 65) overallStatus = "Non-Compliant";

    const complianceData = { dailyCompletion, monthlyCompletion, overallStatus };
    return res.status(200).json(new ApiResponse(200, complianceData, "Compliance data fetched successfully."));
});

const getAllUsers = asyncHandler(async (req, res) => {
    const { search = "", status = "all" } = req.query;
    const query = { role: 'user' };
    if (search) { query.$or = [ { fullName: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }, { mobile: { $regex: search, $options: 'i' } }, { referralId: { $regex: search, $options: 'i' } } ]; }
    if (status && status !== 'all') { query.status = status; }
    const users = await User.find(query).select("-password -refreshToken").sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, users, "Users fetched successfully."));
});

const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) { throw new ApiError(404, "User not found."); }
    return res.status(200).json(new ApiResponse(200, user, "User details fetched successfully."));
});
const updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { fullName, mobile, upiName, upiId } = req.body;
    const user = await User.findByIdAndUpdate(userId, { $set: { fullName, mobile, upiName, upiId } }, { new: true }).select("-password -refreshToken");
    if (!user) { throw new ApiError(404, "User not found."); }
    await logActivity({ admin: req.user, actionType: 'UserDetailsUpdated', targetUser: user.email, details: `Updated details for user ${user.email}.`, status: 'success' });
    return res.status(200).json(new ApiResponse(200, user, "User details updated successfully."));
});
const suspendUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason, suspend } = req.body;
    if (suspend && !reason) { throw new ApiError(400, "A reason is required to suspend a user."); }
    const user = await User.findById(userId);
    if (!user) { throw new ApiError(404, "User not found."); }
    user.status = suspend ? 'Suspended' : 'Approved';
    await user.save({ validateBeforeSave: false });
    await logActivity({ admin: req.user, actionType: `User${suspend ? 'Suspended' : 'Activated'}`, targetUser: user.email, details: `Reason: ${reason || 'N/A'}`, status: 'warning' });
    return res.status(200).json(new ApiResponse(200, user, `User has been ${suspend ? 'suspended' : 'activated'}.`));
});
const updateYoutubeStatus = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { status } = req.body;
    if (!['Verified', 'Declined'].includes(status)) { throw new ApiError(400, "Invalid status provided."); }
    const user = await User.findById(userId);
    if (!user) { throw new ApiError(404, "User not found."); }
    user.youtubeStatus = status;
    if (status === 'Verified' && !user.referralId) {
        user.referralId = `UEIEP-${randomBytes(4).toString('hex').toUpperCase()}`;
    }
    await user.save();
    await logActivity({ admin: req.user, actionType: 'YoutubeStatusUpdated', targetUser: user.email, details: `YouTube channel status set to ${status}.`, status: 'success' });
    return res.status(200).json(new ApiResponse(200, user, `YouTube channel status updated to ${status}.`));
});
const resetUserPassword = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) { throw new ApiError(404, "User not found."); }
    const newPassword = crypto.randomBytes(8).toString('hex');
    user.password = newPassword;
    await user.save();
    try { await sendEmail({ to: user.email, subject: "Your Password Has Been Reset", html: `<h1>Password Reset</h1><p>Your new temporary password is: <strong>${newPassword}</strong></p><p>Please log in and change your password immediately.</p>` }); } catch (error) { throw new ApiError(500, "Password was reset, but failed to send email notification."); }
    await logActivity({ admin: req.user, actionType: 'PasswordReset', targetUser: user.email, details: `Password reset for user ${user.email}.`, status: 'warning' });
    return res.status(200).json(new ApiResponse(200, {}, "User password has been reset and an email has been sent."));
});

const getUserDetailsForAdmin = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user || user.role !== 'user') {
        throw new ApiError(404, "User not found.");
    }

    const transactions = await Transaction.find({ user: userId }).sort({ createdAt: -1 });

    let downlineLevels = [];
    let currentLevelIds = [user._id];
    let allMemberIds = new Set();
    let totalActiveReferrals = 0;
    const allUserTransactions = await Transaction.find({ user: user._id, category: 'Referral' });

    for (let level = 1; level <= 5; level++) {
        if (currentLevelIds.length === 0) break;
        const members = await User.find({ referredBy: { $in: currentLevelIds } }).select("_id fullName email status createdAt");
        if (members.length === 0) break;
        const memberIds = members.map(m => m._id);
        memberIds.forEach(id => allMemberIds.add(id.toString()));
        
        const memberDetails = members.map(member => {
            if (member.status === 'Approved') totalActiveReferrals++;
            const incomeFromThisMember = allUserTransactions.filter(t => t.description.includes(member._id.toString())).reduce((sum, t) => sum + t.amount, 0);
            return { _id: member._id, userIdMasked: `${member.fullName.substring(0, 3)}...${member._id.toString().slice(-4)}`, status: member.status, incomeContribution: incomeFromThisMember, joinDate: member.createdAt };
        });

        downlineLevels.push({ level, count: memberDetails.length, income: memberDetails.reduce((sum, m) => sum + m.incomeContribution, 0), percentage: 20, members: memberDetails });
        currentLevelIds = memberIds;
    }
    
    const totalIncomeResult = await Transaction.aggregate([ { $match: { user: new mongoose.Types.ObjectId(userId), category: 'Referral' } }, { $group: { _id: null, total: { $sum: '$amount' } } } ]);

    const downline = {
        totalReferrals: allMemberIds.size,
        activeReferrals: totalActiveReferrals,
        totalIncome: totalIncomeResult[0]?.total || 0,
        levels: downlineLevels
    };

    const userDetails = {
        profile: user,
        transactions,
        downline
    };

    return res.status(200).json(new ApiResponse(200, userDetails, "User details fetched successfully."));
});

const getManualIncomeSubmissions = asyncHandler(async (req, res) => {
    const submissions = await ManualIncome.find({ status: 'Pending' }).populate('user', 'fullName email');
    return res.status(200).json(new ApiResponse(200, submissions, "Pending manual income submissions fetched."));
});

const reviewManualIncome = asyncHandler(async (req, res) => {
    const { submissionId } = req.params;
    const { status, comment } = req.body;

    if (!['Approved', 'Declined'].includes(status)) {
        throw new ApiError(400, "Invalid status provided.");
    }

    const submission = await ManualIncome.findById(submissionId);
    if (!submission || submission.status !== 'Pending') {
        throw new ApiError(404, "Submission not found or already reviewed.");
    }

    submission.status = status;
    submission.reviewedBy = req.user._id;
    submission.reviewComment = comment;
    await submission.save();

    if (status === 'Approved') {
        const user = await User.findById(submission.user);
        if (user) {
            user.totalEarnings = (user.totalEarnings || 0) + submission.amount;
            user.currentBalance = (user.currentBalance || 0) + submission.amount;
            user.pendingPayout = (user.pendingPayout || 0) + submission.amount;
            user.contributionStatus = "Pending";
            await user.save({ validateBeforeSave: false });

            await Transaction.create({
                user: user._id,
                type: 'Credit',
                category: 'YouTube',
                amount: submission.amount,
                status: 'Completed',
                description: `Manual income for ${submission.month} ${submission.year} approved.`
            });
        }
    }

    const submissionUser = await User.findById(submission.user).select('email');
    await logActivity({
        admin: req.user,
        actionType: 'ManualIncomeReviewed',
        targetUser: submissionUser?.email,
        details: `Reviewed submission ${submissionId} for ₹${submission.amount}. New Status: ${status}.`,
        status: status === 'Approved' ? 'success' : 'warning'
    });
    return res.status(200).json(new ApiResponse(200, submission, "Submission reviewed successfully."));
});

export { getAllUsers, getUserById, updateUser, suspendUser, updateYoutubeStatus, resetUserPassword, getUserCompliance, getUserDetailsForAdmin, getManualIncomeSubmissions, reviewManualIncome };