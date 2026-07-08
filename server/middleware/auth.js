import jwt from "jsonwebtoken";
import User from "../models/Users.js";

/**
 * Middleware to protect routes.
 * Reads a JWT from the "token" request header, verifies it,
 * and attaches the user document to req.user.
 */
export const protectRoute = async (req, res, next) => {
    try {
        const token = req.headers.token;

        if (!token) {
            return res
                .status(401)
                .json({ success: false, message: "No token provided. Please log in." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res
                .status(401)
                .json({ success: false, message: "User no longer exists." });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("protectRoute error:", error.message);
        res.status(401).json({ success: false, message: "Invalid or expired token." });
    }
};
