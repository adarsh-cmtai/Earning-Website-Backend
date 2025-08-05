import mongoose, { Schema } from 'mongoose';

const linkSchema = new Schema({
    url: { type: String, required: true },
    type: { type: String, enum: ['Short', 'Long'], required: true }
}, { _id: false });

const userAssignmentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    links: [linkSchema],
    completedTasks: [{
        link: String,
        completedAt: { type: Date, default: Date.now }
    }],
    totalTasks: { type: Number, required: true },
    status: { type: String, enum: ['InProgress', 'Completed'], default: 'InProgress' }
}, { timestamps: true });

userAssignmentSchema.index({ user: 1, date: 1 }, { unique: true });

export const UserAssignment = mongoose.model("UserAssignment", userAssignmentSchema);
