import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { User } from "../../models/user.model.js";
import { ApiError } from "../../utils/ApiError.js";

const saveTopic = asyncHandler(async (req, res) => {
    const { topic } = req.body;
    if (!topic) {
        throw new ApiError(400, "Topic is required.");
    }
    const user = await User.findByIdAndUpdate(req.user._id, { selectedTopic: topic }, { new: true });
    return res.status(200).json(new ApiResponse(200, { selectedTopic: user.selectedTopic }, "Topic saved successfully."));
});

const saveChannelName = asyncHandler(async (req, res) => {
    const { channelName } = req.body;
    if (!channelName) {
        throw new ApiError(400, "Channel name is required.");
    }
    const user = await User.findByIdAndUpdate(req.user._id, { channelName: channelName, youtubeStatus: 'Pending' }, { new: true });
    return res.status(200).json(new ApiResponse(200, { channelName: user.channelName, youtubeStatus: user.youtubeStatus }, "Channel name saved successfully."));
});

export { saveTopic, saveChannelName };