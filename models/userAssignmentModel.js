import mongoose, { Schema } from 'mongoose';

const userAssignmentSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    batch: { type: Schema.Types.ObjectId, ref: 'AssignmentBatch', required: true },
    date: { type: String, required: true },
    completedTasks: [{
        link: String,
        completedAt: { type: Date, default: Date.now }
    }],
    totalTasks: { type: Number, required: true },
    status: { type: String, enum: ['InProgress', 'Completed'], default: 'InProgress' }
}, { timestamps: true });

userAssignmentSchema.index({ user: 1, date: 1 }, { unique: true });

export const UserAssignment = mongoose.model("UserAssignment", userAssignmentSchema);