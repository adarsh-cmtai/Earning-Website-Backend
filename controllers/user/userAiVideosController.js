import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { AiVideo } from "../../models/aiVideoModel.js";
import { User } from "../../models/user.model.js";
import { UserAssignment } from "../../models/userAssignmentModel.js";
import { ApiError } from "../../utils/ApiError.js";

const getAiVideosData = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const user = await User.findById(userId).select("channelName selectedTopic");

    const hasPendingAssignments = await UserAssignment.findOne({
        user: userId,
        status: 'InProgress'
    });

    const canDownload = !hasPendingAssignments;

    const assignedVideo = await AiVideo.findOne({ assignedTo: userId, status: 'Assigned' });
    
    const availableVideos = canDownload 
        ? await AiVideo.find({ status: 'Available', topic: user.selectedTopic, assignedTo: null })
        : [];

    const videoHistory = await AiVideo.find({ assignedTo: userId, status: 'Downloaded' }).sort({ updatedAt: -1 });
    
    const response = {
        assignedVideo,
        availableVideos,
        videoHistory,
        channelName: user.channelName,
        canDownload,
    };

    return res.status(200).json(new ApiResponse(200, response, "AI Videos data fetched successfully."));
});

const markVideoAsDownloaded = asyncHandler(async (req, res) => {
    const { videoId } = req.body;
    const userId = req.user._id;

    if (!videoId) { throw new ApiError(400, "Video ID is required."); }
    
    const hasPendingAssignments = await UserAssignment.findOne({ user: userId, status: 'InProgress' });
    if (hasPendingAssignments) {
        throw new ApiError(403, "Complete all pending assignments before downloading a new video.");
    }

    const video = await AiVideo.findById(videoId);
    if (!video) { throw new ApiError(404, "Video not found."); }
    
    if (video.status === 'Assigned' && video.assignedTo.toString() !== userId.toString()) {
        throw new ApiError(403, "This video is assigned to another user.");
    }

    if (video.status === 'Available' || (video.status === 'Assigned' && video.assignedTo.toString() === userId.toString())) {
        video.status = 'Downloaded';
        video.assignedTo = userId;
        await video.save();
        return res.status(200).json(new ApiResponse(200, video, "Video marked as downloaded."));
    }
    
    throw new ApiError(400, "Video cannot be downloaded in its current state.");
});

export { getAiVideosData, markVideoAsDownloaded };