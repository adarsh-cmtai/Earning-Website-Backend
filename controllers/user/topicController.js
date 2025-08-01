import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Topic } from "../../models/topicModel.js";

const getActiveTopics = asyncHandler(async (req, res) => {
    const topics = await Topic.find({ isActive: true }).select("name");
    
    if (topics.length === 0) {
        const defaultTopics = ["Motivation", "Technology", "Finance", "Health", "Gaming", "Education", "Travel", "Cooking", "Fitness", "Lifestyle", "Comedy", "Music", "Art", "DIY", "History"];
        await Topic.insertMany(defaultTopics.map(name => ({ name })));
        const newTopics = await Topic.find({ isActive: true }).select("name");
        return res.status(200).json(new ApiResponse(200, newTopics, "Topics fetched."));
    }

    return res.status(200).json(new ApiResponse(200, topics, "Topics fetched successfully."));
});

export { getActiveTopics };