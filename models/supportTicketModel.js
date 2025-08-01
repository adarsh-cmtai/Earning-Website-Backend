import mongoose, { Schema } from 'mongoose';

const responseSchema = new Schema({
    responder: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
}, { timestamps: true });

const supportTicketSchema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    category: { 
        type: String, 
        enum: ['payment', 'assignment', 'ai-video', 'referral', 'account', 'technical', 'other'],
        required: true 
    },
    message: { type: String, required: true },
    status: { type: String, enum: ['Open', 'Answered', 'Closed'], default: 'Open' },
    responses: [responseSchema]
}, { timestamps: true });

export const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);