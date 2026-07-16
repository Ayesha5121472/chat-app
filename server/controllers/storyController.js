import Story from "../models/Story.js";
import User from "../models/Users.js";
import cloudinary from "../lib/cloudinary.js";

export const createStory = async (req, res) => {
    try {
        const { content, type } = req.body;
        const userId = req.user._id;

        if (!content) {
            return res.status(400).json({ success: false, message: "Content is required" });
        }

        let storyContent = content;
        if (type === "image" && content.startsWith("data:image")) {
            try {
                const result = await cloudinary.uploader.upload(content, {
                    folder: "chat-app/stories",
                });
                storyContent = result.secure_url;
            } catch (error) {
                console.warn("Cloudinary upload failed for story image");
            }
        }

        const story = await Story.create({
            userId,
            content: storyContent,
            type: type || "text",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            views: [],
        });

        await story.populate("userId", "fullName profilePic");
        res.status(201).json({ success: true, story });
    } catch (error) {
        console.error("Create story error:", error);
        res.status(500).json({ success: false, message: "Failed to create story" });
    }
};

export const getStories = async (req, res) => {
    try {
        const stories = await Story.find({
            expiresAt: { $gt: new Date() }, // only non-expired
        })
            .populate("userId", "fullName profilePic")
            .populate("views", "fullName profilePic")
            .sort({ createdAt: -1 });

        res.json({ success: true, stories });
    } catch (error) {
        console.error("Get stories error:", error);
        res.status(500).json({ success: false, message: "Failed to get stories" });
    }
};

export const markStoryViewed = async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user._id;

        await Story.findByIdAndUpdate(storyId, {
            $addToSet: { views: userId }, // avoid duplicate views
        });

        res.json({ success: true });
    } catch (error) {
        console.error("Mark story viewed error:", error);
        res.status(500).json({ success: false, message: "Failed to mark story viewed" });
    }
};

export const deleteStory = async (req, res) => {
    try {
        const { storyId } = req.params;
        const userId = req.user._id;

        const story = await Story.findById(storyId);
        if (!story) {
            return res.status(404).json({ success: false, message: "Story not found" });
        }

        if (story.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, message: "Only owner can delete story" });
        }

        await Story.findByIdAndDelete(storyId);
        res.json({ success: true, message: "Story deleted successfully" });
    } catch (error) {
        console.error("Delete story error:", error);
        res.status(500).json({ success: false, message: "Failed to delete story" });
    }
};
