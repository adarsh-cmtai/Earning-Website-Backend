import mongoose, { Schema } from 'mongoose';

const contentSchema = new Schema({
    contentType: { 
        type: String, 
        required: true, 
        unique: true, 
        enum: ['terms', 'privacy', 'faq', 'tutorial'] 
    },
    content: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });

export const Content = mongoose.model("Content", contentSchema);