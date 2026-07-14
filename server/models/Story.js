import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        content: { type: String, required: true }, // base64 image or text
        type: { type: String, enum: ["image", "text"], default: "text" },
        expiresAt: { type: Date, required: true },
    },
    { timestamps: true }
);

// Auto-delete expired stories (index with TTL)
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Story = mongoose.model("Story", storySchema);
export default Story;
