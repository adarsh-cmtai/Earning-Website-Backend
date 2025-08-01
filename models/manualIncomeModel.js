import mongoose, { Schema } from 'mongoose';

const manualIncomeSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    screenshotUrl: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Declined'], default: 'Pending' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewComment: { type: String }
}, { timestamps: true });

manualIncomeSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

export const ManualIncome = mongoose.model("ManualIncome", manualIncomeSchema);