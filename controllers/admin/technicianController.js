import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AiVideo } from "../../models/aiVideoModel.js";
import { AssignmentBatch } from "../../models/assignmentBatchModel.js";
import { User } from "../../models/user.model.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { logActivity } from "../../services/activityLogger.js";
import { deleteFileFromS3 } from "../../services/s3Service.js";
import csv from 'csv-parser';
import { Readable } from 'stream';

const allocateAiVideos = asyncHandler(async (req, res) => {
    const availableVideos = await AiVideo.find({ status: 'Available' });
    if (availableVideos.length === 0) {
        throw new ApiError(404, "No available videos to allocate.");
    }
    
    const currentlyAssignedUserIds = await AiVideo.distinct('assignedTo', { status: 'Assigned', assignedTo: { $ne: null } });

    const eligibleUsers = await User.find({
        role: 'user',
        status: 'Approved',
        youtubeStatus: 'Verified',
        selectedTopic: { $ne: '', $exists: true },
        _id: { $nin: currentlyAssignedUserIds }
    }).select('_id selectedTopic');

    if (eligibleUsers.length === 0) {
        throw new ApiError(404, "No eligible users need a video assignment right now.");
    }

    let allocationCount = 0;
    const allocationPromises = [];
    
    const usersByTopic = new Map();
    for (const user of eligibleUsers) {
        if (!usersByTopic.has(user.selectedTopic)) {
            usersByTopic.set(user.selectedTopic, []);
        }
        usersByTopic.get(user.selectedTopic).push(user);
    }

    for (const video of availableVideos) {
        const potentialUsers = usersByTopic.get(video.topic);
        
        if (potentialUsers && potentialUsers.length > 0) {
            const userToAssign = potentialUsers.shift();
            
            video.status = 'Assigned';
            video.assignedTo = userToAssign._id;
            allocationPromises.push(video.save());
            allocationCount++;
            
            if (potentialUsers.length === 0) {
                usersByTopic.delete(video.topic);
            }
        }
    }

    await Promise.all(allocationPromises);

    await logActivity({
        admin: req.user,
        actionType: 'AIVideoAllocated',
        details: `Allocated ${allocationCount} videos to users based on topic preference.`,
        status: 'success'
    });

    return res.status(200).json(new ApiResponse(200, { allocationCount }, `${allocationCount} videos have been successfully allocated.`));
});

const getNonCompliantUsers = asyncHandler(async (req, res) => {
  const { batchId } = req.params;

  const batch = await AssignmentBatch.findById(batchId);
  if (!batch) {
    throw new ApiError(404, "Assignment batch not found.");
  }

  const userAssignments = await UserAssignment.find({
    batch: batchId,
    status: 'InProgress',
  }).populate('user', 'email');

  const nonCompliantUsers = userAssignments.map((ua) => {
    const uniqueCompletedLinks = [...new Set(ua.completedTasks.map(task => task.link))];
    return {
      _id: ua.user._id,
      email: ua.user.email,
      tasksAssigned: ua.totalTasks,
      tasksCompleted: uniqueCompletedLinks.length,
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, nonCompliantUsers, "Non-compliant users fetched successfully."));
});



const distributeAssignments = asyncHandler(async (req, res) => {
    const { batchId } = req.params;
    const batch = await AssignmentBatch.findById(batchId);
    if (!batch) { throw new ApiError(404, "Assignment batch not found."); }
    if (batch.status !== 'Pending') { throw new ApiError(400, "This batch has already been distributed."); }
    const activeUsers = await User.find({ status: 'Approved', role: 'user' });
    const userAssignmentPromises = activeUsers.map(user => {
        return UserAssignment.updateOne({ user: user._id, date: batch.date }, { $setOnInsert: { user: user._id, batch: batch._id, date: batch.date, totalTasks: batch.links.length, completedTasks: [] } }, { upsert: true });
    });
    await Promise.all(userAssignmentPromises);
    batch.status = 'In Progress';
    await batch.save();
    await logActivity({ admin: req.user, actionType: 'AssignmentDistributed', details: `Distributed ${batch.links.length} links to ${activeUsers.length} users for ${batch.date}`, status: 'success' });
    return res.status(200).json(new ApiResponse(200, batch, "Assignments distributed successfully."));
});

const uploadAiVideo = asyncHandler(async (req, res) => {
    const { title, topic, type } = req.body;
    if (!req.file) { throw new ApiError(400, "Video file is required."); }
    if (!title || !topic || !type) { throw new ApiError(400, "Title, topic, and type are required."); }
    const video = await AiVideo.create({ title, topic, type, fileUrl: req.file.location, fileName: req.file.key });
    await logActivity({ admin: req.user, actionType: 'AIVideoUploaded', details: `Uploaded video: ${title}`, status: 'success' });
    return res.status(201).json(new ApiResponse(201, video, "AI Video uploaded successfully."));
}); 

const getAiVideos = asyncHandler(async (req, res) => {
    const videos = await AiVideo.find({}).sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, videos, "AI videos fetched."));
});

const deleteAiVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const video = await AiVideo.findById(videoId);
    if (!video) { throw new ApiError(404, "Video not found."); }
    await deleteFileFromS3(video.fileName);
    await AiVideo.findByIdAndDelete(videoId);
    await logActivity({ admin: req.user, actionType: 'AIVideoDeleted', details: `Deleted video: ${video.title}`, status: 'warning' });
    return res.status(200).json(new ApiResponse(200, { _id: videoId }, "Video deleted successfully."));
});

const uploadAssignmentLinks = asyncHandler(async (req, res) => {
    const { date, links } = req.body;
    if (!date || !links || !Array.isArray(links) || links.length === 0) { throw new ApiError(400, "Date and a non-empty array of links are required."); }
    
    const existingBatch = await AssignmentBatch.findOne({ date });
    if (existingBatch) { throw new ApiError(409, `A batch for ${date} already exists.`); }

    const batch = await AssignmentBatch.create({ date, links, totalLinks: links.length });
    await logActivity({ admin: req.user, actionType: 'AssignmentLinksUploaded', details: `Uploaded ${links.length} links for ${date}`, status: 'success' });
    
    return res.status(201).json(new ApiResponse(201, batch, "Assignment links uploaded successfully."));
});

const uploadAssignmentCsv = asyncHandler(async (req, res) => {
    if (!req.file) { throw new ApiError(400, "CSV file is required."); }
    const { date } = req.body;
    if (!date) { throw new ApiError(400, "Date is required."); }

    const existingBatch = await AssignmentBatch.findOne({ date });
    if (existingBatch) { throw new ApiError(409, `A batch for the date ${date} already exists.`); }

    const links = [];
    const readableStream = Readable.from(req.file.buffer.toString('utf8'));

    await new Promise((resolve, reject) => {
        readableStream
            .pipe(csv({ headers: ['url', 'type'], skipLines: 1 }))
            .on('data', (row) => {
                const type = row.type?.trim();
                if (row.url && row.url.trim().startsWith('http') && (type === 'Short' || type === 'Long')) {
                    links.push({ url: row.url.trim(), type });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (links.length === 0) { throw new ApiError(400, "No valid URLs with types found in the CSV file."); }
    const batch = await AssignmentBatch.create({ date, links, totalLinks: links.length });
    await logActivity({ admin: req.user, actionType: 'AssignmentCsvUploaded', details: `Uploaded ${links.length} links via CSV for ${date}`, status: 'success' });
    return res.status(201).json(new ApiResponse(201, batch, "Assignment links from CSV uploaded successfully."));
});


const getAssignmentBatches = asyncHandler(async (req, res) => {
    const batches = await AssignmentBatch.find({}).sort({ date: -1 });
    return res.status(200).json(new ApiResponse(200, batches, "Assignment batches fetched."));
});

export { 
    uploadAiVideo, 
    getAiVideos, 
    deleteAiVideo, 
    allocateAiVideos,
    uploadAssignmentLinks, 
    uploadAssignmentCsv,
    getAssignmentBatches, 
    getNonCompliantUsers, 
    distributeAssignments 
};