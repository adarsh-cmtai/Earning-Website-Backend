import mongoose, { Schema } from 'mongoose';

const contributionSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paymentId: { type: String, required: true },
    status: { type: String, enum: ['Success', 'Failed'], default: 'Success' },
    period: { type: String, required: true } 
}, { timestamps: true });

export const Contribution = mongoose.model("Contribution", contributionSchema);