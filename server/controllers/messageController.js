import Message from "../models/Message.js";
import User from "../models/Users.js";
import Group from "../models/Group.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// ── Helper: upload to Cloudinary, fall back to raw base64 ────────────────────
const uploadImage = async (base64String, folder) => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder,
            resource_type: "image",
        });
        return result.secure_url;
    } catch (err) {
        console.warn(`⚠️  Cloudinary upload failed (${err.message}). Storing base64 directly.`);
        return base64String;
    }
};

const uploadFile = async (base64String, folder) => {
    try {
        const result = await cloudinary.uploader.upload(base64String, {
            folder,
            resource_type: "auto",
        });
        return result.secure_url;
    } catch (err) {
        console.warn(`⚠️  Cloudinary file upload failed (${err.message}). Storing base64 directly.`);
        return base64String;
    }
};

// ── Get Users For Sidebar ─────────────────────────────────────────────────────
export const getUsersForSidebar = async (req, res) => {
    try {
        const userId = req.user._id;

        const filteredUsers = await User.find({ _id: { $ne: userId } })
            .select("-password")
            .sort({ fullName: 1 });

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
        const { id } = req.params; // Can be user ID or group ID
        const myId = req.user._id;

        let messages;
        // Check if it's a group
        const group = await Group.findById(id);
        if (group) {
            if (!group.members.includes(myId)) {
                return res.status(403).json({ success: false, message: "You are not a member of this group" });
            }
            messages = await Message.find({ groupId: id }).sort({ createdAt: 1 }).populate("senderId", "fullName profilePic");
            // Mark messages as seen by current user
            await Message.updateMany(
                { groupId: id, senderId: { $ne: myId } },
                { $addToSet: { seenBy: myId } }
            );
        } else {
            // Direct message
            messages = await Message.find({
                $or: [
                    { senderId: myId, receiverId: id },
                    { senderId: id, receiverId: myId },
                ],
            }).sort({ createdAt: 1 }).populate("senderId", "fullName profilePic");

            await Message.updateMany(
                { senderId: id, receiverId: myId, seen: false },
                { $set: { seen: true } }
            );
        }

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
        const updatedMessage = await Message.findByIdAndUpdate(id, { $set: { seen: true } }, { new: true });
        
        const receiverSocketId = userSocketMap[updatedMessage.senderId.toString()];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("messageSeen", { messageId: id });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("markMessageAsSeen error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Send Message ──────────────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
    try {
        const { text, image, isSticker, file, location, audio } = req.body;
        const { id } = req.params;
        const senderId = req.user._id;

        console.log("📥 sendMessage request body:", req.body, "params.id:", id);

        if (!text && !image && !file && !location && !audio) {
            return res.status(400).json({ success: false, message: "Message must have text, image, file, audio, or location" });
        }

        // Check if it's a group or direct message
        const group = await Group.findById(id);
        let newMessage;

        if (group) {
            if (!group.members.includes(senderId)) {
                return res.status(403).json({ success: false, message: "You are not a member of this group" });
            }

            let imageUrl = "";
            let audioUrl = "";
            let fileData = {};

            if (image) {
                imageUrl = await uploadImage(image, "chat-app/messages");
            }
            if (audio) {
                audioUrl = await uploadFile(audio, "chat-app/messages/audio");
            }
            if (file && file.base64) {
                const fileUrl = await uploadFile(file.base64, "chat-app/files");
                fileData = {
                    url: fileUrl,
                    name: file.name || "file",
                    type: file.type || "application/octet-stream",
                    size: file.size || 0
                };
            }

            newMessage = await Message.create({
                senderId,
                groupId: id,
                text: text || "",
                image: imageUrl,
                audio: audioUrl,
                file: fileData,
                location: location || null,
                isSticker: Boolean(isSticker),
                seenBy: [senderId],
            });

            // Populate sender before sending
            await newMessage.populate("senderId", "fullName profilePic");

            // Send to all group members
            group.members.forEach((memberId) => {
                if (memberId.toString() !== senderId.toString()) {
                    const socketId = userSocketMap[memberId.toString()];
                    if (socketId) {
                        io.to(socketId).emit("newMessage", newMessage);
                    }
                }
            });
        } else {
            // Direct message
            const receiver = await User.findById(id).select("_id");
            if (!receiver) {
                return res.status(404).json({ success: false, message: "Receiver not found" });
            }

            let imageUrl = "";
            let audioUrl = "";
            let fileData = {};

            if (image) {
                imageUrl = await uploadImage(image, "chat-app/messages");
            }
            if (audio) {
                audioUrl = await uploadFile(audio, "chat-app/messages/audio");
            }
            if (file && file.base64) {
                const fileUrl = await uploadFile(file.base64, "chat-app/files");
                fileData = {
                    url: fileUrl,
                    name: file.name || "file",
                    type: file.type || "application/octet-stream",
                    size: file.size || 0
                };
            }

            newMessage = await Message.create({
                senderId,
                receiverId: id,
                text: text || "",
                image: imageUrl,
                audio: audioUrl,
                file: fileData,
                location: location || null,
                isSticker: Boolean(isSticker),
            });

            await newMessage.populate("senderId", "fullName profilePic");

            const receiverSocketId = userSocketMap[id.toString()];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("newMessage", newMessage);
            }
        }

        res.status(201).json({ success: true, newMessage });
    } catch (error) {
        console.error("sendMessage error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Add Reaction ──────────────────────────────────────────────────────────────
export const addReaction = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { emoji } = req.body;
        const userId = req.user._id;

        let message = await Message.findById(messageId);
        
        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        const existingReaction = message.reactions.find(
            (r) => r.userId.toString() === userId.toString()
        );

        if (existingReaction) {
            if (existingReaction.emoji === emoji) {
                message.reactions = message.reactions.filter(
                    (r) => r.userId.toString() !== userId.toString()
                );
            } else {
                existingReaction.emoji = emoji;
            }
        } else {
            message.reactions.push({ userId, emoji });
        }

        await message.save();

        // Send to relevant users
        const sendTo = message.groupId 
            ? (await Group.findById(message.groupId)).members.filter(m => m.toString() !== userId.toString())
            : [message.receiverId];
        sendTo.forEach(uid => {
            const socketId = userSocketMap[uid.toString()];
            if (socketId) {
                io.to(socketId).emit("messageReaction", { messageId, reactions: message.reactions });
            }
        });

        res.json({ success: true, message });
    } catch (error) {
        console.error("addReaction error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Edit Message ──────────────────────────────────────────────────────────────
export const editMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "You can only edit your own messages" });
        }

        message.text = text;
        message.edited = true;
        await message.save();

        // Send to relevant users
        const sendTo = message.groupId 
            ? (await Group.findById(message.groupId)).members.filter(m => m.toString() !== userId.toString())
            : [message.receiverId];
        sendTo.forEach(uid => {
            const socketId = userSocketMap[uid.toString()];
            if (socketId) {
                io.to(socketId).emit("messageEdited", { messageId, text, edited: true });
            }
        });

        res.json({ success: true, message });
    } catch (error) {
        console.error("editMessage error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Delete Message ────────────────────────────────────────────────────────────
export const deleteMessage = async (req, res) => {
    try {
        const { id: messageId } = req.params;
        const userId = req.user._id;

        const message = await Message.findById(messageId);

        if (!message) {
            return res.status(404).json({ success: false, message: "Message not found" });
        }

        if (message.senderId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "You can only delete your own messages" });
        }

        message.deleted = true;
        await message.save();

        // Send to relevant users
        const sendTo = message.groupId 
            ? (await Group.findById(message.groupId)).members.filter(m => m.toString() !== userId.toString())
            : [message.receiverId];
        sendTo.forEach(uid => {
            const socketId = userSocketMap[uid.toString()];
            if (socketId) {
                io.to(socketId).emit("messageDeleted", { messageId });
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error("deleteMessage error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
