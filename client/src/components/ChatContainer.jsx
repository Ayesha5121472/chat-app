import { useCallback, useContext, useEffect, useRef, useState, lazy, Suspense } from "react";
import toast from "react-hot-toast";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import VoiceChatModal from "./VoiceChatModal";

const EmojiStickerPicker = lazy(() => import("./EmojiStickerPicker"));

const imgError = (e, name) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
};

const ChatContainer = () => {
    const {
        messages,
        selectedUser,
        selectedGroup,
        setSelectedUser,
        setSelectedGroup,
        sendMessage,
        getMessages,
        addReaction,
        editMessage,
        deleteMessage,
    } = useContext(ChatContext);
    const { authUser, onlineUsers, socket } = useContext(AuthContext);

    const scrollEnd = useRef(null);
    const inputRef = useRef(null);
    const [showMenu, setShowMenu] = useState(null);

    const [input, setInput] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [editingMessage, setEditingMessage] = useState(null);
    const [showVoiceChat, setShowVoiceChat] = useState(null);
    const [typingUsers, setTypingUsers] = useState([]);
    const [chatSearchQuery, setChatSearchQuery] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState([]);
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [highlightedMsgId, setHighlightedMsgId] = useState(null);
    const [chatWallpaper, setChatWallpaper] = useState("default");
    const [showWallpaperModal, setShowWallpaperModal] = useState(false);
    // Voice message recording state
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const recordingTimerRef = useRef(null);

    // Debounce for typing events
    const typingTimeoutRef = useRef(null);

    // Listen for incoming voice calls and open modal
    useEffect(() => {
        if (!socket) return;

        const handleIncomingCall = ({ from, type }) => {
            console.log("Incoming call from:", from);
            if (!showVoiceChat) {
                setShowVoiceChat({ incoming: true, from, type });
            }
        };

        const handleTyping = ({ from }) => {
            if (from !== authUser._id) {
                setTypingUsers(prev => {
                    if (!prev.includes(from)) {
                        return [...prev, from];
                    }
                    return prev;
                });
                // Clear typing status after 2 seconds
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setTypingUsers(prev => prev.filter(id => id !== from));
                }, 2000);
            }
        };

        socket.on("incomingVoiceCall", handleIncomingCall);
        socket.on("typing", handleTyping);
        socket.on("messageSeen", ({ messageId }) => {
            // We'll handle this in ChatContext to update the message
            console.log("Message seen:", messageId);
        });

        return () => {
            socket.off("incomingVoiceCall", handleIncomingCall);
            socket.off("typing", handleTyping);
            clearTimeout(typingTimeoutRef.current);
        };
    }, [socket, showVoiceChat, authUser._id]);

    const handleStartRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            let chunks = [];
            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: "audio/webm" });
                const reader = new FileReader();
                reader.onloadend = async () => {
                    await sendMessage({ audio: reader.result });
                    setIsSending(false);
                };
                reader.readAsDataURL(blob);
                stream.getTracks().forEach((track) => track.stop());
            };
            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);
            recordingTimerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
        } catch (err) {
            toast.error("Microphone access denied.");
        }
    };

    const handleStopRecording = () => {
        mediaRecorder.stop();
        setIsRecording(false);
        clearInterval(recordingTimerRef.current);
        setIsSending(true);
    };

    // Handle typing handler
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInput(newValue);

        if (socket && (selectedUser || selectedGroup)) {
            socket.emit("typing", {
                from: authUser._id,
                to: selectedUser?._id || selectedGroup?._id,
                isGroup: !!selectedGroup,
            });
        }
    };

    const reactionEmojis = ["👍", "❤️", "😂", "😮", "😢", "😡"];
    const autoGeneratedMessages = [
        "Hey! How's it going?",
        "What's up?",
        "Nice weather we're having today, huh?",
        "Did you watch any good shows lately?",
        "I had a great day today!",
        "What are your plans for the weekend?",
        "Just wanted to say hi!",
        "Have you eaten yet?",
        "Hope you're having a good day!",
        "Long time no chat!",
        "What's new with you?",
        "I miss our conversations!",
        "How's work/school going?",
        "Have you been up to anything fun?",
        "Wanna grab coffee sometime?",
        "What's your favorite song right now?",
        "I just tried a new recipe, it was amazing!",
        "Did you see that crazy news story?",
        "Happy [day of week]! 🎉",
        "Sending good vibes your way!",
    ];

    const selected = selectedUser || selectedGroup;
    const isGroup = !!selectedGroup;

    useEffect(() => {
        if (selected?._id) {
            const stored = localStorage.getItem("pinned_msgs_" + selected._id);
            setPinnedMessages(stored ? JSON.parse(stored) : []);
            setChatSearchQuery("");
            setShowSearch(false);
            
            const storedWp = localStorage.getItem("chat_bg_" + selected._id);
            setChatWallpaper(storedWp || "default");
        }
    }, [selected?._id]);

    const togglePinMessage = (msg) => {
        let newPinned = [];
        const exists = pinnedMessages.some((pm) => pm._id === msg._id);
        if (exists) {
            newPinned = pinnedMessages.filter((pm) => pm._id !== msg._id);
            toast.success("Message unpinned");
        } else {
            newPinned = [...pinnedMessages, { _id: msg._id, text: msg.text || (msg.image ? "🖼️ Photo" : "📎 Attachment"), senderName: msg.senderId.fullName || "User" }];
            toast.success("Message pinned");
        }
        setPinnedMessages(newPinned);
        localStorage.setItem("pinned_msgs_" + selected._id, JSON.stringify(newPinned));
        setShowMenu(null);
    };

    const scrollToMessage = (msgId) => {
        const element = document.getElementById("msg-" + msgId);
        if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            setHighlightedMsgId(msgId);
            setTimeout(() => setHighlightedMsgId(null), 2000);
        } else {
            toast.error("Message not found in chat view");
        }
    };

    const applyAIOption = (type, option) => {
        if (type === "template") {
            setInput(option);
            setShowAIPanel(false);
            inputRef.current?.focus();
            return;
        }

        const text = input.trim();
        if (!text) {
            toast.error("Please type some text first!");
            return;
        }

        let result = text;
        if (type === "tone") {
            if (option === "formal") {
                result = `Dear Sir/Madam, I hope this message finds you well. With regard to your query: "${text}", please kindly let me know if we can discuss this further. Warm regards.`;
            } else if (option === "casual") {
                result = `Hey! Just wanted to say: ${text.toLowerCase()}... Let me know if that makes sense! 😊🙌`;
            } else if (option === "hype") {
                result = `OMG YES! 🚀🔥 "${text.toUpperCase()}"! Let's absolutely crush this! Let me know ASAP! 🎉✨`;
            }
        } else if (type === "translate") {
            if (option === "es") {
                result = `¡Hola! Con respecto a: "${text}". Avísame si tienes alguna pregunta.`;
            } else if (option === "fr") {
                result = `Bonjour! Concernant : "${text}". S'il vous plaît faites-moi savoir.`;
            } else if (option === "ur") {
                result = `ہیلو! اس کے بارے میں: "${text}". براہ کرم مجھے بتائیں۔`;
            } else if (option === "ar") {
                result = `مرحباً! بخصوص: "${text}". يرجى إعلامي بذلك.`;
            }
        }

        setInput(result);
        setShowAIPanel(false);
        inputRef.current?.focus();
        toast.success("AI updated your message!");
    };

    useEffect(() => {
        if (selected?._id) getMessages(selected._id);
    }, [selected?._id, getMessages]);

    useEffect(() => {
        scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (editingMessage) {
            setInput(editingMessage.text);
            inputRef.current?.focus();
        }
    }, [editingMessage]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isSending) return;

        setIsSending(true);
        if (editingMessage) {
            await editMessage(editingMessage.id, input.trim());
            setEditingMessage(null);
        } else {
            await sendMessage({ text: input.trim() });
        }
        setInput("");
        setIsSending(false);
        inputRef.current?.focus();
    };

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

    const handleSendFile = async (e) => {
        const file = e.target.files[0];
        e.target.value = "";
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            toast.error("File must be smaller than 10 MB.");
            return;
        }

        setIsSending(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            await sendMessage({
                file: {
                    base64: reader.result,
                    name: file.name,
                    type: file.type,
                    size: file.size,
                },
            });
            setIsSending(false);
        };
        reader.onerror = () => {
            toast.error("Failed to read file.");
            setIsSending(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSendLocation = async () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser.");
            return;
        }

        setIsSending(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await sendMessage({
                    location: {
                        latitude,
                        longitude,
                        address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                    },
                });
                setIsSending(false);
            },
            (error) => {
                toast.error("Failed to get your location.");
                setIsSending(false);
            }
        );
    };

    const handleEmojiSelect = useCallback((emoji) => {
        setInput((prev) => prev + emoji);
        setShowPicker(false);
        inputRef.current?.focus();
    }, []);

    const handleStickerSelect = useCallback(async (sticker) => {
        setShowPicker(false);
        setIsSending(true);
        await sendMessage({ text: sticker, isSticker: true });
        setIsSending(false);
    }, [sendMessage]);

    const handleReaction = async (messageId, emoji) => {
        await addReaction(messageId, emoji);
        setShowMenu(null);
    };

    const handleDelete = async (messageId) => {
        await deleteMessage(messageId);
        setShowMenu(null);
    };

    const handleEdit = (message) => {
        setEditingMessage({ id: message._id, text: message.text });
        setShowMenu(null);
    };

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const getReactionCounts = (reactions) => {
        const counts = {};
        reactions?.forEach((r) => {
            counts[r.emoji] = (counts[r.emoji] || 0) + 1;
        });
        return counts;
    };


    const isOnline = isGroup ? true : onlineUsers.includes(selectedUser?._id);

    const getSenderName = (msg) => {
        if (!isGroup) return null;
        const member = selectedGroup?.members?.find(
            (m) => (m._id || m).toString() === (msg.senderId._id || msg.senderId).toString()
        );
        return member?.fullName || "Unknown";
    };

    const getAvatar = (msg, isMine) => {
        if (isGroup) {
            const member = selectedGroup?.members?.find(
                (m) => (m._id || m).toString() === (msg.senderId._id || msg.senderId).toString()
            );
            return member?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(member?.fullName || 'User')}&background=random`;
        }
        if (isMine) {
            return authUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.fullName)}&background=random`;
        } else {
            return selectedUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedUser.fullName)}&background=random`;
        }
    };

    const filteredMessages = messages.filter((msg) => {
        if (!chatSearchQuery.trim()) return true;
        return msg.text && msg.text.toLowerCase().includes(chatSearchQuery.toLowerCase());
    });

    if (!selected) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-3 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 max-md:hidden transition-colors duration-300">
                <img src={assets.logo_icon} alt="" className="w-24 opacity-60" />
                <p className="text-xl font-medium text-slate-500 dark:text-white/60">Chat anytime, anywhere</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden transition-colors duration-300">
            <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-white/10 flex-shrink-0 relative">
                <img
                    src={selected.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(selected.fullName || selected.name)}&background=random`}
                    alt={selected.fullName || selected.name}
                    onError={(e) => imgError(e, selected.fullName || selected.name)}
                    className="w-12 h-12 rounded-full object-cover"
                />
                {showSearch ? (
                    <div className="flex-1 flex items-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 animate-slide-in-up">
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={chatSearchQuery}
                            onChange={(e) => setChatSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-white outline-none placeholder-slate-400 dark:placeholder-gray-400"
                            autoFocus
                        />
                        {chatSearchQuery && (
                            <span className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full mr-2">
                                {filteredMessages.length} found
                            </span>
                        )}
                        <button
                            onClick={() => {
                                setShowSearch(false);
                                setChatSearchQuery("");
                            }}
                            className="text-xs text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-white p-1 cursor-pointer"
                        >
                            ✕
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-slate-800 dark:text-white font-bold text-lg truncate">{selected.fullName || selected.name}</p>
                            {isOnline && !isGroup && (
                                <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-500/50" title="Online" />
                            )}
                        </div>
                        {isGroup ? (
                            <p className="text-sm text-slate-500 dark:text-gray-400">{selected.members?.length || 0} members</p>
                        ) : (
                            <p className={`text-sm ${isOnline ? "text-green-500 dark:text-green-400" : "text-slate-500 dark:text-gray-400"}`}>
                                {isOnline ? "Online" : "Offline"}
                            </p>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSearch(!showSearch)}
                        className={`p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition duration-300 cursor-pointer ${
                            showSearch ? "bg-slate-200 dark:bg-white/10" : ""
                        }`}
                        title="Search Chat"
                    >
                        🔍
                    </button>
                    <button
                        onClick={() => setShowWallpaperModal(!showWallpaperModal)}
                        className={`p-2.5 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition duration-300 cursor-pointer ${
                            showWallpaperModal ? "bg-slate-200 dark:bg-white/10" : ""
                        }`}
                        title="Chat Wallpaper"
                    >
                        🎨
                    </button>
                    {!isGroup && (
                        <>
                            <button
                                onClick={() => setShowVoiceChat("voice")}
                                className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 transition duration-300 transform hover:scale-110 shadow-lg shadow-green-500/30 cursor-pointer"
                                aria-label="Voice Call"
                                title="Start Voice Call"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5.5 h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowVoiceChat("video");
                                }}
                                className="w-11 h-11 flex items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transition duration-300 transform hover:scale-110 shadow-lg shadow-blue-500/30 cursor-pointer"
                                aria-label="Video Call"
                                title="Start Video Call"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-5.5 h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            </button>
                        </>
                    )}
                </div>

                {showWallpaperModal && (
                    <div className="absolute top-16 right-6 z-50 w-72 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col gap-3 animate-slide-in-up">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-2">
                            <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5 animate-pulse">
                                <span>🎨</span> Chat Wallpaper
                            </span>
                            <button onClick={() => setShowWallpaperModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer">✕</button>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: "default", name: "Default", style: "bg-slate-100 dark:bg-slate-800" },
                                { id: "linear-gradient(to bottom right, #f43f5e, #eab308)", name: "Sunset", style: "bg-gradient-to-br from-rose-500 to-yellow-500" },
                                { id: "linear-gradient(to bottom right, #06b6d4, #3b82f6)", name: "Ocean", style: "bg-gradient-to-br from-cyan-500 to-blue-500" },
                                { id: "linear-gradient(to bottom right, #a855f7, #6366f1)", name: "Lavender", style: "bg-gradient-to-br from-purple-500 to-indigo-500" },
                                { id: "linear-gradient(to bottom right, #0f172a, #1e1b4b)", name: "Midnight", style: "bg-gradient-to-br from-slate-950 to-indigo-950" },
                                { id: "linear-gradient(to bottom right, #10b981, #065f46)", name: "Forest", style: "bg-gradient-to-br from-emerald-500 to-emerald-900" }
                            ].map((wp) => (
                                <button
                                    key={wp.id}
                                    onClick={() => {
                                        setChatWallpaper(wp.id);
                                        localStorage.setItem("chat_bg_" + selected._id, wp.id);
                                        setShowWallpaperModal(false);
                                        toast.success("Wallpaper updated!");
                                    }}
                                    className={`h-12 rounded-xl flex items-center justify-center text-[10px] font-bold text-white shadow-sm border border-slate-300/30 dark:border-white/5 cursor-pointer ${wp.style} hover:scale-[1.04] transition duration-200`}
                                >
                                    {wp.name}
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex flex-col gap-1.5 mt-1 border-t border-slate-100 dark:border-white/5 pt-2">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300">Custom Image URL</label>
                            <input
                                type="text"
                                placeholder="Paste image link..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && e.target.value.trim()) {
                                        const url = e.target.value.trim();
                                        setChatWallpaper(url);
                                        localStorage.setItem("chat_bg_" + selected._id, url);
                                        setShowWallpaperModal(false);
                                        toast.success("Custom wallpaper applied!");
                                    }
                                }}
                                className="w-full text-xs p-2 border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-purple-500"
                            />
                        </div>
                    </div>
                )}
                {editingMessage && (
                    <button
                        type="button"
                        onClick={() => setEditingMessage(null)}
                        className="text-sm text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white font-medium ml-2"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="button"
                    onClick={() => {
                        setSelectedUser(null);
                        setSelectedGroup(null);
                    }}
                    className="md:hidden p-2"
                    aria-label="Back"
                >
                    <img src={assets.arrow_icon} alt="Back" className="w-7 cursor-pointer" />
                </button>
            </div>

            {pinnedMessages.length > 0 && (
                <div className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-white/10 backdrop-blur-md px-6 py-2.5 flex items-center justify-between gap-4 animate-slide-in-up z-10">
                    <div className="flex items-center gap-2 truncate flex-1">
                        <span className="text-sm">📌</span>
                        <div className="truncate text-xs">
                            <span className="font-bold text-slate-700 dark:text-gray-300">Pinned: </span>
                            <span className="text-slate-600 dark:text-gray-400">
                                {pinnedMessages[pinnedMessages.length - 1].text || "[Attachment]"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                            onClick={() => scrollToMessage(pinnedMessages[pinnedMessages.length - 1]._id)}
                            className="px-3 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-bold rounded-lg transition duration-300 cursor-pointer"
                        >
                            View
                        </button>
                        <button
                            onClick={() => togglePinMessage(pinnedMessages[pinnedMessages.length - 1])}
                            className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 text-sm font-semibold p-1 cursor-pointer"
                            title="Unpin"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            <div
                className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col gap-4"
                style={
                    chatWallpaper !== "default"
                        ? chatWallpaper.startsWith("http") || chatWallpaper.startsWith("data:")
                            ? { backgroundImage: `url(${chatWallpaper})`, backgroundSize: "cover", backgroundPosition: "center" }
                            : { background: chatWallpaper }
                        : {}
                }
            >
                {filteredMessages.length === 0 && (
                    <p className="text-center text-slate-400 dark:text-gray-500 text-base mt-12 select-none">
                        No messages yet. Say hello! 👋
                    </p>
                )}

                {filteredMessages.map((msg, index) => {
                    // senderId can be a populated object {_id, fullName, profilePic} or just a string ID
                    const senderIdStr = (msg.senderId?._id ?? msg.senderId)?.toString();
                    const isMine = senderIdStr === authUser._id.toString();

                    const isSticker =
                        msg.isSticker ||
                        (!msg.image && !msg.file?.url && !msg.location && !msg.audio && msg.text && [...msg.text].length <= 2 && /^\p{Emoji}/u.test(msg.text));

                    if (msg.deleted) {
                        return (
                            <div
                                key={msg._id || index}
                                className={`flex items-end gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                            >
                                <p className="text-sm text-slate-400 dark:text-gray-500 italic px-4 py-2 bg-black/5 dark:bg-white/5 rounded-xl">
                                    Message deleted
                                </p>
                            </div>
                        );
                    }

                    const reactionCounts = getReactionCounts(msg.reactions);
                    const senderName = getSenderName(msg);

                    return (
                        <div
                            key={msg._id || index}
                            id={`msg-${msg._id}`}
                            className={`flex items-end gap-3 ${
                                isMine ? "flex-row-reverse" : "flex-row"
                            } relative p-1.5 rounded-2xl transition-all duration-500 ${
                                highlightedMsgId === msg._id ? "animate-highlight-glow" : ""
                            }`}
                        >
                            <div className="flex flex-col items-center gap-1 flex-shrink-0">
                                <img
                                    src={getAvatar(msg, isMine)}
                                    alt=""
                                    onError={(e) => imgError(e, isMine ? authUser.fullName : (isGroup ? getSenderName(msg) : selectedUser.fullName))}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <div className="flex items-center gap-1">
                                    <span className="text-gray-500 text-xs">{formatMessageTime(msg.createdAt)}</span>
                                    {isMine && (
                                        <span className="text-xs">
                                            {msg.seen ? (
                                                <span className="text-blue-400">✓✓</span>
                                            ) : (
                                                <span className="text-gray-500">✓</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 max-w-[70%] group">
                                {isGroup && !isMine && senderName && (
                                    <p className="text-sm text-purple-600 dark:text-purple-300 font-medium ml-2">{senderName}</p>
                                )}

                                {msg.location ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${msg.location.latitude},${msg.location.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-4 py-3 rounded-2xl text-sm text-slate-800 dark:text-white break-words bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 border border-slate-200 dark:border-white/10 ${
                                            isMine ? "rounded-tr-none" : "rounded-tl-none"
                                        } flex items-center gap-3 hover:from-purple-500/20 hover:to-blue-500/20 dark:hover:from-purple-500/30 dark:hover:to-blue-500/30 transition duration-300`}
                                    >
                                        <span className="text-2xl">📍</span>
                                        <span className="truncate font-medium">{msg.location.address}</span>
                                    </a>
                                ) : msg.file?.url ? (
                                    <a
                                        href={msg.file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`px-4 py-3 rounded-2xl text-sm text-slate-800 dark:text-white break-words bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 border border-slate-200 dark:border-white/10 ${
                                            isMine ? "rounded-tr-none" : "rounded-tl-none"
                                        } flex items-center gap-3 hover:from-purple-500/20 hover:to-blue-500/20 dark:hover:from-purple-500/30 dark:hover:to-blue-500/30 transition duration-300`}
                                    >
                                        <span className="text-2xl">📎</span>
                                        <div className="flex flex-col min-w-0">
                                            <span className="truncate font-medium">{msg.file.name}</span>
                                            <span className="text-xs text-slate-500 dark:text-gray-300">{formatFileSize(msg.file.size)}</span>
                                        </div>
                                    </a>
                                ) : msg.image ? (
                                    <img
                                        src={msg.image}
                                        alt="Sent image"
                                        className="max-w-[240px] max-h-[320px] rounded-2xl border border-slate-200 dark:border-white/10 cursor-pointer hover:opacity-90 transition duration-300 object-contain"
                                        onClick={() => window.open(msg.image, "_blank")}
                                        loading="lazy"
                                        onError={(e) => {
                                            e.target.style.display = "none";
                                        }}
                                    />
                                ) : msg.audio ? (
                                    <audio controls src={msg.audio} className="max-w-[240px] max-h-[80px] rounded-2xl border border-slate-200 dark:border-white/10" />
                                ) : isSticker ? (
                                    <div
                                        className={`flex items-center justify-center rounded-3xl p-4 bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition duration-300 cursor-default select-none ${
                                            isMine ? "rounded-br-none" : "rounded-bl-none"
                                        }`}
                                        title="Sticker"
                                    >
                                        <span className="text-6xl leading-none">{msg.text}</span>
                                    </div>
                                ) : (
                                    <div
                                        className={`px-4 py-3 rounded-2xl text-sm text-slate-800 dark:text-white max-w-[280px] break-words bg-gradient-to-r from-purple-500/10 to-blue-500/10 dark:from-purple-500/20 dark:to-blue-500/20 border border-slate-200 dark:border-white/10 ${
                                            isMine ? "rounded-tr-none" : "rounded-tl-none"
                                        }`}
                                    >
                                        <p className="font-medium">{msg.text}</p>
                                        {msg.edited && (
                                            <span className="text-[10px] text-slate-400 dark:text-gray-400 ml-2">(edited)</span>
                                        )}
                                    </div>
                                )}

                                {Object.keys(reactionCounts).length > 0 && (
                                    <div className="flex gap-2 bg-slate-200/80 dark:bg-white/10 rounded-full px-3 py-1.5 self-end">
                                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReaction(msg._id, emoji)}
                                                className="text-base hover:scale-110 transition duration-300 cursor-pointer"
                                            >
                                                {emoji} {count > 1 ? count : ""}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                                {/* Reaction + action bar - appears below bubble on hover */}
                                <div className="hidden group-hover:flex gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-full px-2 py-1 shadow-lg self-start mt-0.5">
                                    {reactionEmojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleReaction(msg._id, emoji)}
                                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-base transition duration-200 cursor-pointer hover:scale-110"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => togglePinMessage(msg)}
                                        className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition duration-200 cursor-pointer"
                                        title={pinnedMessages.some((pm) => pm._id === msg._id) ? "Unpin" : "Pin"}
                                    >
                                        📌
                                    </button>
                                    {isMine && (
                                        <>
                                            <button
                                                onClick={() => handleEdit(msg)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition duration-200 cursor-pointer"
                                                title="Edit"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                onClick={() => handleDelete(msg._id)}
                                                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition duration-200 cursor-pointer"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </>
                                    )}
                                </div>

                            {showMenu === msg._id && (
                                <div className="absolute right-2 top-10 z-50 bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl p-3 flex flex-col gap-2 md:hidden border border-slate-200 dark:border-white/10">
                                    <div className="flex gap-1 border-b border-slate-200 dark:border-white/10 pb-2">
                                        {reactionEmojis.map((emoji) => (
                                            <button
                                                key={emoji}
                                                onClick={() => handleReaction(msg._id, emoji)}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition duration-300 cursor-pointer"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => togglePinMessage(msg)}
                                        className="px-4 py-2 text-left text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition duration-300 cursor-pointer"
                                    >
                                        {pinnedMessages.some((pm) => pm._id === msg._id) ? "📌 Unpin Message" : "📌 Pin Message"}
                                    </button>
                                    {isMine && (
                                        <>
                                            <button
                                                onClick={() => handleEdit(msg)}
                                                className="px-4 py-2 text-left text-sm text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition duration-300 cursor-pointer"
                                            >
                                                Edit Message
                                            </button>
                                            <button
                                                onClick={() => handleDelete(msg._id)}
                                                className="px-4 py-2 text-left text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition duration-300 cursor-pointer"
                                            >
                                                Delete Message
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
                <div ref={scrollEnd} />
            </div>

            <div className="flex-shrink-0 flex items-center gap-3 px-6 py-5 border-t border-slate-200 dark:border-white/10 bg-slate-100/50 dark:bg-slate-900/50 transition-colors duration-300">
                <div className="relative flex-shrink-0 flex gap-2">
                    <button
                        type="button"
                        onClick={() => setShowAIPanel(!showAIPanel)}
                        className={`w-11 h-11 flex items-center justify-center rounded-full text-xl transition duration-300 transform hover:scale-110 cursor-pointer ${
                            showAIPanel ? "bg-purple-500/20 text-purple-600 dark:text-purple-300" : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                        }`}
                        aria-label="AI Assist panel"
                        title="AI Assist Reply"
                    >
                        ✨
                    </button>

                    {showAIPanel && (
                        <div className="absolute bottom-full mb-3 left-0 z-[100] w-72 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl rounded-2xl flex flex-col gap-3 animate-slide-in-up">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-white/10 pb-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                    <span>✨</span> AI Reply Assist
                                </span>
                                <button onClick={() => setShowAIPanel(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer">✕</button>
                            </div>
                            
                            {/* Section: Tone Enhancer */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-1.5">Improve Writing Tone</p>
                                <div className="grid grid-cols-3 gap-1">
                                    {[
                                        { id: "formal", label: "👔 Formal" },
                                        { id: "casual", label: "☕ Casual" },
                                        { id: "hype",   label: "🔥 Hype" }
                                    ].map((tone) => (
                                        <button
                                            key={tone.id}
                                            onClick={() => applyAIOption("tone", tone.id)}
                                            className="py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 rounded-lg cursor-pointer transition duration-300"
                                        >
                                            {tone.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Templates */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-1.5">Quick Responses</p>
                                <div className="flex flex-col gap-1">
                                    {[
                                        { label: "👋 Say Hello", text: "Hey! How is your day going?" },
                                        { label: "🙏 Apologize", text: "Sorry for the delay, let check on that right away." },
                                        { label: "🤝 Follow up", text: "Just checking in to see if you had any updates on this." }
                                    ].map((tmpl, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => applyAIOption("template", tmpl.text)}
                                            className="w-full text-left py-1.5 px-2.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 rounded-lg truncate cursor-pointer transition duration-300"
                                        >
                                            {tmpl.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Section: Translation */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-1.5">Translate Text</p>
                                <div className="grid grid-cols-4 gap-1">
                                    {[
                                        { id: "es", label: "🇪🇸 ES" },
                                        { id: "fr", label: "🇫🇷 FR" },
                                        { id: "ur", label: "🇵🇰 UR" },
                                        { id: "ar", label: "🇸🇦 AR" }
                                    ].map((lang) => (
                                        <button
                                            key={lang.id}
                                            onClick={() => applyAIOption("translate", lang.id)}
                                            className="py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-gray-200 rounded-lg cursor-pointer transition duration-300"
                                        >
                                            {lang.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={handleSendLocation}
                        disabled={isSending}
                        className="w-11 h-11 flex items-center justify-center rounded-full text-xl transition duration-300 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-40 transform hover:scale-110"
                        aria-label="Share location"
                        title="Share your location"
                    >
                        📍
                    </button>
                    {/* Voice Message Button */}
                    <button
                        type="button"
                        onClick={isRecording ? handleStopRecording : handleStartRecording}
                        className={`w-11 h-11 flex items-center justify-center rounded-full text-xl transition duration-300 transform hover:scale-110 ${
                            isRecording ? "bg-red-500 hover:bg-red-600 text-white" : "hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                        }`}
                        aria-label={isRecording ? "Stop Recording" : "Record Voice Message"}
                        title={isRecording ? "Stop Recording" : "Record Voice Message"}
                    >
                        {isRecording ? "■" : "🎤"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowPicker((v) => !v)}
                        className={`w-11 h-11 flex items-center justify-center rounded-full text-xl transition duration-300 transform hover:scale-110 ${
                            showPicker
                                ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-purple-300"
                                : "hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                        }`}
                        aria-label="Emoji & Stickers"
                        title="Emoji & Stickers"
                    >
                        😊
                    </button>

                    {showPicker && (
                        <Suspense
                            fallback={
                                <div className="absolute bottom-full mb-3 left-0 z-50 w-[360px] h-[440px] rounded-3xl bg-white dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center">
                                    <div className="w-10 h-10 rounded-full border-3 border-purple-400 border-t-transparent animate-spin" />
                                </div>
                            }
                        >
                            <EmojiStickerPicker
                                onEmojiSelect={handleEmojiSelect}
                                onStickerSelect={handleStickerSelect}
                                onClose={() => setShowPicker(false)}
                            />
                        </Suspense>
                    )}
                </div>

                <div className="flex-1 flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-full px-5 gap-3 relative shadow-sm dark:shadow-none">
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={editingMessage ? "Edit message..." : "Type a message..."}
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) handleSendMessage(e);
                        }}
                        disabled={isSending}
                        className="flex-1 bg-transparent text-slate-800 dark:text-white text-base py-3.5 outline-none placeholder-slate-400 dark:placeholder-gray-400 disabled:opacity-50"
                    />

                    {/* Recording timer display */}
                    {isRecording && (
                        <span className="text-sm text-red-600 mr-2">
                            {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                        </span>
                    )}

                    {/* Typing indicator */}
                    {typingUsers.length > 0 && (
                        <div className="absolute bottom-full mb-2 left-0 text-sm text-slate-500 dark:text-gray-400 flex items-center gap-2">
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                            </div>
                            <span>
                                {typingUsers.length === 1 
                                    ? `${selectedUser?.fullName || "Someone"} is typing...` 
                                    : "Several people are typing..."}
                            </span>
                        </div>
                    )}

                    <label
                        htmlFor="chat-file"
                        className={`cursor-pointer flex-shrink-0 transition duration-300 ${
                            isSending ? "opacity-40 pointer-events-none" : ""
                        }`}
                        title="Send file"
                    >
                        <span className="text-xl opacity-70 hover:opacity-100 transition duration-300">📎</span>
                    </label>
                    <input
                        id="chat-file"
                        type="file"
                        hidden
                        onChange={handleSendFile}
                    />

                    <label
                        htmlFor="chat-image"
                        className={`cursor-pointer flex-shrink-0 transition duration-300 ${
                            isSending ? "opacity-40 pointer-events-none" : ""
                        }`}
                        title="Send image"
                    >
                        <img
                            src={assets.gallery_icon}
                            alt="Attach image"
                            className="w-6 opacity-70 hover:opacity-100 transition duration-300"
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

                <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={isSending || !input.trim()}
                    className="flex-shrink-0 disabled:opacity-40 transition duration-300 transform hover:scale-110 active:scale-95"
                    aria-label="Send message"
                >
                    {isSending ? (
                        <div className="w-11 h-11 rounded-full border-3 border-purple-400 border-t-transparent animate-spin" />
                    ) : (
                        <img src={assets.send_button} alt="Send" className="w-11" />
                    )}
                </button>
            </div>

            {showVoiceChat && (
                <VoiceChatModal 
                    type={typeof showVoiceChat === 'string' ? showVoiceChat : showVoiceChat.type || "voice"} 
                    incomingData={typeof showVoiceChat === 'object' ? showVoiceChat : null}
                    onClose={() => setShowVoiceChat(null)} 
                />
            )}
        </div>
    );
};

export default ChatContainer;
