import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { AiVideo } from "../../models/aiVideoModel.js";
import { Announcement } from "../../models/announcementModel.js";
import { Transaction } from "../../models/transactionModel.js";
import { Contribution } from "../../models/contributionModel.js";
import { format, subDays, startOfMonth } from 'date-fns';

const getDashboardData = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const user = await User.findById(userId).select("fullName totalEarnings currentBalance pendingPayout referralId youtubeStatus selectedTopic channelName contributionStatus");
    const todaysDate = format(new Date(), 'yyyy-MM-dd');
    const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    const todaysAssignment = await UserAssignment.findOne({ user: userId, date: todaysDate });
    const yesterdayAssignment = await UserAssignment.findOne({ user: userId, date: yesterdayDate });

    let assignmentsCompletedToday = 0;
    let totalAssignmentsToday = 0;
    if (todaysAssignment) {
        totalAssignmentsToday = todaysAssignment.totalTasks;
        assignmentsCompletedToday = new Set(todaysAssignment.completedTasks.map(task => task.link)).size;
    }

    let pendingFromYesterday = 0;
    if (yesterdayAssignment && yesterdayAssignment.status === 'InProgress') {
        const uniqueCompletedYesterday = new Set(yesterdayAssignment.completedTasks.map(task => task.link));
        pendingFromYesterday = yesterdayAssignment.totalTasks - uniqueCompletedYesterday.size;
    }
    
    const startOfCurrentMonth = startOfMonth(new Date());
    const monthlyIncomeResult = await Transaction.aggregate([
        { $match: { user: userId, type: 'Credit', category: 'YouTube', createdAt: { $gte: startOfCurrentMonth } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const monthlyYoutubeIncome = monthlyIncomeResult[0]?.total || 0;

    const aiVideoForUpload = await AiVideo.findOne({ assignedTo: userId, status: 'Assigned' });
    const lastDownloadedVideo = await AiVideo.findOne({ assignedTo: userId, status: 'Downloaded' }).sort({ updatedAt: -1 });

    let platformContributionDue = 0;
    if(user.contributionStatus !== 'Paid'){
        const platformContributionPercentage = parseFloat(process.env.PLATFORM_CONTRIBUTION_PERCENTAGE || '0.1');
        const paidContributions = await Contribution.aggregate([
            { $match: { user: userId, status: 'Success' } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalDues = (user.totalEarnings || 0) * platformContributionPercentage;
        const totalPaid = paidContributions[0]?.total || 0;
        platformContributionDue = Math.max(0, totalDues - totalPaid);
    }

    const directReferralsCount = await User.countDocuments({ referredBy: userId });
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
            directReferrals: directReferralsCount
        },
        announcements,
    };

    return res.status(200).json(new ApiResponse(200, dashboardData, "User dashboard data fetched successfully."));
});

export { getDashboardData };
