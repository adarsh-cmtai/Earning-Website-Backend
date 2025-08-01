import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const userSchema = new Schema({
    fullName: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, trim: true },
    password: { type: String },
    status: { type: String, enum: ['Approved', 'Suspended'], default: 'Approved' },
    
    selectedTopic: { type: String, default: '' },
    channelName: { type: String, default: '' },

    youtubeChannelUrl: { type: String, default: '' },
    youtubeStatus: { type: String, enum: ["Verified", "Pending", "Declined", "Not Linked"], default: 'Not Linked' },
    upiName: { type: String, trim: true },
    upiId: { type: String, trim: true },
    
    totalEarnings: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    pendingPayout: { type: Number, default: 0 },
    platformContributionDue: { type: Number, default: 0 },
    suggestedContributionPercentage: { type: Number, default: 10 },
    lastContributionDate: { type: Date },
    contributionStatus: { type: String, enum: ["Paid", "Pending", "Overdue"], default: "Pending" },
    incomeStatus: { type: String, enum: ["Active", "Suspended"], default: "Active" },

    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    adminRole: { type: String, enum: ['USER_MANAGER', 'TECHNICIAN', 'FINANCE', 'CONTENT_MANAGER', 'SUPER_ADMIN'] },
    referralId: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    emailOtp: String, emailOtpExpiry: Date, isEmailVerified: { type: Boolean, default: false },
    mobileOtp: String, mobileOtpExpiry: Date, isMobileVerified: { type: Boolean, default: false },
    refreshToken: { type: String },
    tokensVersion: { type: Number, default: 0 },

    notificationPreferences: {
        email: { type: Boolean, default: true },
        inApp: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        marketing: { type: Boolean, default: true },
    },
    activeSessions: [{
        deviceId: String,
        deviceName: String,
        ipAddress: String,
        lastActive: Date,
    }],
    passwordResetOtp: String,
    passwordResetOtpExpiry: Date,
    refreshToken: { type: String }
}, { timestamps: true });

userSchema.pre("save", async function (next) { if (this.isModified("password") && this.password) { this.password = await bcrypt.hash(this.password, 10); } if (this.isNew) { this.referralId = `UEIEP-${randomBytes(4).toString('hex').toUpperCase()}`; } next(); });
userSchema.methods.isPasswordCorrect = async function(password){ if (!password || !this.password) return false; return await bcrypt.compare(password, this.password); };
userSchema.methods.generateAccessToken = function(){ return jwt.sign({ _id: this._id, email: this.email, fullName: this.fullName, role: this.role, version: this.tokensVersion }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY }); };
userSchema.methods.generateRefreshToken = function(){ return jwt.sign({ _id: this._id }, process.env.JWT_SECRET, { expiresIn: '10d' }); };

export const User = mongoose.model("User", userSchema); 