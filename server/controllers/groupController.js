import Group from "../models/Group.js";
import User from "../models/Users.js";
import Message from "../models/Message.js";
import cloudinary from "../lib/cloudinary.js";

// Get io from socket
let io;
export const setIo = (ioInstance) => {
    io = ioInstance;
};

export const createGroup = async (req, res) => {
    try {
        const { name, description, memberIds = [], rules, category, welcomeMessage } = req.body;
        const creatorId = req.user._id;

        if (!name) {
            return res.status(400).json({ success: false, message: "Group name is required" });
        }

        const group = await Group.create({
            name,
            description: description || "",
            creator: creatorId,
            members: [creatorId, ...(memberIds || [])],
            admins: [creatorId],
            welcomeMessage: welcomeMessage || "Welcome to the group! 👋",
            rules: rules || "",
            category: category || "General",
        });

        await group.populate("members", "fullName email profilePic");
        await group.populate("creator", "fullName email profilePic");

        // Add welcome message
        const welcomeMsg = await Message.create({
            senderId: creatorId,
            groupId: group._id,
            text: group.welcomeMessage,
        });

        res.status(201).json({ success: true, group });
    } catch (error) {
        console.error("Create group error:", error);
        res.status(500).json({ success: false, message: "Failed to create group" });
    }
};

export const getMyGroups = async (req, res) => {
    try {
        const userId = req.user._id;
        const groups = await Group.find({ members: userId })
            .populate("members", "fullName email profilePic")
            .populate("creator", "fullName email profilePic")
            .sort({ createdAt: -1 });

        res.json({ success: true, groups });
    } catch (error) {
        console.error("Get my groups error:", error);
        res.status(500).json({ success: false, message: "Failed to get groups" });
    }
};

export const joinGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({ success: false, message: "You are already a member of this group" });
        }

        group.members.push(userId);
        await group.save();
        await group.populate("members", "fullName email profilePic");
        await group.populate("creator", "fullName email profilePic");

        // Send welcome message
        const welcomeMsg = await Message.create({
            senderId: group.creator,
            groupId: group._id,
            text: group.welcomeMessage,
        });
        await welcomeMsg.populate("senderId", "fullName profilePic");

        // Emit welcome msg to all members
        if (io) {
            group.members.forEach(memberId => {
                const socketId = req.app.get("userSocketMap")[memberId.toString()];
                if (socketId) {
                    io.to(socketId).emit("newMessage", welcomeMsg);
                    io.to(socketId).emit("groupUpdated", group);
                }
            });
        }

        res.json({ success: true, group });
    } catch (error) {
        console.error("Join group error:", error);
        res.status(500).json({ success: false, message: "Failed to join group" });
    }
};

export const leaveGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        if (!group.members.includes(userId)) {
            return res.status(400).json({ success: false, message: "You are not a member of this group" });
        }

        group.members = group.members.filter((id) => id.toString() !== userId.toString());
        group.admins = group.admins.filter((id) => id.toString() !== userId.toString());

        if (group.members.length === 0) {
            await Group.findByIdAndDelete(groupId);
            return res.json({ success: true, message: "Group deleted" });
        }

        if (group.creator.toString() === userId.toString()) {
            group.creator = group.members[0];
            group.admins.push(group.members[0]);
        }

        await group.save();
        await group.populate("members", "fullName email profilePic");
        await group.populate("creator", "fullName email profilePic");

        // Emit group updated
        if (io) {
            group.members.forEach(memberId => {
                const socketId = req.app.get("userSocketMap")[memberId.toString()];
                if (socketId) {
                    io.to(socketId).emit("groupUpdated", group);
                }
            });
        }

        res.json({ success: true, group });
    } catch (error) {
        console.error("Leave group error:", error);
        res.status(500).json({ success: false, message: "Failed to leave group" });
    }
};

export const deleteGroup = async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        if (group.creator.toString() !== userId.toString() && !group.admins.includes(userId)) {
            return res.status(403).json({ success: false, message: "Only creator or admin can delete group" });
        }

        // Save members before deletion to send event
        const prevMembers = [...group.members];

        await Group.findByIdAndDelete(groupId);
        await Message.deleteMany({ groupId });

        if (io) {
            prevMembers.forEach(memberId => {
                const socketId = req.app.get("userSocketMap")[memberId.toString()];
                if (socketId) {
                    io.to(socketId).emit("groupDeleted", groupId);
                }
            });
        }

        res.json({ success: true, message: "Group deleted successfully" });
    } catch (error) {
        console.error("Delete group error:", error);
        res.status(500).json({ success: false, message: "Failed to delete group" });
    }
};

export const addGroupMember = async (req, res) => {
    try {
        const { groupId } = req.params;
        const { userId } = req.body;
        const currentUserId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        if (!group.admins.includes(currentUserId) && group.creator.toString() !== currentUserId.toString()) {
            return res.status(403).json({ success: false, message: "Only admins can add members" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (group.members.includes(userId)) {
            return res.status(400).json({ success: false, message: "User is already in group" });
        }

        group.members.push(userId);
        await group.save();
        await group.populate("members", "fullName email profilePic");
        await group.populate("creator", "fullName email profilePic");

        // Send welcome message
        const welcomeMsg = await Message.create({
            senderId: currentUserId,
            groupId: group._id,
            text: `Welcome ${user.fullName} to the group! 👋`,
        });
        await welcomeMsg.populate("senderId", "fullName profilePic");

        // Emit to all group members
        if (io) {
            group.members.forEach(memberId => {
                const socketId = req.app.get("userSocketMap")[memberId.toString()];
                if (socketId) {
                    io.to(socketId).emit("newMessage", welcomeMsg);
                    io.to(socketId).emit("groupUpdated", group);
                }
            });
        }

        res.json({ success: true, group });
    } catch (error) {
        console.error("Add group member error:", error);
        res.status(500).json({ success: false, message: "Failed to add member" });
    }
};

export const removeGroupMember = async (req, res) => {
    try {
        const { groupId, userId } = req.params;
        const currentUserId = req.user._id;

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ success: false, message: "Group not found" });
        }

        if (!group.admins.includes(currentUserId) && group.creator.toString() !== currentUserId.toString()) {
            return res.status(403).json({ success: false, message: "Only admins can remove members" });
        }

        if (!group.members.includes(userId)) {
            return res.status(400).json({ success: false, message: "User is not in group" });
        }

        group.members = group.members.filter((id) => id.toString() !== userId.toString());
        group.admins = group.admins.filter((id) => id.toString() !== userId.toString());

        await group.save();
        await group.populate("members", "fullName email profilePic");
        await group.populate("creator", "fullName email profilePic");

        if (io) {
            group.members.forEach(memberId => {
                const socketId = req.app.get("userSocketMap")[memberId.toString()];
                if (socketId) {
                    io.to(socketId).emit("groupUpdated", group);
                }
            });
        }

        res.json({ success: true, group });
    } catch (error) {
        console.error("Remove group member error:", error);
        res.status(500).json({ success: false, message: "Failed to remove member" });
    }
};
