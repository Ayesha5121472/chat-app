import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, default: "" },
        creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
        welcomeMessage: { type: String, default: "Welcome to the group! 👋" },
        rules: { type: String, default: "" },
        category: { type: String, default: "General" },
    },
    { timestamps: true }
);

const Group = mongoose.model("Group", groupSchema);
export default Group;
