import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { AssignmentBatch } from "../../models/assignmentBatchModel.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { AiVideo } from "../../models/aiVideoModel.js";
import { Announcement } from "../../models/announcementModel.js";
import { Transaction } from "../../models/transactionModel.js";
import { format, subDays, startOfMonth } from 'date-fns';

const getDashboardData = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("fullName totalEarnings currentBalance pendingPayout referralId youtubeStatus selectedTopic channelName");
    const todaysDate = format(new Date(), 'yyyy-MM-dd');
    const todaysAssignmentBatch = await AssignmentBatch.findOne({ date: todaysDate });

    let assignmentsCompletedToday = 0;
    let totalAssignmentsToday = 0;

    if (todaysAssignmentBatch) {
        const userAssignment = await UserAssignment.findOne({ user: userId, date: todaysDate });
        if (userAssignment) {
            const uniqueCompleted = new Set(userAssignment.completedTasks.map(task => task.link));
            assignmentsCompletedToday = uniqueCompleted.size;
        }
        totalAssignmentsToday = todaysAssignmentBatch.links.length;
    }

    const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const incompleteYesterday = await UserAssignment.findOne({ user: userId, date: yesterdayDate, status: 'InProgress' }).populate('batch');
    let pendingFromYesterday = 0;

    if (incompleteYesterday) {
        const uniqueCompletedYesterday = new Set(incompleteYesterday.completedTasks.map(task => task.link));
        pendingFromYesterday = (incompleteYesterday.batch.links.length - uniqueCompletedYesterday.size);
    }
    
    const startOfCurrentMonth = startOfMonth(new Date());
    const monthlyIncomeResult = await Transaction.aggregate([
        { $match: { user: userId, type: 'Credit', createdAt: { $gte: startOfCurrentMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyYoutubeIncome = monthlyIncomeResult[0]?.total || 0;

    const aiVideoForUpload = await AiVideo.findOne({ assignedTo: userId, status: 'Assigned' });
    const lastDownloadedVideo = await AiVideo.findOne({ assignedTo: userId, status: 'Downloaded' }).sort({ updatedAt: -1 });
    const platformContributionPercentage = parseFloat(process.env.PLATFORM_CONTRIBUTION_PERCENTAGE || '0.1');
    const platformContributionDue = (user.totalEarnings || 0) * platformContributionPercentage;
    const announcements = await Announcement.find({ isActive: true }).sort({ createdAt: -1 }).limit(3);

    const dashboardData = {
        userProfile: {
            fullName: user.fullName,
            youtubeStatus: user.youtubeStatus,
            selectedTopic: user.selectedTopic,
            channelName: user.channelName
        },
        dailyAssignment: {
            completed: assignmentsCompletedToday,
            total: totalAssignmentsToday,
            pending: (totalAssignmentsToday - assignmentsCompletedToday) + pendingFromYesterday
        },
        aiVideo: {
            current: aiVideoForUpload,
            lastDownloaded: lastDownloadedVideo
        },
        income: {
            currentBalance: user.currentBalance || 0,
            monthlyYoutubeIncome: monthlyYoutubeIncome,
            platformContributionDue,
            downlineIncomeMTD: 0
        },
        referral: {
            referralId: user.referralId,
            directReferrals: 0
        },
        announcements,
    };

    return res.status(200).json(new ApiResponse(200, dashboardData, "User dashboard data fetched successfully."));
});

export { getDashboardData };