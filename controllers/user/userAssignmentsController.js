import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { User } from "../../models/user.model.js";
import { AiVideo } from "../../models/aiVideoModel.js";
import { ComplianceRecord } from "../../models/complianceRecordModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { format, subDays } from 'date-fns';

const getTodaysAssignments = asyncHandler(async (req, res) => {
  const user = req.user;
  const todaysDate = format(new Date(), 'yyyy-MM-dd');
  const yesterdayDate = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const todaysAssignment = await UserAssignment.findOne({ user: user._id, date: todaysDate });
  const yesterdayAssignment = await UserAssignment.findOne({ user: user._id, date: yesterdayDate });

  let carriedOverTasks = [];
  if (yesterdayAssignment && yesterdayAssignment.status === 'InProgress') {
    const completedLinksYesterday = new Set(yesterdayAssignment.completedTasks.map(t => t.link));
    carriedOverTasks = yesterdayAssignment.links
      .filter(link => !completedLinksYesterday.has(link.url))
      .map((link, index) => ({
        id: `carryover-${yesterdayAssignment._id}-${index}`,
        title: `Carried Over Task #${index + 1}`,
        youtubeUrl: link.url,
        type: link.type,
        status: 'pending',
        isCarryOver: true
      }));
  }

  let todaysTasks = [];
  if (todaysAssignment) {
    const completedTodaysLinks = new Set(todaysAssignment.completedTasks.map(t => t.link));
    todaysTasks = todaysAssignment.links.map((link, index) => ({
      id: `${todaysAssignment._id}-${index}`,
      title: `Today's Task #${index + 1}`,
      youtubeUrl: link.url,
      type: link.type,
      status: completedTodaysLinks.has(link.url) ? 'completed' : 'pending',
      isCarryOver: false
    }));
  }

  const allTasks = [...carriedOverTasks, ...todaysTasks];
  const completedCount = allTasks.filter(t => t.status === 'completed').length;

  const response = {
    assignments: allTasks,
    completedCount,
    totalCount: allTasks.length
  };

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

  const uniqueCompletedLinks = new Set(userAssignment.completedTasks.map(task => task.link));
  const isFullyComplete = uniqueCompletedLinks.size === userAssignment.totalTasks;

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

  let reward = null;
  const hasPending = await UserAssignment.findOne({
    user: req.user._id,
    status: 'InProgress'
  });

  if (isFullyComplete && !hasPending) {
    const user = await User.findById(req.user._id);
    reward = { aiVideoUnlocked: false, assignedVideo: null };

    const todayDate = new Date().getDate();
    const isOddDay = todayDate % 2 !== 0;

    if (isOddDay) {
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
