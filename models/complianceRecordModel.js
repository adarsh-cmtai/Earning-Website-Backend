import mongoose, { Schema } from 'mongoose';

const complianceRecordSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    status: { type: String, enum: ['Pass', 'Warning', 'Fail'], required: true },
    severity: { type: String, enum: ['info', 'warning', 'error'], required: true },
    details: { type: String, required: true },
    actionTaken: { type: String, default: 'None' },
}, { timestamps: true });

export const ComplianceRecord = mongoose.model("ComplianceRecord", complianceRecordSchema);