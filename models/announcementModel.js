import mongoose, { Schema } from 'mongoose';

const announcementSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ['info', 'warning', 'update'], default: 'info' },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

export const Announcement = mongoose.model("Announcement", announcementSchema);