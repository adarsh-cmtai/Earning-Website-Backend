import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { AiVideo } from "../../models/aiVideoModel.js";
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

const assignLinksToUser = asyncHandler(async (req, res) => {
    const { userId, date, shortLinks, longLinks } = req.body;

    if (!userId || !date) {
        throw new ApiError(400, "User ID and date are required.");
    }
    
    const formattedShortLinks = shortLinks.map((url) => ({ url, type: 'Short' }));
    const formattedLongLinks = longLinks.map((url) => ({ url, type: 'Long' }));
    const allLinks = [...formattedShortLinks, ...formattedLongLinks];

    if (allLinks.length === 0) {
        throw new ApiError(400, "At least one link is required for assignment.");
    }
    
    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found.");
    }

    const userAssignment = await UserAssignment.findOneAndUpdate(
        { user: userId, date: date },
        { 
            $set: { 
                links: allLinks,
                totalTasks: allLinks.length,
                status: 'InProgress',
                completedTasks: []
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await logActivity({
        admin: req.user,
        actionType: 'UserAssignmentCreated',
        targetUser: user.email,
        details: `Assigned ${allLinks.length} links to ${user.email} for date ${date}.`,
        status: 'success'
    });

    return res.status(201).json(new ApiResponse(201, userAssignment, "Assignments created for user successfully."));
});

const assignLinksToUserCSV = asyncHandler(async (req, res) => {
    const { userId, date } = req.body;
    if (!req.file) { throw new ApiError(400, "CSV file is required."); }
    if (!userId || !date) { throw new ApiError(400, "User ID and date are required."); }

    const user = await User.findById(userId);
    if (!user) { throw new ApiError(404, "User not found."); }

    const links = [];
    const readableStream = Readable.from(req.file.buffer.toString('utf8'));

    await new Promise((resolve, reject) => {
        readableStream
            .pipe(csv({ headers: ['url', 'type'], skipLines: 0 }))
            .on('data', (row) => {
                const type = row.type?.trim();
                if (row.url && row.url.trim().startsWith('http') && (type === 'Short' || type === 'Long')) {
                    links.push({ url: row.url.trim(), type });
                }
            })
            .on('end', resolve)
            .on('error', reject);
    });

    if (links.length === 0) {
        throw new ApiError(400, "No valid URLs with types found in the CSV file.");
    }
    
    const userAssignment = await UserAssignment.findOneAndUpdate(
        { user: userId, date: date },
        {
            $set: {
                links: links,
                totalTasks: links.length,
                status: 'InProgress',
                completedTasks: []
            }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    
    await logActivity({
        admin: req.user,
        actionType: 'UserAssignmentCreatedCSV',
        targetUser: user.email,
        details: `Assigned ${links.length} links via CSV to ${user.email} for date ${date}.`,
        status: 'success'
    });

    return res.status(201).json(new ApiResponse(201, userAssignment, "CSV assignments created for user successfully."));
});

const getAssignmentsForUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { date } = req.query;
    
    const query = { user: userId };
    if (date) {
        query.date = date;
    }
    
    const assignments = await UserAssignment.find(query).sort({ date: -1 });
    
    return res.status(200).json(new ApiResponse(200, assignments, "User assignments fetched successfully."));
});

export { 
    uploadAiVideo, 
    getAiVideos, 
    deleteAiVideo, 
    allocateAiVideos,
    assignLinksToUser,
    assignLinksToUserCSV,
    getAssignmentsForUser
};
