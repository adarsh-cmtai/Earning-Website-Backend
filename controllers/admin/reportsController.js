import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { Contribution } from "../../models/contributionModel.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { Transaction } from "../../models/transactionModel.js";
import { subMonths, startOfMonth, subDays, startOfDay, format } from 'date-fns';

const exportReport = asyncHandler(async (req, res) => {
    const { reportName, formatType, from, to } = req.body;

    if (!reportName || !formatType || !from || !to) {
        throw new ApiError(400, "Report name, format, and date range are required.");
    }
    
    console.log(`Generating report: ${reportName} (${formatType}) from ${from} to ${to}`);
    
    const mockFileUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

    return res.status(200).json(new ApiResponse(200, { downloadUrl: mockFileUrl }, "Report generated successfully."));
});

const getReportsData = asyncHandler(async (req, res) => {
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));
    const revenueResult = await Contribution.aggregate([
        { $match: { createdAt: { $gte: sixMonthsAgo }, status: 'Success' } },
        { $group: { _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } }, totalRevenue: { $sum: "$amount" } } },
        { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const revenueDataFormatted = revenueResult.map(item => ({ name: monthNames[item._id.month - 1], revenue: item.totalRevenue }));
    
    const last6Months = Array.from({ length: 6 }, (_, i) => monthNames[subMonths(new Date(), 5 - i).getMonth()]);
    const revenueData = last6Months.map(monthName => revenueDataFormatted.find(d => d.name === monthName) || { name: monthName, revenue: 0 });

    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
    const engagementResult = await UserAssignment.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, uniqueUsers: { $addToSet: "$user" } } },
        { $project: { date: "$_id", active: { $size: "$uniqueUsers" } } },
        { $sort: { date: 1 } }
    ]);
    
    const engagementMap = new Map(engagementResult.map(item => [item.date, item.active]));
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const engagementData = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dateString = format(date, 'yyyy-MM-dd');
        return { name: dayNames[date.getDay()], active: engagementMap.get(dateString) || 0 };
    });

    const incomeDistributionResult = await Transaction.aggregate([
        { $match: { type: 'Credit', category: { $in: ['Assignment', 'Referral', 'YouTube'] } } },
        { $group: { _id: "$category", total: { $sum: "$amount" } } }
    ]);
    
    const totalIncome = incomeDistributionResult.reduce((sum, item) => sum + item.total, 0);
    const incomeDistributionData = incomeDistributionResult.map(item => ({
        name: item._id === 'Referral' ? 'Downline' : 'Direct Task',
        value: totalIncome > 0 ? parseFloat(((item.total / totalIncome) * 100).toFixed(1)) : 0
    }));

    const nonCompliantUsers = await User.find({ $or: [ { contributionStatus: "Overdue" }, { status: "Suspended" } ] }).limit(10).select("email status contributionStatus");
    const complianceData = nonCompliantUsers.map(user => ({ user: user.email, issue: user.status === 'Suspended' ? 'Account Suspended' : 'Contribution Overdue' }));
    
    const reports = { revenueData, engagementData, incomeDistributionData, complianceData };
    return res.status(200).json(new ApiResponse(200, reports, "Reports data fetched successfully."));
});

export { getReportsData, exportReport };