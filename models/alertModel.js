import mongoose, { Schema } from 'mongoose';

const alertSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['error', 'warning', 'info', 'system'], required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['active', 'resolved', 'read'], default: 'active' },
}, { timestamps: true });

export const Alert = mongoose.model("Alert", alertSchema);