import { useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import { ThemeContext } from "../../context/ThemeContext";
import assets from "../assets/assets";
import VoiceChatModal from "./VoiceChatModal";

const imgError = (e, name) => {
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;
};

const CreateGroupModal = ({ onClose, onCreate, allUsers }) => {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [rules, setRules] = useState("");
    const [category, setCategory] = useState("General");
    const [welcomeMessage, setWelcomeMessage] = useState("Welcome to the group! 👋");
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [loading, setLoading] = useState(false);

    const categories = [
        "General",
        "Technology",
        "Gaming",
        "Music",
        "Sports",
        "Food",
        "Travel",
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        await onCreate({
            name: name.trim(),
            description: description.trim(),
            rules: rules.trim(),
            category,
            welcomeMessage: welcomeMessage.trim(),
            memberIds: selectedMembers,
        });
        setLoading(false);
        onClose();
    };

    const toggleMember = (userId) => {
        setSelectedMembers((prev) =>
            prev.includes(userId)
                ? prev.filter((id) => id !== userId)
                : [...prev, userId]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-[95%] border border-white/10 shadow-2xl animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Create Group
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-3xl transition duration-300 hover:rotate-90"
                    >
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Group name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none placeholder-gray-400 transition duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        required
                    />
                    <textarea
                        placeholder="Group description (optional)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none placeholder-gray-400 transition duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    />
                    <textarea
                        placeholder="Group rules (optional)"
                        value={rules}
                        onChange={(e) => setRules(e.target.value)}
                        rows={2}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none placeholder-gray-400 transition duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    />
                    <input
                        type="text"
                        placeholder="Welcome message"
                        value={welcomeMessage}
                        onChange={(e) => setWelcomeMessage(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none placeholder-gray-400 transition duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white outline-none transition duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                        {categories.map((cat) => (
                            <option key={cat} value={cat} className="bg-slate-900">
                                {cat}
                            </option>
                        ))}
                    </select>
                    <div>
                        <p className="text-sm text-gray-300 mb-3 font-semibold">Add members (optional)</p>
                        <div className="max-h-32 overflow-y-auto bg-white/5 rounded-2xl p-3 space-y-2">
                            {allUsers.map((user) => (
                                <div
                                    key={user._id}
                                    onClick={() => toggleMember(user._id)}
                                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition duration-300 hover:bg-white/10 ${
                                        selectedMembers.includes(user._id)
                                            ? "bg-purple-500/20 border border-purple-500/30"
                                            : "border border-transparent"
                                    }`}
                                >
                                    <img
                                        src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`}
                                        alt={user.fullName}
                                        onError={(e) => imgError(e, user.fullName)}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <p className="text-white font-medium truncate">
                                        {user.fullName}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/30"
                    >
                        {loading ? "Creating..." : "Create Group"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const GroupDetailsModal = ({
    group,
    authUser,
    onClose,
    onDelete,
    onAddMember,
    onRemoveMember,
    onLeave,
    allUsers,
}) => {
    const isCreator = group.creator?._id === authUser._id;
    const isAdmin =
        isCreator || group.admins?.some((a) => a._id === authUser._id);

    const usersNotInGroup = allUsers.filter(
        (u) => !group.members?.some((m) => m._id === u._id)
    );

    const handleAddMember = async (userId) => {
        await onAddMember(group._id, userId);
    };

    const handleRemoveMember = async (userId) => {
        await onRemoveMember(group._id, userId);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-[95%] border border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        {group.name}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-3xl transition duration-300 hover:rotate-90"
                    >
                        ×
                    </button>
                </div>
                <div className="flex flex-col gap-4 text-gray-300 mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🏷️</span>
                        <span className="bg-purple-500/20 text-purple-300 px-4 py-1 rounded-full font-semibold">
                            {group.category}
                        </span>
                    </div>
                    {group.description && (
                        <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5">📝</span>
                            <p className="text-gray-200">{group.description}</p>
                        </div>
                    )}
                    {group.rules && (
                        <div className="flex items-start gap-3">
                            <span className="text-2xl mt-0.5">📜</span>
                            <p className="text-gray-200">{group.rules}</p>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">👥</span>
                        <span className="text-gray-200 font-semibold">{group.members?.length || 0} members</span>
                    </div>
                </div>
                <div className="border-t border-white/10 pt-4 mb-4">
                    <h3 className="text-white font-bold mb-4">Members</h3>
                    <div className="max-h-36 overflow-y-auto space-y-2">
                        {group.members?.map((member) => (
                            <div
                                key={member._id}
                                className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                            >
                                <div className="flex items-center gap-3">
                                    <img
                                        src={member.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.fullName)}&background=random`}
                                        alt={member.fullName}
                                        onError={(e) => imgError(e, member.fullName)}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                    <p className="text-white font-medium truncate">
                                        {member.fullName}
                                        {member._id === group.creator?._id && (
                                            <span className="ml-2 text-xs text-purple-300 font-semibold bg-purple-500/20 px-2 py-0.5 rounded-full">
                                                Creator
                                            </span>
                                        )}
                                    </p>
                                </div>
                                {isAdmin && member._id !== authUser._id && (
                                    <button
                                        onClick={() => handleRemoveMember(member._id)}
                                        className="text-red-400 hover:text-red-300 text-sm font-semibold transition duration-300"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {isAdmin && usersNotInGroup.length > 0 && (
                    <div className="border-t border-white/10 pt-4 mb-4">
                        <h3 className="text-white font-bold mb-4">Add Members</h3>
                        <div className="max-h-36 overflow-y-auto space-y-2">
                            {usersNotInGroup.map((user) => (
                                <div
                                    key={user._id}
                                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                                >
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={user.profilePic || assets.avatar_icon}
                                            alt={user.fullName}
                                            onError={imgError}
                                            className="w-10 h-10 rounded-full object-cover"
                                        />
                                        <p className="text-white font-medium truncate">
                                            {user.fullName}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleAddMember(user._id)}
                                        className="text-purple-400 hover:text-purple-300 text-sm font-semibold transition duration-300"
                                    >
                                        Add
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                <div className="border-t border-white/10 pt-4 space-y-3">
                    <button
                        onClick={() => onLeave(group._id)}
                        className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl py-3 transition duration-300"
                    >
                        Leave Group
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => onDelete(group._id)}
                            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold rounded-2xl py-3 transition duration-300"
                        >
                            Delete Group
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CreateStoryModal = ({ onClose, onCreate }) => {
    // Queue of stories to post: [{type, content, preview}]
    const [queue, setQueue] = useState([]);
    const [currentType, setCurrentType] = useState("text");
    const [textInput, setTextInput] = useState("");
    const [loading, setLoading] = useState(false);

    const addTextStory = () => {
        if (!textInput.trim()) return;
        setQueue((prev) => [...prev, { type: "text", content: textInput.trim() }]);
        setTextInput("");
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach((file) => {
            if (!file.type.startsWith("image/")) return;
            if (file.size > 10 * 1024 * 1024) { alert("Image too large (max 10MB)"); return; }
            const reader = new FileReader();
            reader.onloadend = () => {
                setQueue((prev) => [...prev, { type: "image", content: reader.result }]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    };

    const removeFromQueue = (idx) => {
        setQueue((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (queue.length === 0) return;
        setLoading(true);
        for (const item of queue) {
            await onCreate({ content: item.content, type: item.type });
        }
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 max-w-lg w-[95%] border border-white/10 shadow-2xl animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-5">
                    <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Create Stories
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl transition duration-300 hover:rotate-90">×</button>
                </div>

                {/* Type selector */}
                <div className="flex gap-3 mb-4">
                    <button
                        type="button"
                        onClick={() => setCurrentType("text")}
                        className={`flex-1 py-2.5 rounded-2xl text-sm font-bold transition duration-300 ${currentType === "text" ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30" : "bg-white/10 text-gray-400 hover:bg-white/20"}`}
                    >
                        ✍️ Text
                    </button>
                    <button
                        type="button"
                        onClick={() => document.getElementById("story-image-input-multi").click()}
                        className="flex-1 py-2.5 rounded-2xl text-sm font-bold bg-white/10 text-gray-400 hover:bg-white/20 transition duration-300"
                    >
                        🖼️ Add Images
                    </button>
                    <input
                        id="story-image-input-multi"
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleFileChange}
                    />
                </div>

                {/* Text input */}
                {currentType === "text" && (
                    <div className="flex gap-2 mb-4">
                        <textarea
                            placeholder="What's on your mind?"
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            rows={3}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none placeholder-gray-400 transition duration-300 focus:ring-2 focus:ring-purple-500 resize-none text-base"
                        />
                        <button
                            type="button"
                            onClick={addTextStory}
                            disabled={!textInput.trim()}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-2xl font-bold transition self-end"
                        >
                            + Add
                        </button>
                    </div>
                )}

                {/* Queue preview */}
                {queue.length > 0 && (
                    <div className="mb-4">
                        <p className="text-xs text-gray-400 mb-2 font-semibold">{queue.length} {queue.length === 1 ? "story" : "stories"} ready to post</p>
                        <div className="flex gap-2 overflow-x-auto pb-1">
                            {queue.map((item, idx) => (
                                <div key={idx} className="relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                                    {item.type === "image" ? (
                                        <img src={item.content} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center p-1">
                                            <p className="text-white text-[9px] text-center leading-tight line-clamp-4">{item.content}</p>
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => removeFromQueue(idx)}
                                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] flex items-center justify-center leading-none hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading || queue.length === 0}
                    className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-40 text-white font-semibold rounded-2xl py-3 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/30"
                >
                    {loading ? `Posting ${queue.length} ${queue.length === 1 ? "story" : "stories"}...` : `🚀 Share ${queue.length > 0 ? queue.length : ""} ${queue.length === 1 ? "Story" : queue.length > 1 ? "Stories" : "Story"}`}
                </button>
                <p className="text-center text-xs text-gray-500 mt-3">Stories expire automatically after 24 hours ⏰</p>
            </div>
        </div>
    );
};


const StoryViewer = ({ userStoryGroups, startUserIdx, authUser, onDelete, onView, onClose }) => {
    const [userIdx, setUserIdx] = useState(startUserIdx);
    const [storyIdx, setStoryIdx] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [showViewers, setShowViewers] = useState(false);
    const timerRef = useRef(null);
    const STORY_DURATION = 5000; // 5 seconds per story

    const currentUserStories = userStoryGroups[userIdx]?.[1] || [];
    const currentStory = currentUserStories[storyIdx];
    const isOwn = currentStory?.userId?._id?.toString() === authUser._id?.toString();

    // Mark viewed when story changes
    useEffect(() => {
        if (currentStory && !isOwn) {
            onView?.(currentStory._id, authUser);
        }
        setShowViewers(false);
    }, [userIdx, storyIdx]);

    // Progress timer
    useEffect(() => {
        if (paused) return;
        setProgress(0);
        const start = Date.now();
        timerRef.current = setInterval(() => {
            const elapsed = Date.now() - start;
            const pct = Math.min((elapsed / STORY_DURATION) * 100, 100);
            setProgress(pct);
            if (pct >= 100) {
                clearInterval(timerRef.current);
                advanceStory();
            }
        }, 50);
        return () => clearInterval(timerRef.current);
    }, [userIdx, storyIdx, paused]);

    const advanceStory = () => {
        if (storyIdx < currentUserStories.length - 1) {
            setStoryIdx((p) => p + 1);
        } else if (userIdx < userStoryGroups.length - 1) {
            setUserIdx((p) => p + 1);
            setStoryIdx(0);
        } else {
            onClose();
        }
    };

    const goBackStory = () => {
        if (storyIdx > 0) {
            setStoryIdx((p) => p - 1);
        } else if (userIdx > 0) {
            setUserIdx((p) => p - 1);
            setStoryIdx(0);
        }
    };

    const goNextUser = () => {
        if (userIdx < userStoryGroups.length - 1) {
            setUserIdx((p) => p + 1);
            setStoryIdx(0);
        } else onClose();
    };
    const goPrevUser = () => {
        if (userIdx > 0) { setUserIdx((p) => p - 1); setStoryIdx(0); }
    };

    const viewers = currentStory?.views || [];
    const timeLeft = currentStory ? Math.max(0, Math.round((new Date(currentStory.expiresAt) - Date.now()) / 3600000)) : 0;

    if (!currentStory) return null;

    return (
        <div className="fixed inset-0 bg-black z-[2000] flex items-center justify-center">
            {/* Prev user arrow */}
            {userIdx > 0 && (
                <button onClick={goPrevUser} className="absolute left-3 top-1/2 -translate-y-1/2 z-20 text-white text-5xl opacity-70 hover:opacity-100 transition bg-black/20 rounded-full w-10 h-10 flex items-center justify-center">‹</button>
            )}
            {/* Next user arrow */}
            {userIdx < userStoryGroups.length - 1 && (
                <button onClick={goNextUser} className="absolute right-3 top-1/2 -translate-y-1/2 z-20 text-white text-5xl opacity-70 hover:opacity-100 transition bg-black/20 rounded-full w-10 h-10 flex items-center justify-center">›</button>
            )}

            {/* Story card — full screen */}
            <div
                className="relative w-full h-full max-w-md mx-auto"
                onMouseDown={() => setPaused(true)}
                onMouseUp={() => setPaused(false)}
                onTouchStart={() => setPaused(true)}
                onTouchEnd={() => setPaused(false)}
            >
                {/* Progress bars */}
                <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
                    {currentUserStories.map((_, i) => (
                        <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white rounded-full transition-none"
                                style={{
                                    width: i < storyIdx ? "100%" : i === storyIdx ? `${progress}%` : "0%",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-5 left-0 right-0 z-10 flex items-center justify-between px-3 pt-2">
                    <div className="flex items-center gap-2">
                        <img
                            src={currentStory.userId.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStory.userId.fullName)}&background=random`}
                            alt={currentStory.userId.fullName}
                            onError={(e) => imgError(e, currentStory.userId.fullName)}
                            className="w-9 h-9 rounded-full object-cover border-2 border-white"
                        />
                        <div>
                            <p className="text-white text-sm font-bold drop-shadow">{isOwn ? "You" : currentStory.userId.fullName}</p>
                            <p className="text-white/70 text-[10px]">⏰ {timeLeft}h left</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white text-2xl hover:rotate-90 transition w-8 h-8 flex items-center justify-center">×</button>
                </div>

                {/* Tap zones for navigation */}
                <div className="absolute inset-0 z-[5] flex">
                    <div className="flex-1 cursor-pointer" onClick={goBackStory} />
                    <div className="flex-1 cursor-pointer" onClick={advanceStory} />
                </div>

                {/* Content */}
                {currentStory.type === "image" ? (
                    <img
                        src={currentStory.content}
                        alt="Story"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div
                        className="w-full h-full flex items-center justify-center p-8"
                        style={{ background: "linear-gradient(135deg, #6d28d9, #3b82f6)" }}
                    >
                        <p className="text-white text-2xl text-center font-bold leading-relaxed drop-shadow-lg">
                            {currentStory.content}
                        </p>
                    </div>
                )}

                {/* Bottom bar */}
                <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4 pt-16 bg-gradient-to-t from-black/70 to-transparent">
                    <div className="flex items-center justify-between">
                        {/* Viewers (own story only) */}
                        {isOwn ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowViewers((v) => !v); }}
                                className="flex items-center gap-2 text-white/80 hover:text-white text-sm transition"
                            >
                                <span>👁️</span>
                                <span>{viewers.length} {viewers.length === 1 ? "view" : "views"}</span>
                            </button>
                        ) : (
                            <div />
                        )}
                        {/* Delete (own story only) */}
                        {isOwn && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(currentStory._id);
                                    if (currentUserStories.length > 1) {
                                        advanceStory();
                                    } else {
                                        onClose();
                                    }
                                }}
                                className="text-red-400 hover:text-red-300 text-sm font-semibold transition flex items-center gap-1"
                            >
                                🗑️ Delete
                            </button>
                        )}
                    </div>

                    {/* Viewers list popup */}
                    {showViewers && isOwn && viewers.length > 0 && (
                        <div className="mt-3 bg-black/60 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                            <p className="text-white/60 text-xs mb-2 font-semibold">Seen by</p>
                            <div className="flex flex-col gap-2 max-h-32 overflow-y-auto">
                                {viewers.map((v) => (
                                    <div key={v._id || v} className="flex items-center gap-2">
                                        <img
                                            src={v.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(v.fullName || "?")}&background=random`}
                                            alt={v.fullName}
                                            onError={(e) => imgError(e, v.fullName)}
                                            className="w-7 h-7 rounded-full object-cover"
                                        />
                                        <span className="text-white text-xs font-medium">{v.fullName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {showViewers && isOwn && viewers.length === 0 && (
                        <div className="mt-3 bg-black/40 rounded-2xl p-3 text-center">
                            <p className="text-white/50 text-xs">No views yet</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Stories = ({ stories, authUser, onDelete, onView, onAdd }) => {
    const [viewerUserIdx, setViewerUserIdx] = useState(null);

    const groupedByUser = stories.reduce((acc, story) => {
        const uid = story.userId._id?.toString() || story.userId;
        if (!acc[uid]) acc[uid] = [];
        acc[uid].push(story);
        return acc;
    }, {});

    const userStoryGroups = Object.entries(groupedByUser);

    return (
        <div className="px-5 py-4 border-b border-white/10">
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {/* Add Story — always first */}
                <button
                    onClick={onAdd}
                    className="flex flex-col items-center gap-2 flex-shrink-0 group"
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-0.5 relative transform group-hover:scale-110 transition duration-300 shadow-lg shadow-purple-500/30">
                        <img
                            src={authUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.fullName)}&background=6d28d9`}
                            alt={authUser.fullName}
                            onError={(e) => imgError(e, authUser.fullName)}
                            className="w-full h-full rounded-full object-cover"
                        />
                        <span className="absolute bottom-0 right-0 w-5 h-5 bg-purple-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-white text-xs font-bold">+</span>
                    </div>
                    <span className="text-xs text-gray-300 truncate w-16 text-center font-medium">You</span>
                </button>

                {/* Other users' stories */}
                {userStoryGroups.map(([userId, userStories], idx) => {
                    const user = userStories[0].userId;
                    const isOwn = userId === authUser._id?.toString();
                    const hasUnviewed = userStories.some(
                        (s) => !(s.views || []).some((v) => (v._id || v)?.toString() === authUser._id?.toString())
                    );
                    return (
                        <button
                            key={userId}
                            onClick={() => setViewerUserIdx(idx)}
                            className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0 group"
                        >
                            <div className={`w-16 h-16 rounded-full p-0.5 transform group-hover:scale-110 transition duration-300 shadow-lg ${hasUnviewed || isOwn ? "bg-gradient-to-br from-purple-500 to-pink-500 shadow-purple-500/20" : "bg-gray-600/40"}`}>
                                <img
                                    src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`}
                                    alt={user.fullName}
                                    onError={(e) => imgError(e, user.fullName)}
                                    className="w-full h-full rounded-full object-cover bg-slate-800"
                                />
                            </div>
                            <span className="text-xs text-gray-300 truncate w-16 text-center font-medium">
                                {isOwn ? "Your story" : user.fullName}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Instagram-style full-screen viewer */}
            {viewerUserIdx !== null && (
                <StoryViewer
                    userStoryGroups={userStoryGroups}
                    startUserIdx={viewerUserIdx}
                    authUser={authUser}
                    onDelete={onDelete}
                    onView={onView}
                    onClose={() => setViewerUserIdx(null)}
                />
            )}
        </div>
    );
};

const SideBar = () => {
    const {
        getUsers,
        users,
        selectedUser,
        setSelectedUser,
        selectedGroup,
        setSelectedGroup,
        unseenMessages,
        setUnseenMessages,
        groups,
        getMyGroups,
        createGroup,
        leaveGroup,
        deleteGroup,
        addGroupMember,
        removeGroupMember,
        stories,
        createStory,
        deleteStory,
        markStoryViewed,
    } = useContext(ChatContext);

    const { logout, onlineUsers, authUser } = useContext(AuthContext);
    const { theme, toggleTheme } = useContext(ThemeContext);

    const [searchInput, setSearchInput] = useState("");
    const [activeTab, setActiveTab] = useState("users");
    const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
    const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
    const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(null);
    const [showVoiceChat, setShowVoiceChat] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        if (authUser) {
            getMyGroups();
        }
    }, [authUser]);

    useEffect(() => {
        if (onlineUsers.length >= 0) getUsers();
    }, [onlineUsers.length]);

    const filteredUsers = (searchInput.trim()
        ? users.filter((u) =>
              u.fullName.toLowerCase().includes(searchInput.toLowerCase())
          )
        : users
    ).filter((u) => u._id?.toString() !== authUser?._id?.toString()); // Never show self in contacts


    const filteredGroups = searchInput.trim()
        ? groups.filter((g) =>
              g.name.toLowerCase().includes(searchInput.toLowerCase())
          )
        : groups;

    const handleLeaveGroup = async (groupId, e) => {
        if (e) e.stopPropagation();
        await leaveGroup(groupId);
    };

    const handleDeleteGroup = async (groupId) => {
        await deleteGroup(groupId);
        setShowGroupDetailsModal(null);
    };

    return (
        <div
            className={`bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 h-full flex flex-col text-slate-800 dark:text-white border-r border-slate-200 dark:border-white/10 transition-colors duration-300 ${
                selectedUser || selectedGroup ? "max-md:hidden" : ""
            }`}
        >
            <div className="p-6 flex-shrink-0">
                <div className="flex justify-between items-center mb-6">
                    <img src={assets.logo} alt="Logo" className="max-w-40" />

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setShowVoiceChat(true)}
                            className="p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition duration-300 transform hover:scale-110"
                            aria-label="Voice Chat"
                        >
                            📞
                        </button>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition duration-300 transform hover:rotate-12"
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? "☀️" : "🌙"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateStoryModal(true)}
                            className="p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 transition duration-300 transform hover:scale-110"
                            aria-label="Create story"
                        >
                            📸
                        </button>
                        <div className="relative group">
                            <button
                                type="button"
                                aria-label="Menu"
                                className="p-3 rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition duration-300"
                            >
                                <img src={assets.menu_icon} alt="Menu" className="w-5" />
                            </button>
                            <div className="absolute top-full right-0 z-30 mt-2 w-36 rounded-2xl bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl hidden group-hover:block py-3">
                                <button
                                    type="button"
                                    onClick={() => navigate("/profile")}
                                    className="w-full text-left px-5 py-2 text-sm text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-white/10 transition duration-300"
                                >
                                    Edit Profile
                                </button>
                                <hr className="border-slate-200 dark:border-white/10 mx-3 my-2" />
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="w-full text-left px-5 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-white/10 transition duration-300"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <Stories
                    stories={stories}
                    authUser={authUser}
                    onDelete={deleteStory}
                    onView={markStoryViewed}
                    onAdd={() => setShowCreateStoryModal(true)}
                />

                <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl flex items-center gap-4 py-3 px-5 my-4 transition duration-300 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500 shadow-sm dark:shadow-none">
                    <img src={assets.search_icon} alt="Search" className="w-4 flex-shrink-0" />
                    <input
                        type="text"
                        placeholder={
                            activeTab === "users"
                                ? "Search users..."
                                : "Search groups..."
                        }
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="bg-transparent outline-none text-slate-800 dark:text-white text-sm placeholder-slate-400 dark:placeholder-gray-400 flex-1"
                    />
                </div>

                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition duration-300 ${
                            activeTab === "users"
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                                : "bg-slate-200/50 dark:bg-white/10 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/20"
                        }`}
                    >
                        💬 Direct Messages
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition duration-300 ${
                            activeTab === "groups"
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                                : "bg-slate-200/50 dark:bg-white/10 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-white/20"
                        }`}
                    >
                        👥 Groups
                    </button>
                </div>

                {activeTab === "groups" && (
                    <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="w-full py-3 rounded-2xl bg-purple-100 dark:bg-gradient-to-r dark:from-purple-500/20 dark:to-blue-500/20 border border-purple-200 dark:border-purple-500/30 text-purple-700 dark:text-purple-300 text-sm font-bold hover:bg-purple-200 dark:hover:from-purple-500/30 dark:hover:to-blue-500/30 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] mb-2"
                    >
                        ➕ Create Group
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-4">
                {activeTab === "users" ? (
                    <>
                        {filteredUsers.length === 0 && (
                            <p className="text-center text-gray-500 text-sm mt-10">
                                No users found
                            </p>
                        )}

                        {filteredUsers.map((user) => {
                            const isOnline = onlineUsers.includes(user._id);
                            const unread = unseenMessages[user._id] || 0;
                            const isSelected = selectedUser?._id === user._id;

                            return (
                                <div
                                    key={user._id}
                                    onClick={() => {
                                        setSelectedUser(user);
                                        setSelectedGroup(null);
                                        setUnseenMessages((prev) => ({
                                            ...prev,
                                            [user._id]: 0,
                                        }));
                                    }}
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition duration-300 transform hover:scale-[1.01] hover:bg-slate-200/50 dark:hover:bg-white/10 mb-2 animate-slide-in-up ${
                                        isSelected
                                            ? "bg-slate-200/50 dark:bg-white/10 border-l-4 border-purple-500"
                                            : ""
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={user.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=random`}
                                            alt={user.fullName}
                                            onError={(e) => imgError(e, user.fullName)}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-50 dark:border-slate-900 animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold truncate text-slate-800 dark:text-white">
                                            {user.fullName}
                                        </p>
                                        <p
                                            className={`text-sm ${
                                                isOnline ? "text-green-500 dark:text-green-400" : "text-slate-500 dark:text-gray-400"
                                            }`}
                                        >
                                            {isOnline ? "Online" : "Offline"}
                                        </p>
                                    </div>

                                    {unread > 0 && (
                                        <span className="flex-shrink-0 min-w-[32px] h-8 px-2 text-xs font-bold bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-purple-500/30">
                                            {unread > 99 ? "99+" : unread}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </>
                ) : (
                    <>
                        {filteredGroups.length === 0 && (
                            <p className="text-center text-gray-500 text-sm mt-10">
                                No groups yet. Create one!
                            </p>
                        )}

                        {filteredGroups.map((group) => {
                            const isSelected = selectedGroup?._id === group._id;

                            return (
                                <div
                                    key={group._id}
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition duration-300 transform hover:scale-[1.01] hover:bg-slate-200/50 dark:hover:bg-white/10 mb-2 animate-slide-in-up ${
                                        isSelected
                                            ? "bg-slate-200/50 dark:bg-white/10 border-l-4 border-purple-500"
                                            : ""
                                    }`}
                                >
                                    <div
                                        className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl flex-shrink-0 cursor-pointer transition duration-300 hover:scale-110"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowGroupDetailsModal(group);
                                        }}
                                    >
                                        ⚙️
                                    </div>
                                    <div
                                        className="flex-1 min-w-0 cursor-pointer"
                                        onClick={() => {
                                            setSelectedGroup(group);
                                            setSelectedUser(null);
                                        }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <p className="text-base font-bold truncate text-slate-800 dark:text-white">
                                                {group.name}
                                            </p>
                                            <span className="text-xs bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 px-3 py-0.5 rounded-full font-semibold">
                                                {group.category}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-500 dark:text-gray-400">
                                            {group.members?.length || 0} members
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleLeaveGroup(group._id, e)}
                                        className="text-slate-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 text-lg p-1 transition duration-300"
                                        title="Leave Group"
                                    >
                                        ✕
                                    </button>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {authUser && (
                <div className="flex-shrink-0 p-6 border-t border-slate-200 dark:border-white/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-0.5">
                        <img
                            src={authUser.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(authUser.fullName)}&background=random`}
                            alt={authUser.fullName}
                            onError={(e) => imgError(e, authUser.fullName)}
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    <p className="text-base text-slate-700 dark:text-gray-300 font-bold truncate flex-1">
                        {authUser.fullName}
                    </p>
                </div>
            )}

            {showCreateGroupModal && (
                <CreateGroupModal
                    onClose={() => setShowCreateGroupModal(false)}
                    onCreate={createGroup}
                    allUsers={users}
                />
            )}
            {showGroupDetailsModal && (
                <GroupDetailsModal
                    group={showGroupDetailsModal}
                    authUser={authUser}
                    onClose={() => setShowGroupDetailsModal(null)}
                    onDelete={handleDeleteGroup}
                    onAddMember={addGroupMember}
                    onRemoveMember={removeGroupMember}
                    onLeave={handleLeaveGroup}
                    allUsers={users}
                />
            )}
            {showCreateStoryModal && (
                <CreateStoryModal
                    onClose={() => setShowCreateStoryModal(false)}
                    onCreate={createStory}
                />
            )}
            {showVoiceChat && (
                <VoiceChatModal onClose={() => setShowVoiceChat(false)} />
            )}
        </div>
    );
};

export default SideBar;
