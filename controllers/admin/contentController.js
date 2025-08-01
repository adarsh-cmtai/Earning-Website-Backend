import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Content } from "../../models/contentModel.js";
import { ApiError } from "../../utils/ApiError.js";
import mongoose from "mongoose";

const getContent = asyncHandler(async (req, res) => {
    const contentTypes = ['terms', 'privacy', 'faq', 'tutorial'];
    const contentPromises = contentTypes.map(type => 
        Content.findOne({ contentType: type })
    );
    const results = await Promise.all(contentPromises);
    
    const content = {
        terms: results[0]?.content || '',
        privacy: results[1]?.content || '',
        faq: results[2]?.content || [],
        tutorial: results[3]?.content || [],
    };

    return res.status(200).json(new ApiResponse(200, content, "Content fetched successfully."));
});

const updateContent = asyncHandler(async (req, res) => {
    const { contentType, content } = req.body;
    if (!contentType || content === undefined) {
        throw new ApiError(400, "Content type and content are required.");
    }

    const updatedContent = await Content.findOneAndUpdate(
        { contentType },
        { content },
        { new: true, upsert: true }
    );

    return res.status(200).json(new ApiResponse(200, updatedContent, `${contentType} content updated successfully.`));
});

const addListItem = asyncHandler(async (req, res) => {
    const { contentType } = req.params;
    const itemData = req.body;
    
    if (contentType === 'faq' && (!itemData.question || !itemData.answer || !itemData.category)) {
        throw new ApiError(400, "Question, answer, and category are required for FAQs.");
    }
    
    itemData._id = new mongoose.Types.ObjectId();

    const updatedContent = await Content.findOneAndUpdate(
        { contentType },
        { $push: { content: itemData } },
        { new: true, upsert: true }
    );
    return res.status(201).json(new ApiResponse(201, updatedContent, "Item added successfully."));
});

const updateListItem = asyncHandler(async (req, res) => {
    const { contentType, itemId } = req.params;
    const itemData = req.body;
    
    const contentDoc = await Content.findOne({ contentType });
    if (!contentDoc) { throw new ApiError(404, "Content not found."); }
    
    const itemIndex = contentDoc.content.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) { throw new ApiError(404, "Item not found."); }
    
    const existingItem = contentDoc.content[itemIndex];
    contentDoc.content[itemIndex] = { ...existingItem.toObject(), ...itemData };
    
    await contentDoc.save();

    return res.status(200).json(new ApiResponse(200, contentDoc, "Item updated successfully."));
});

const deleteListItem = asyncHandler(async (req, res) => {
    const { contentType, itemId } = req.params;
    
    const updatedContent = await Content.findOneAndUpdate(
        { contentType },
        { $pull: { content: { _id: new mongoose.Types.ObjectId(itemId) } } },
        { new: true }
    );
    return res.status(200).json(new ApiResponse(200, updatedContent, "Item deleted successfully."));
});

export { getContent, updateContent, addListItem, updateListItem, deleteListItem };