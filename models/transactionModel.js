import mongoose, { Schema } from 'mongoose';

const transactionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['Credit', 'Withdrawal', 'Contribution'], required: true },
    category: { type: String, enum: ['Assignment', 'Referral', 'YouTube', 'Payout', 'Bonus', 'Platform Fee'], required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['Completed', 'Pending', 'Failed'], default: 'Completed' },
    description: { type: String, required: true },
}, { timestamps: true });

export const Transaction = mongoose.model("Transaction", transactionSchema);