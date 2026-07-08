import jwt from "jsonwebtoken";

// Generate a signed JWT for the given userId (expires in 7 days)
export const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};
