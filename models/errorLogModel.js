import mongoose, { Schema } from 'mongoose';

const errorLogSchema = new Schema({
    errorCode: { type: Number, required: true },
    errorMessage: { type: String, required: true },
    stackTrace: { type: String, required: true },
    route: { type: String },
}, { timestamps: true });

export const ErrorLog = mongoose.model("ErrorLog", errorLogSchema);