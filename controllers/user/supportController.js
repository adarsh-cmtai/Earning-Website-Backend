import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { SupportTicket } from "../../models/supportTicketModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { sendEmail } from "../../services/emailService.js";

const createSupportTicket = asyncHandler(async (req, res) => {
    const { subject, category, message } = req.body;
    const userId = req.user._id;

    if (!subject || !category || !message) {
        throw new ApiError(400, "Subject, category, and message are all required.");
    }

    const ticket = await SupportTicket.create({
        user: userId,
        subject,
        category,
        message
    });

    try {
        await sendEmail({
            to: process.env.ADMIN_SUPPORT_EMAIL,
            subject: `New Support Ticket [#${ticket._id.toString().slice(-6)}]: ${subject}`,
            html: `<h1>New Ticket Received</h1>
                   <p><strong>User:</strong> ${req.user.email}</p>
                   <p><strong>Category:</strong> ${category}</p>
                   <p><strong>Subject:</strong> ${subject}</p>
                   <p><strong>Message:</strong></p>
                   <p>${message}</p>
                   <p>Respond via the admin dashboard.</p>`
        });
    } catch (emailError) {
        console.error("Failed to send ticket notification email:", emailError);
    }

    return res.status(201).json(new ApiResponse(201, ticket, "Support ticket created successfully."));
});

const getUserTickets = asyncHandler(async (req, res) => {
    const tickets = await SupportTicket.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .populate('responses.responder', 'fullName role');
    return res.status(200).json(new ApiResponse(200, tickets, "User support tickets fetched successfully."));
});

export { createSupportTicket, getUserTickets };