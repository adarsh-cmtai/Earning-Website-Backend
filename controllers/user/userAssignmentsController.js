import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AssignmentBatch } from "../../models/assignmentBatchModel.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { User } from "../../models/user.model.js";
import { AiVideo } from "../../models/aiVideoModel.js";
import { Transaction } from "../../models/transactionModel.js";
import { ComplianceRecord } from "../../models/complianceRecordModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { format, subDays } from 'date-fns';

const updateBatchCompletion = async (batchId) => {
  const userAssignments = await UserAssignment.find({ batch: batchId });

  if (userAssignments.length > 0) {
    const totalCompleted = userAssignments.reduce((sum, ua) => sum + ua.completedTasks.length, 0);
    const totalPossible = userAssignments.reduce((sum, ua) => sum + ua.totalTasks, 0);
    const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
    const nonCompliantCount = userAssignments.filter(ua => ua.status !== 'Completed').length;

    await AssignmentBatch.findByIdAndUpdate(batchId, {
      completionRate,
      nonCompliantUsers: nonCompliantCount
    });
  }
};

const getTodaysAssignments = asyncHandler(async (req, res) => {
  const user = req.user;
  const todaysDate = format(new Date(), 'yyyy-MM-dd');
  const todaysBatch = await AssignmentBatch.findOne({ date: todaysDate, status: 'In Progress' });

  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const incompleteYesterdayAssignment = await UserAssignment.findOne({ user: user._id, date: yesterdayDate, status: 'InProgress' }).populate('batch');

  let carriedOverTasks = [];
  if (incompleteYesterdayAssignment?.batch?.links) {
    const completedLinksYesterday = new Set(incompleteYesterdayAssignment.completedTasks.map(t => t.link));
    carriedOverTasks = incompleteYesterdayAssignment.batch.links
      .filter(link => !completedLinksYesterday.has(link.url))
      .map((link, index) => ({
        id: `carryover-${index}`,
        title: `Carried Over Task #${index + 1}`,
        youtubeUrl: link.url,
        type: link.type,
        status: 'pending',
        isCarryOver: true
      }));
  }

  let todaysTasks = [];
  let userAssignment = null;
  if (todaysBatch) {
    userAssignment = await UserAssignment.findOne({ user: user._id, date: todaysDate });
    if (!userAssignment) {
      userAssignment = await UserAssignment.create({
        user: user._id,
        batch: todaysBatch._id,
        date: todaysDate,
        completedTasks: [],
        totalTasks: todaysBatch.links.length
      });
    }

    const completedTodaysLinks = new Set(userAssignment.completedTasks.map(t => t.link));
    todaysTasks = todaysBatch.links.map((link, index) => ({
      id: `${todaysBatch._id}-${index}`,
      title: `Today's Task #${index + 1}`,
      youtubeUrl: link.url,
      type: link.type,
      status: completedTodaysLinks.has(link.url) ? 'completed' : 'pending',
      isCarryOver: false
    }));
  }

  const allTasks = [...carriedOverTasks, ...todaysTasks];
  const completedCount = allTasks.filter(t => t.status === 'completed').length;
  const response = { assignments: allTasks, completedCount, totalCount: allTasks.length };

  return res.status(200).json(new ApiResponse(200, response, "Assignments fetched successfully."));
});

const completeTask = asyncHandler(async (req, res) => {
  const { link, isCarryOver } = req.body;

  if (!link) {
    throw new ApiError(400, "Link is required.");
  }

  const todaysDate = format(new Date(), 'yyyy-MM-dd');
  const dateToUpdate = isCarryOver
    ? format(subDays(new Date(), 1), 'yyyy-MM-dd')
    : todaysDate;

  const userAssignment = await UserAssignment.findOne({
    user: req.user._id,
    date: dateToUpdate
  });

  if (!userAssignment) {
    throw new ApiError(404, "Assignment not found for the specified date.");
  }

  const alreadyCompleted = userAssignment.completedTasks.some(task => task.link === link);
  if (alreadyCompleted) {
    return res.status(200).json(new ApiResponse(200, { reward: null, link }, "Task already completed."));
  }

  userAssignment.completedTasks.push({ link });

  const uniqueCompletedLinks = [...new Set(userAssignment.completedTasks.map(task => task.link))];
  const isFullyComplete = uniqueCompletedLinks.length === userAssignment.totalTasks;

  if (isFullyComplete && userAssignment.status !== 'Completed') {
    userAssignment.status = 'Completed';
    await ComplianceRecord.create({
        user: req.user._id,
        type: "Daily Assignment",
        status: "Pass",
        severity: "info",
        details: `Successfully completed all tasks for ${userAssignment.date}.`,
    });
  }

  await userAssignment.save();
  await updateBatchCompletion(userAssignment.batch);

  let reward = null;

  const hasPending = await UserAssignment.findOne({
    user: req.user._id,
    status: 'InProgress'
  });

  if (!hasPending) {
    const user = await User.findById(req.user._id);
    reward = { aiVideoUnlocked: false, assignedVideo: null };

    const todayDate = new Date().getDate();
    const isOddDay = todayDate % 2 !== 0;

    if (isFullyComplete && isOddDay) {
      const video = await AiVideo.findOne({ status: 'Available', topic: user.selectedTopic });
      if (video) {
        video.status = 'Assigned';
        video.assignedTo = user._id;
        await video.save();

        reward.aiVideoUnlocked = true;
        reward.assignedVideo = video;
      }
    }
  }

  return res.status(200).json(new ApiResponse(200, { link, reward }, "Task marked as complete."));
});

export { getTodaysAssignments, completeTask };