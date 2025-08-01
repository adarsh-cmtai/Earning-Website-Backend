import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Topic } from "../../models/topicModel.js";
import { ApiError } from "../../utils/ApiError.js";

const getAllTopics = asyncHandler(async (req, res) => {
    const topics = await Topic.find({});
    return res.status(200).json(new ApiResponse(200, topics, "Topics fetched successfully."));
});

const createTopic = asyncHandler(async (req, res) => {
    const { name } = req.body;
    if (!name) { throw new ApiError(400, "Topic name is required."); }
    const existingTopic = await Topic.findOne({ name });
    if (existingTopic) { throw new ApiError(409, "This topic already exists."); }
    const topic = await Topic.create({ name });
    return res.status(201).json(new ApiResponse(201, topic, "Topic created successfully."));
});

const deleteTopic = asyncHandler(async (req, res) => {
    const { topicId } = req.params;
    const topic = await Topic.findByIdAndDelete(topicId);
    if (!topic) { throw new ApiError(404, "Topic not found."); }
    return res.status(200).json(new ApiResponse(200, { _id: topicId }, "Topic deleted successfully."));
});

export { getAllTopics, createTopic, deleteTopic };