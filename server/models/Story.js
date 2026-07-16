import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true },
        type: { type: String, enum: ["image", "text"], default: "text" },
        expiresAt: { type: Date, required: true },
        views: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // who viewed this story
    },
    { timestamps: true }
);

// Auto-delete expired stories from MongoDB (TTL index)
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model("Story", storySchema);
export default Story;
