import mongoose, { Schema } from 'mongoose';

const topicSchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Topic = mongoose.model("Topic", topicSchema);