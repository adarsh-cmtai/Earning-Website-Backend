import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { Content } from "../../models/contentModel.js";

const getPublicContent = asyncHandler(async (req, res) => {
    const contentTypes = ['faq', 'terms', 'privacy'];
    const promises = contentTypes.map(type => Content.findOne({ contentType: type }));
    const results = await Promise.all(promises);

    const publicContent = {
        faq: results[0]?.content || [],
        terms: results[1]?.content || '',
        privacy: results[2]?.content || '',
    };
    
    return res.status(200).json(new ApiResponse(200, publicContent, "Public content fetched successfully."));
});

export { getPublicContent };