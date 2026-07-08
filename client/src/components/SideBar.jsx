import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import assets from "../assets/assets";

// Fallback handler — if a profile pic URL is broken, show the default avatar
const imgError = (e) => { e.target.src = assets.avatar_icon; };

const SideBar = () => {
    const {
        getUsers,
        users,
        selectedUser,
        setSelectedUser,
        unseenMessages,
        setUnseenMessages,
    } = useContext(ChatContext);

    const { logout, onlineUsers, authUser } = useContext(AuthContext);

    const [searchInput, setSearchInput] = useState("");
    const navigate = useNavigate();

    // Re-fetch when online users list changes so Online/Offline status updates
    // getUsers is stable (defined outside effects), safe to include in deps
    useEffect(() => {
        if (onlineUsers.length >= 0) getUsers();
    }, [onlineUsers.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const filteredUsers = searchInput.trim()
        ? users.filter((u) =>
              u.fullName.toLowerCase().includes(searchInput.toLowerCase())
          )
        : users;

    return (
        <div className={`bg-[#8185B2]/10 h-full flex flex-col text-white ${selectedUser ? "max-md:hidden" : ""}`}>

            {/* ── Header ── */}
            <div className="p-5 flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                    <img src={assets.logo} alt="Logo" className="max-w-36" />

                    <div className="relative group">
                        <button type="button" aria-label="Menu"
                            className="p-1 rounded-md hover:bg-white/10 transition">
                            <img src={assets.menu_icon} alt="Menu" className="w-5" />
                        </button>
                        <div className="absolute top-full right-0 z-30 mt-1 w-36 rounded-lg
                            bg-[#282142] border border-gray-600 shadow-lg hidden group-hover:block py-1">
                            <button type="button" onClick={() => navigate("/profile")}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition">
                                Edit Profile
                            </button>
                            <hr className="border-gray-600 mx-2" />
                            <button type="button" onClick={logout}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 transition">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="bg-[#282142] rounded-full flex items-center gap-2 py-2 px-4">
                    <img src={assets.search_icon} alt="Search" className="w-3 flex-shrink-0" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        className="bg-transparent outline-none text-white text-xs placeholder-gray-400 flex-1"
                    />
                </div>
            </div>

            {/* ── User list ── */}
            <div className="flex-1 overflow-y-auto px-2 pb-4">
                {filteredUsers.length === 0 && (
                    <p className="text-center text-gray-500 text-sm mt-6">No users found</p>
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
                                setUnseenMessages((prev) => ({ ...prev, [user._id]: 0 }));
                            }}
                            className={`relative flex items-center gap-3 p-3 rounded-lg cursor-pointer
                            transition hover:bg-[#282142]/60 ${isSelected ? "bg-[#282142]/80" : ""}`}
                        >
                            {/* Avatar */}
                            <div className="relative flex-shrink-0">
                                <img
                                    src={user.profilePic || assets.avatar_icon}
                                    alt={user.fullName}
                                    onError={imgError}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                {isOnline && (
                                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500
                                    rounded-full border-2 border-[#1a1a2e]" />
                                )}
                            </div>

                            {/* Name + status */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user.fullName}</p>
                                <p className={`text-xs ${isOnline ? "text-green-400" : "text-gray-400"}`}>
                                    {isOnline ? "Online" : "Offline"}
                                </p>
                            </div>

                            {/* Unread badge */}
                            {unread > 0 && (
                                <span className="flex-shrink-0 min-w-[20px] h-5 px-1 text-[11px] font-bold
                                bg-violet-500 text-white rounded-full flex items-center justify-center">
                                    {unread > 99 ? "99+" : unread}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Current user footer ── */}
            {authUser && (
                <div className="flex-shrink-0 p-4 border-t border-gray-600/50 flex items-center gap-3">
                    <img
                        src={authUser.profilePic || assets.avatar_icon}
                        alt={authUser.fullName}
                        onError={imgError}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <p className="text-sm text-gray-300 truncate flex-1">{authUser.fullName}</p>
                </div>
            )}
        </div>
    );
};

export default SideBar;
