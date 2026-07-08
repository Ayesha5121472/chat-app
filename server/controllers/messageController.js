import Message from "../models/Message.js";
import User from "../models/Users.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// ── Helper: upload to Cloudinary, fall back to raw base64 ────────────────────
// If Cloudinary credentials are wrong or unavailable, we store the base64 string
// directly in MongoDB so the app still works during development.
const uploadImage = async (base64String, folder) => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder,
            resource_type: "image",
        });
        return result.secure_url;
    } catch (err) {
        console.warn(`⚠  Cloudinary upload failed (${err.message}). Storing base64 directly.`);
        // Return the raw base64 data URI so the image still renders in the browser
        return base64String;
    }
};

// ── Get Users For Sidebar ─────────────────────────────────────────────────────
export const getUsersForISidebar = async (req, res) => {
    try {
        const userId = req.user._id;

        const filteredUsers = await User.find({ _id: { $ne: userId } })
            .select("-password")
            .sort({ fullName: 1 });

        // Aggregate unseen message counts in one query
        const unseenAgg = await Message.aggregate([
            { $match: { receiverId: userId, seen: false } },
            { $group: { _id: "$senderId", count: { $sum: 1 } } },
        ]);

        const unseenMessages = {};
        unseenAgg.forEach(({ _id, count }) => {
            unseenMessages[_id.toString()] = count;
        });

        res.json({ success: true, users: filteredUsers, unseenMessages });
    } catch (error) {
        console.error("getUsersForSidebar error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Get Messages ──────────────────────────────────────────────────────────────
export const getMessages = async (req, res) => {
    try {
        const { id: selectedUserId } = req.params;
        const myId = req.user._id;

        const messages = await Message.find({
            $or: [
                { senderId: myId, receiverId: selectedUserId },
                { senderId: selectedUserId, receiverId: myId },
            ],
        }).sort({ createdAt: 1 });

        await Message.updateMany(
            { senderId: selectedUserId, receiverId: myId, seen: false },
            { $set: { seen: true } }
        );

        res.json({ success: true, messages });
    } catch (error) {
        console.error("getMessages error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Mark Message As Seen ──────────────────────────────────────────────────────
export const markMessageAsSeen = async (req, res) => {
    try {
        const { id } = req.params;
        await Message.findByIdAndUpdate(id, { $set: { seen: true } });
        res.json({ success: true });
    } catch (error) {
        console.error("markMessageAsSeen error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Send Message ──────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
    try {
        const { text, image, isSticker } = req.body;
        const receiverId = req.params.id;
        const senderId = req.user._id;

        if (!text && !image) {
            return res.status(400).json({ success: false, message: "Message must have text or image" });
        }

        const receiver = await User.findById(receiverId).select("_id");
        if (!receiver) {
            return res.status(404).json({ success: false, message: "Receiver not found" });
        }

        let imageUrl = "";
        if (image) {
            imageUrl = await uploadImage(image, "chat-app/messages");
        }

        const newMessage = await Message.create({
            senderId,
            receiverId,
            text: text || "",
            image: imageUrl,
            isSticker: Boolean(isSticker),
        });

        // Real-time push to receiver if online
        const receiverSocketId = userSocketMap[receiverId.toString()];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage);
        }

        res.status(201).json({ success: true, newMessage });
    } catch (error) {
        console.error("sendMessage error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
