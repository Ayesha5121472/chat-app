import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import { ThemeContext } from "../../context/ThemeContext";
import assets from "../assets/assets";
import VoiceChatModal from "./VoiceChatModal";

const imgError = (e) => {
    e.target.src = assets.avatar_icon;
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
                                        src={user.profilePic || assets.avatar_icon}
                                        alt={user.fullName}
                                        onError={imgError}
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
                                        src={member.profilePic || assets.avatar_icon}
                                        alt={member.fullName}
                                        onError={imgError}
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
    const [content, setContent] = useState("");
    const [type, setType] = useState("text");
    const [loading, setLoading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image");
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert("Image size must be less than 10MB");
            return;
        }

        setLoading(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
            setContent(reader.result);
            setType("image");
            setLoading(false);
        };
        reader.onerror = () => {
            alert("Failed to read image");
            setLoading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim() && type === "text") return;
        if (!content && type === "image") return;

        setLoading(true);
        await onCreate({ content, type });
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 max-w-md w-[95%] border border-white/10 shadow-2xl animate-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                        Create Story
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-3xl transition duration-300 hover:rotate-90"
                    >
                        ×
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex gap-3 mb-2">
                        <button
                            type="button"
                            onClick={() => setType("text")}
                            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition duration-300 ${
                                type === "text"
                                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                            }`}
                        >
                            Text
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                document.getElementById("story-image-input").click();
                            }}
                            className={`flex-1 py-3 rounded-2xl text-sm font-bold transition duration-300 ${
                                type === "image"
                                    ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                            }`}
                        >
                            Image
                        </button>
                    </div>
                    <input
                        id="story-image-input"
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={handleFileChange}
                    />
                    {type === "text" ? (
                        <textarea
                            placeholder="What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none placeholder-gray-400 transition duration-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none text-lg"
                        />
                    ) : (
                        <div>
                            {content ? (
                                <div className="bg-white/5 rounded-2xl p-4">
                                    <img
                                        src={content}
                                        alt="Story preview"
                                        className="w-full max-h-64 object-contain rounded-xl"
                                    />
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-2xl p-8 text-center text-gray-400">
                                    Click "Image" to select a file
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold rounded-2xl py-3 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/30"
                    >
                        {loading ? "Creating..." : "Share Story"}
                    </button>
                </form>
            </div>
        </div>
    );
};

const Stories = ({ stories, authUser, onDelete }) => {
    const [currentStoryIndex, setCurrentStoryIndex] = useState(null);

    if (stories.length === 0) return null;

    const groupedByUser = stories.reduce((acc, story) => {
        const userId = story.userId._id;
        if (!acc[userId]) {
            acc[userId] = [];
        }
        acc[userId].push(story);
        return acc;
    }, {});

    const userStoryGroups = Object.entries(groupedByUser);

    const handleNext = () => {
        if (currentStoryIndex < userStoryGroups.length - 1) {
            setCurrentStoryIndex((prev) => prev + 1);
        } else {
            setCurrentStoryIndex(null);
        }
    };

    const handlePrev = () => {
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex((prev) => prev - 1);
        }
    };

    return (
        <div className="px-5 py-4 border-b border-white/10">
            <div className="flex gap-4 overflow-x-auto pb-2">
                <button
                    onClick={() =>
                        setCurrentStoryIndex(
                            currentStoryIndex === null ? 0 : null
                        )
                    }
                    className="flex flex-col items-center gap-2 flex-shrink-0"
                >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl shadow-lg shadow-purple-500/30 transform hover:scale-110 transition duration-300">
                        +
                    </div>
                    <span className="text-xs text-gray-300 truncate w-16 text-center font-medium">
                        Add Story
                    </span>
                </button>
                {userStoryGroups.map(([userId, userStories], idx) => {
                    const isOwn = userId === authUser._id;
                    const user = userStories[0].userId;
                    return (
                        <div
                            key={userId}
                            onClick={() => setCurrentStoryIndex(idx)}
                            className="flex flex-col items-center gap-2 cursor-pointer flex-shrink-0"
                        >
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-0.5 transform hover:scale-110 transition duration-300 shadow-lg shadow-purple-500/20">
                                <img
                                    src={user.profilePic || assets.avatar_icon}
                                    alt={user.fullName}
                                    onError={imgError}
                                    className="w-full h-full rounded-full object-cover bg-slate-800"
                                />
                            </div>
                            <span className="text-xs text-gray-300 truncate w-16 text-center font-medium">
                                {isOwn ? "You" : user.fullName}
                            </span>
                        </div>
                    );
                })}
            </div>
            {currentStoryIndex !== null && (
                <div className="fixed inset-0 bg-black z-[1000] flex items-center justify-center">
                    <button
                        onClick={() => setCurrentStoryIndex(null)}
                        className="absolute top-4 right-4 text-white text-4xl transition duration-300 hover:rotate-90 z-10"
                    >
                        ×
                    </button>
                    {currentStoryIndex > 0 && (
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-white text-5xl transition duration-300 hover:scale-125"
                        >
                            ‹
                        </button>
                    )}
                    {currentStoryIndex < userStoryGroups.length - 1 && (
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white text-5xl transition duration-300 hover:scale-125"
                        >
                            ›
                        </button>
                    )}
                    <div className="max-w-lg w-full px-4">
                        {userStoryGroups[currentStoryIndex][1].map((story, idx2) => (
                            <div
                                key={story._id}
                                className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl overflow-hidden shadow-2xl"
                            >
                                {story.type === "image" ? (
                                    <img
                                        src={story.content}
                                        alt="Story"
                                        className="w-full max-h-[70vh] object-contain"
                                    />
                                ) : (
                                    <div className="p-12 min-h-[50vh] flex items-center justify-center">
                                        <p className="text-white text-2xl text-center font-semibold">
                                            {story.content}
                                        </p>
                                    </div>
                                )}
                                <div className="p-6 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={
                                                story.userId.profilePic ||
                                                assets.avatar_icon
                                            }
                                            alt={story.userId.fullName}
                                            onError={imgError}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        <span className="text-white font-semibold">
                                            {story.userId.fullName}
                                        </span>
                                    </div>
                                    {story.userId._id === authUser._id && (
                                        <button
                                            onClick={() => {
                                                onDelete(story._id);
                                                setCurrentStoryIndex(null);
                                            }}
                                            className="text-red-400 font-semibold transition duration-300 hover:text-red-300"
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
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

    const filteredUsers = searchInput.trim()
        ? users.filter((u) =>
              u.fullName.toLowerCase().includes(searchInput.toLowerCase())
          )
        : users;

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
            className={`bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 h-full flex flex-col text-white border-r border-white/10 ${
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
                            className="p-3 rounded-xl hover:bg-white/10 transition duration-300 transform hover:scale-110"
                            aria-label="Voice Chat"
                        >
                            📞
                        </button>
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="p-3 rounded-xl hover:bg-white/10 transition duration-300 transform hover:rotate-12"
                            aria-label="Toggle theme"
                        >
                            {theme === "dark" ? "☀️" : "🌙"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowCreateStoryModal(true)}
                            className="p-3 rounded-xl hover:bg-white/10 transition duration-300 transform hover:scale-110"
                            aria-label="Create story"
                        >
                            📸
                        </button>
                        <div className="relative group">
                            <button
                                type="button"
                                aria-label="Menu"
                                className="p-3 rounded-xl hover:bg-white/10 transition duration-300"
                            >
                                <img src={assets.menu_icon} alt="Menu" className="w-5" />
                            </button>
                            <div className="absolute top-full right-0 z-30 mt-2 w-36 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl hidden group-hover:block py-3">
                                <button
                                    type="button"
                                    onClick={() => navigate("/profile")}
                                    className="w-full text-left px-5 py-2 text-sm text-gray-200 hover:bg-white/10 transition duration-300"
                                >
                                    Edit Profile
                                </button>
                                <hr className="border-white/10 mx-3 my-2" />
                                <button
                                    type="button"
                                    onClick={logout}
                                    className="w-full text-left px-5 py-2 text-sm text-red-400 hover:bg-white/10 transition duration-300"
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
                />

                <div className="bg-white/5 border border-white/10 rounded-3xl flex items-center gap-4 py-3 px-5 my-4 transition duration-300 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
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
                        className="bg-transparent outline-none text-white text-sm placeholder-gray-400 flex-1"
                    />
                </div>

                <div className="flex gap-3 mb-4">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition duration-300 ${
                            activeTab === "users"
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                                : "bg-white/10 text-gray-400 hover:bg-white/20"
                        }`}
                    >
                        💬 Direct Messages
                    </button>
                    <button
                        onClick={() => setActiveTab("groups")}
                        className={`flex-1 py-3 rounded-2xl text-sm font-bold transition duration-300 ${
                            activeTab === "groups"
                                ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/30"
                                : "bg-white/10 text-gray-400 hover:bg-white/20"
                        }`}
                    >
                        👥 Groups
                    </button>
                </div>

                {activeTab === "groups" && (
                    <button
                        onClick={() => setShowCreateGroupModal(true)}
                        className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-300 text-sm font-bold hover:from-purple-500/30 hover:to-blue-500/30 transition duration-300 transform hover:scale-[1.02] active:scale-[0.98] mb-2"
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
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition duration-300 transform hover:scale-[1.01] hover:bg-white/10 mb-2 ${
                                        isSelected
                                            ? "bg-white/10 border-l-4 border-purple-500"
                                            : ""
                                    }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <img
                                            src={user.profilePic || assets.avatar_icon}
                                            alt={user.fullName}
                                            onError={imgError}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        {isOnline && (
                                            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-4 border-slate-900 animate-pulse" />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-base font-bold truncate text-white">
                                            {user.fullName}
                                        </p>
                                        <p
                                            className={`text-sm ${
                                                isOnline ? "text-green-400" : "text-gray-400"
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
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition duration-300 transform hover:scale-[1.01] hover:bg-white/10 mb-2 ${
                                        isSelected
                                            ? "bg-white/10 border-l-4 border-purple-500"
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
                                            <p className="text-base font-bold truncate text-white">
                                                {group.name}
                                            </p>
                                            <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-0.5 rounded-full font-semibold">
                                                {group.category}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-400">
                                            {group.members?.length || 0} members
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleLeaveGroup(group._id, e)}
                                        className="text-gray-500 hover:text-red-400 text-lg p-1 transition duration-300"
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
                <div className="flex-shrink-0 p-6 border-t border-white/10 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 p-0.5">
                        <img
                            src={authUser.profilePic || assets.avatar_icon}
                            alt={authUser.fullName}
                            onError={imgError}
                            className="w-full h-full rounded-full object-cover"
                        />
                    </div>
                    <p className="text-base text-gray-300 font-bold truncate flex-1">
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
