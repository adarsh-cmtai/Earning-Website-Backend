import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { SupportTicket } from "../../models/supportTicketModel.js";
import { ApiError } from "../../utils/ApiError.js";
import { logActivity } from "../../services/activityLogger.js";

const getAllTickets = asyncHandler(async (req, res) => {
    const { status = 'Open' } = req.query;
    const tickets = await SupportTicket.find({ status })
        .populate('user', 'fullName email')
        .sort({ createdAt: -1 });
    return res.status(200).json(new ApiResponse(200, tickets, "Support tickets fetched."));
});

const getTicketById = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const ticket = await SupportTicket.findById(ticketId)
        .populate('user', 'fullName email')
        .populate('responses.responder', 'fullName email adminRole');
    if (!ticket) {
        throw new ApiError(404, "Ticket not found.");
    }
    return res.status(200).json(new ApiResponse(200, ticket, "Ticket details fetched."));
});

const addResponseToTicket = asyncHandler(async (req, res) => {
    const { ticketId } = req.params;
    const { message } = req.body;

    if (!message) {
        throw new ApiError(400, "Response message is required.");
    }

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
        throw new ApiError(404, "Ticket not found.");
    }

    const response = {
        responder: req.user._id,
        message: message,
    };

    ticket.responses.push(response);
    ticket.status = 'Answered';
    await ticket.save();

    await logActivity({
        admin: req.user,
        actionType: 'SupportTicketResponse',
        details: `Responded to ticket #${ticket._id.toString().slice(-6)}`,
        status: 'success'
    });

    const updatedTicket = await SupportTicket.findById(ticketId)
        .populate('user', 'fullName email')
        .populate('responses.responder', 'fullName email adminRole');

    return res.status(200).json(new ApiResponse(200, updatedTicket, "Response added successfully."));
});

export { getAllTickets, getTicketById, addResponseToTicket };