import { generateToken } from "../lib/utils.js";
import User from "../models/Users.js";
import bcrypt from "bcryptjs";
import cloudinary from "../lib/cloudinary.js";

// ── Helper: strip password from user object ───────────────────────────────────
const sanitizeUser = (user) => {
    const obj = user.toObject ? user.toObject() : { ...user };
    delete obj.password;
    return obj;
};

// ── Helper: upload to Cloudinary with base64 fallback ────────────────────────
const uploadProfilePic = async (base64String) => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder: "chat-app/profiles",
            resource_type: "image",
            transformation: [
                { width: 400, height: 400, crop: "fill", gravity: "face" },
                { quality: "auto", fetch_format: "auto" },
            ],
        });
        return result.secure_url;
    } catch (err) {
        console.warn(`⚠  Cloudinary profile upload failed (${err.message}). Storing base64 directly.`);
        return base64String;
    }
};

// ── Sign Up ───────────────────────────────────────────────────────────────────
export const signup = async (req, res) => {
    try {
        const { fullName, email, password, bio } = req.body;

        if (!fullName || !email || !password || !bio) {
            return res.status(400).json({
                success: false,
                message: "All fields are required (fullName, email, password, bio)",
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters",
            });
        }

        const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "An account with this email already exists",
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            fullName: fullName.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            bio: bio.trim(),
        });

        const token = generateToken(newUser._id);

        res.status(201).json({
            success: true,
            userData: sanitizeUser(newUser),
            token,
            message: "Account created successfully",
        });
    } catch (error) {
        console.error("signup error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Login ─────────────────────────────────────────────────────────────────────
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const userData = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userData) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const isPasswordCorrect = await bcrypt.compare(password, userData.password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ success: false, message: "Invalid email or password" });
        }

        const token = generateToken(userData._id);

        res.json({
            success: true,
            userData: sanitizeUser(userData),
            token,
            message: "Login successful",
        });
    } catch (error) {
        console.error("login error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Check Auth ────────────────────────────────────────────────────────────────
export const checkAuth = (req, res) => {
    res.json({ success: true, user: req.user });
};

// ── Update Profile ────────────────────────────────────────────────────────────
export const updateProfile = async (req, res) => {
    try {
        const { profilePic, bio, fullName } = req.body;
        const userId = req.user._id;

        const updateData = {};
        if (bio !== undefined && bio !== null) updateData.bio = bio.trim();
        if (fullName !== undefined && fullName !== null) updateData.fullName = fullName.trim();

        if (profilePic) {
            updateData.profilePic = await uploadProfilePic(profilePic);
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ success: false, message: "No fields to update" });
        }

        const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
            new: true,
            select: "-password",
        });

        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error("updateProfile error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
