import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { Alert } from "../../models/alertModel.js";
import { ActivityLog } from "../../models/activityLogModel.js";
import { Contribution } from "../../models/contributionModel.js";
import { subDays, startOfDay, subMonths, startOfMonth } from 'date-fns';

const getDashboardData = asyncHandler(async (req, res) => {
    const twentyFourHoursAgo = startOfDay(subDays(new Date(), 1));
    const thirtyDaysAgo = startOfDay(subDays(new Date(), 30));
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    const newRegistrations = await User.countDocuments({ role: 'user', createdAt: { $gte: twentyFourHoursAgo } });
    
    const revenueLast30DaysResult = await Contribution.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, status: 'Success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const platformRevenue = revenueLast30DaysResult[0]?.total || 0;

    const activeAlerts = await Alert.find({ status: 'active', type: 'system' }).sort({ createdAt: -1 }).limit(5);
    const recentActivities = await ActivityLog.find({}).sort({ createdAt: -1 }).limit(5);

    const stats = {
        totalUsers,
        totalAdmins,
        newRegistrations,
        platformRevenue,
    };
    
    const revenueResult = await Contribution.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'Success' } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, totalRevenue: { $sum: "$amount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueDataFormatted = revenueResult.map(item => ({
        name: monthNames[item._id.month - 1],
        revenue: item.totalRevenue
    }));
    
    const last6Months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return monthNames[d.getMonth()];
    });

    const revenueData = last6Months.map(monthName => {
        const found = revenueDataFormatted.find(d => d.name === monthName);
        return found || { name: monthName, revenue: 0 };
    });

    const dashboardData = {
        stats,
        alerts: activeAlerts,
        activities: recentActivities,
        revenueData,
    };

    return res.status(200).json(new ApiResponse(200, dashboardData, "Dashboard data fetched successfully."));
});

export { getDashboardData };