import mongoose, { Schema } from 'mongoose';

const aiVideoSchema = new Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, default: 'Upload this video to your YouTube channel to complete your task!' },
    topic: { type: String, required: true },
    type: { type: String, enum: ['Short', 'Long'], required: true },
    status: { type: String, enum: ['Available', 'Assigned', 'Downloaded'], default: 'Available' },
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

export const AiVideo = mongoose.model("AiVideo", aiVideoSchema);