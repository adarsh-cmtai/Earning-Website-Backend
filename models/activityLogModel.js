import mongoose, { Schema } from 'mongoose';

const activityLogSchema = new Schema({
    admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    adminEmail: { type: String, required: true },
    actionType: { type: String, required: true },
    targetUser: { type: String, default: null },
    details: { type: String, required: true },
    status: { type: String, enum: ['success', 'warning', 'error'], required: true },
}, { timestamps: true });

export const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);