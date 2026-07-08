import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
    {
        senderId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        text:       { type: String, default: "" },
        // Stores either a Cloudinary URL or a base64 data URI as fallback
        image:      { type: String, default: "" },
        // True when the message is a sticker (single large emoji)
        isSticker:  { type: Boolean, default: false },
        seen:       { type: Boolean, default: false },
    },
    { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
