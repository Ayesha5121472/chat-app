import { useCallback, useContext, useEffect, useRef, useState, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";

// Lazy-load the picker so emoji-picker-react doesn't bloat the initial bundle
const EmojiStickerPicker = lazy(() => import("./EmojiStickerPicker"));

const imgError = (e) => { e.target.src = assets.avatar_icon; };

const ChatContainer = () => {
    const { messages, selectedUser, setSelectedUser, sendMessage, getMessages } =
        useContext(ChatContext);
    const { authUser, onlineUsers } = useContext(AuthContext);

    const scrollEnd   = useRef(null);
    const inputRef    = useRef(null);

    const [input,       setInput]       = useState("");
    const [isSending,   setIsSending]   = useState(false);
    const [showPicker,  setShowPicker]  = useState(false);

    // ── Load messages when selected user changes ──────────────────────────────
    useEffect(() => {
        if (selectedUser?._id) getMessages(selectedUser._id);
    }, [selectedUser?._id]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-scroll ───────────────────────────────────────────────────────────
    useEffect(() => {
        scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── Send text ─────────────────────────────────────────────────────────────
    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isSending) return;

        setIsSending(true);
        await sendMessage({ text: input.trim() });
        setInput("");
        setIsSending(false);
        inputRef.current?.focus();
    };

    // ── Send image attachment ─────────────────────────────────────────────────
    const handleSendImage = async (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5 MB.");
            return;
        }

        setIsSending(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            await sendMessage({ image: reader.result });
            setIsSending(false);
        };
        reader.onerror = () => {
            toast.error("Failed to read image.");
            setIsSending(false);
        };
        reader.readAsDataURL(file);
    };

    // ── Emoji selected from picker → append to input ──────────────────────────
    const handleEmojiSelect = useCallback((emoji) => {
        setInput((prev) => prev + emoji);
        setShowPicker(false);
        inputRef.current?.focus();
    }, []);

    // ── Sticker selected → send immediately as a text message ────────────────
    // Stickers are large Unicode emoji sent as a standalone message so they
    // render at full size in the chat bubble.
    const handleStickerSelect = useCallback(async (sticker) => {
        setShowPicker(false);
        setIsSending(true);
        await sendMessage({ text: sticker, isSticker: true });
        setIsSending(false);
    }, [sendMessage]);

    // ── Close picker ──────────────────────────────────────────────────────────
    const closePicker = useCallback(() => setShowPicker(false), []);

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!selectedUser) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 bg-white/5 max-md:hidden">
                <img src={assets.logo_icon} alt="" className="w-16 opacity-60" />
                <p className="text-lg font-medium text-white/60">Chat anytime, anywhere</p>
            </div>
        );
    }

    const isOnline = onlineUsers.includes(selectedUser._id);

    return (
        <div className="flex flex-col h-full backdrop-blur-lg overflow-hidden">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-500/50 flex-shrink-0">
                <img
                    src={selectedUser.profilePic || assets.avatar_icon}
                    alt={selectedUser.fullName}
                    onError={imgError}
                    className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{selectedUser.fullName}</p>
                    <p className={`text-xs ${isOnline ? "text-green-400" : "text-gray-400"}`}>
                        {isOnline ? "Online" : "Offline"}
                    </p>
                </div>
                <button type="button" onClick={() => setSelectedUser(null)}
                    className="md:hidden p-1" aria-label="Back">
                    <img src={assets.arrow_icon} alt="Back" className="w-6" />
                </button>
                <img src={assets.help_icon} alt="Help" className="max-md:hidden w-5 opacity-70" />
            </div>

            {/* ── Messages ──────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {messages.length === 0 && (
                    <p className="text-center text-gray-500 text-sm mt-10 select-none">
                        No messages yet. Say hello! 👋
                    </p>
                )}

                {messages.map((msg, index) => {
                    const isMine =
                        (msg.senderId?._id || msg.senderId)?.toString() ===
                        authUser._id?.toString();

                    // Sticker: standalone emoji with no other text, rendered large
                    const isSticker = msg.isSticker ||
                        (!msg.image && msg.text &&
                         [...msg.text].length <= 2 &&
                         /^\p{Emoji}/u.test(msg.text));

                    return (
                        <div
                            key={msg._id || index}
                            className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                        >
                            {/* Avatar + timestamp */}
                            <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                                <img
                                    src={isMine
                                        ? authUser.profilePic   || assets.avatar_icon
                                        : selectedUser.profilePic || assets.avatar_icon}
                                    alt=""
                                    onError={imgError}
                                    className="w-7 h-7 rounded-full object-cover"
                                />
                                <span className="text-gray-500 text-[10px]">
                                    {formatMessageTime(msg.createdAt)}
                                </span>
                            </div>

                            {/* Message bubble */}
                            {msg.image ? (
                                // ── Image message ──
                                <img
                                    src={msg.image}
                                    alt="Sent image"
                                    className="max-w-[220px] max-h-[300px] rounded-lg border
                                    border-gray-600 cursor-pointer hover:opacity-90 transition object-contain"
                                    onClick={() => window.open(msg.image, "_blank")}
                                    loading="lazy"
                                    onError={(e) => { e.target.style.display = "none"; }}
                                />
                            ) : isSticker ? (
                                // ── Sticker ──
                                <div
                                    className={`flex items-center justify-center rounded-2xl p-2
                                    bg-white/5 hover:bg-white/10 transition cursor-default select-none
                                    ${isMine ? "rounded-br-none" : "rounded-bl-none"}`}
                                    title="Sticker"
                                >
                                    <span className="text-5xl leading-none">{msg.text}</span>
                                </div>
                            ) : (
                                // ── Text message ──
                                <p className={`px-3 py-2 rounded-xl text-sm text-white
                                    max-w-[240px] break-words bg-violet-500/30
                                    ${isMine ? "rounded-tr-none" : "rounded-tl-none"}`}>
                                    {msg.text}
                                </p>
                            )}
                        </div>
                    );
                })}
                <div ref={scrollEnd} />
            </div>

            {/* ── Input bar ─────────────────────────────────────────────────── */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-3 border-t border-stone-500/30">

                {/* Emoji / Sticker button with picker */}
                <div className="relative flex-shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowPicker((v) => !v)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full
                        text-xl transition
                        ${showPicker
                            ? "bg-violet-500/40 text-violet-300"
                            : "hover:bg-white/10 text-gray-400 hover:text-white"
                        }`}
                        aria-label="Emoji & Stickers"
                        title="Emoji & Stickers"
                    >
                        😊
                    </button>

                    {showPicker && (
                        <Suspense fallback={
                            <div className="absolute bottom-full mb-2 left-0 z-50 w-[340px] h-[420px]
                            rounded-2xl bg-[#1e1a3a] border border-white/10 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                            </div>
                        }>
                            <EmojiStickerPicker
                                onEmojiSelect={handleEmojiSelect}
                                onStickerSelect={handleStickerSelect}
                                onClose={closePicker}
                            />
                        </Suspense>
                    )}
                </div>

                {/* Text input + image attach */}
                <div className="flex-1 flex items-center bg-white/10 rounded-full px-4 gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) handleSendMessage(e);
                        }}
                        disabled={isSending}
                        className="flex-1 bg-transparent text-white text-sm py-3 outline-none
                        placeholder-gray-400 disabled:opacity-50"
                    />

                    {/* Image attach */}
                    <label
                        htmlFor="chat-image"
                        className={`cursor-pointer flex-shrink-0 ${isSending ? "opacity-40 pointer-events-none" : ""}`}
                        title="Send image"
                    >
                        <img
                            src={assets.gallery_icon}
                            alt="Attach image"
                            className="w-5 opacity-70 hover:opacity-100 transition"
                        />
                    </label>
                    <input
                        id="chat-image"
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        hidden
                        onChange={handleSendImage}
                    />
                </div>

                {/* Send button */}
                <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isSending || !input.trim()}
                    className="flex-shrink-0 disabled:opacity-40 transition"
                    aria-label="Send message"
                >
                    {isSending ? (
                        <div className="w-8 h-8 rounded-full border-2 border-violet-400
                        border-t-transparent animate-spin" />
                    ) : (
                        <img src={assets.send_button} alt="Send" className="w-8" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default ChatContainer;
