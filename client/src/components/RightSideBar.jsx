import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import assets from "../assets/assets";

const imgError = (e) => { e.target.src = assets.avatar_icon; };

const RightSideBar = () => {
    const { selectedUser, messages } = useContext(ChatContext);
    const { logout, onlineUsers } = useContext(AuthContext);

    const [msgImages, setMsgImages] = useState([]);

    useEffect(() => {
        setMsgImages(
            messages
                .filter((m) => m.image && m.image.trim() !== "")
                .map((m) => m.image)
        );
    }, [messages]);

    if (!selectedUser) return null;

    const isOnline = onlineUsers.includes(selectedUser._id);

    return (
        <div className="bg-[#8185B2]/10 text-white flex flex-col max-md:hidden overflow-hidden">

            {/* ── User info ── */}
            <div className="flex flex-col items-center gap-3 pt-12 pb-5 px-5 flex-shrink-0">
                <div className="relative">
                    <img
                        src={selectedUser.profilePic || assets.avatar_icon}
                        alt={selectedUser.fullName}
                        onError={imgError}
                        className="w-24 h-24 rounded-full object-cover border-2 border-gray-500"
                    />
                    {isOnline && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 bg-green-500
                        rounded-full border-2 border-[#1a1a2e]" />
                    )}
                </div>

                <div className="text-center">
                    <h2 className="text-lg font-semibold">{selectedUser.fullName}</h2>
                    <p className={`text-xs mt-0.5 ${isOnline ? "text-green-400" : "text-gray-400"}`}>
                        {isOnline ? "Online" : "Offline"}
                    </p>
                    <p className="text-sm text-gray-400 mt-2 px-4 leading-relaxed">
                        {selectedUser.bio || "No bio available."}
                    </p>
                </div>
            </div>

            <hr className="border-white/20 mx-4" />

            {/* ── Shared media ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                    Shared Media
                </p>

                {msgImages.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center mt-4">No media shared yet.</p>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        {msgImages.map((url, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => window.open(url, "_blank")}
                                className="rounded-lg overflow-hidden aspect-square focus:outline-none
                                hover:opacity-80 transition"
                            >
                                <img
                                    src={url}
                                    alt={`media-${i}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Logout ── */}
            <div className="flex-shrink-0 p-5">
                <button
                    onClick={logout}
                    className="w-full py-2 px-6 bg-gradient-to-r from-purple-400 to-violet-600
                    text-white text-sm font-medium rounded-full hover:opacity-90 transition"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default RightSideBar;
