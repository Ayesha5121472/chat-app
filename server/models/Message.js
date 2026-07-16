import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // For direct messages
        groupId:    { type: mongoose.Schema.Types.ObjectId, ref: "Group" }, // For group messages
        text:       { type: String, default: "" },
        // Stores either a Cloudinary URL or a base64 data URI as fallback
        image:      { type: String, default: "" },
        audio:      { type: String, default: "" },
        file:       { 
            url: { type: String, default: "" }, 
            name: { type: String, default: "" }, 
            type: { type: String, default: "" }, 
            size: { type: Number, default: 0 } 
        },
        location:   {
            latitude: { type: Number },
            longitude: { type: Number },
            address: { type: String, default: "" }
        },
        // True when the message is a sticker (single large emoji)
        isSticker:  { type: Boolean, default: false },
        seen:       { type: Boolean, default: false },
        seenBy:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // For group messages
        edited:     { type: Boolean, default: false },
        deleted:    { type: Boolean, default: false },
        // Reactions: array of { userId, emoji }
        reactions:  [
            {
                userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
                emoji: { type: String, required: true }
            }
        ]
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
