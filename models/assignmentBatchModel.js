import mongoose, { Schema } from 'mongoose';

const linkSchema = new Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['Short', 'Long'], required: true }
}, { _id: false });

const assignmentBatchSchema = new Schema({
    date: { type: String, required: true, unique: true },
    links: [linkSchema],
    totalLinks: { type: Number, default: 0 },
    status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
    completionRate: { type: Number, default: 0 },
    nonCompliantUsers: { type: Number, default: 0 },
}, { timestamps: true });

export const AssignmentBatch = mongoose.model("AssignmentBatch", assignmentBatchSchema);