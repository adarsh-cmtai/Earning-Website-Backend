import { ApiError } from "../utils/ApiError.js";

export const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            throw new ApiError(401, "Authentication required.");
        }
        if (req.user.role !== 'admin') {
            throw new ApiError(403, "Forbidden: Access denied.");
        }
        if (req.user.adminRole === 'SUPER_ADMIN' || allowedRoles.includes(req.user.adminRole)) {
            next();
        } else {
            throw new ApiError(403, "Forbidden: You do not have the required permissions for this action.");
        }
    };
};