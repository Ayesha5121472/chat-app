import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import assets from "../assets/assets";

const imgError = (e) => { e.target.src = assets.avatar_icon; };

const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const RightSideBar = () => {
    const { selectedUser, messages } = useContext(ChatContext);
    const { logout, onlineUsers } = useContext(AuthContext);

    const [activeTab, setActiveTab] = useState("info"); // "info" | "media" | "files"
    const [msgImages, setMsgImages] = useState([]);
    const [msgFiles, setMsgFiles] = useState([]);

    useEffect(() => {
        setMsgImages(
            messages
                .filter((m) => m.image && typeof m.image === "string" && m.image.trim() !== "")
                .map((m) => m.image)
        );
        setMsgFiles(
            messages
                .filter((m) => m.file && typeof m.file === "object" && m.file.url && typeof m.file.url === "string" && m.file.url.trim() !== "")
                .map((m) => m.file)
        );
    }, [messages]);

    if (!selectedUser) return null;

    const isOnline = onlineUsers.includes(selectedUser._id);

    return (
        <div className="bg-[#8185B2]/10 dark:bg-[#8185B2]/5 text-slate-800 dark:text-white h-full flex flex-col max-md:hidden overflow-hidden border-l border-slate-200 dark:border-white/10 transition-colors duration-300 animate-slide-in-up">
            
            {/* ── Header User Card ── */}
            <div className="flex flex-col items-center gap-3 pt-10 pb-5 px-5 flex-shrink-0">
                <div className="relative">
                    <img
                        src={selectedUser.profilePic || assets.avatar_icon}
                        alt={selectedUser.fullName}
                        onError={imgError}
                        className="w-20 h-20 rounded-full object-cover border-2 border-purple-500/50 shadow-lg shadow-purple-500/20"
                    />
                    {isOnline && (
                        <span className="absolute bottom-0.5 right-0.5 w-4 h-4 bg-green-500
                        rounded-full border-2 border-slate-50 dark:border-slate-900 animate-pulse" />
                    )}
                </div>

                <div className="text-center">
                    <h2 className="text-base font-bold truncate max-w-[220px] text-slate-800 dark:text-white">{selectedUser.fullName}</h2>
                    <p className={`text-xs font-semibold mt-0.5 ${isOnline ? "text-green-600 dark:text-green-400" : "text-slate-400 dark:text-gray-400"}`}>
                        {isOnline ? "Active Now" : "Offline"}
                    </p>
                </div>
            </div>

            {/* ── Premium Tab Switcher ── */}
            <div className="px-4 mb-4 flex-shrink-0">
                <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-xl border border-slate-300/30 dark:border-white/5">
                    {[
                        { id: "info",  label: "ℹ️ Info" },
                        { id: "media", label: "🖼️ Media" },
                        { id: "files", label: "📂 Files" }
                    ].map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setActiveTab(t.id)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition duration-300 cursor-pointer ${
                                activeTab === t.id
                                    ? "bg-white dark:bg-white/10 text-purple-600 dark:text-purple-300 shadow-sm"
                                    : "text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white"
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            </div>

            <hr className="border-slate-200 dark:border-white/10 mx-4 flex-shrink-0" />

            {/* ── Tab Content Panel ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-none">
                
                {/* ── Tab: Info ── */}
                {activeTab === "info" && (
                    <div className="flex flex-col gap-5 animate-slide-in-up">
                        <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-1">About</p>
                            <p className="text-sm leading-relaxed text-slate-600 dark:text-gray-300">
                                {selectedUser.bio || "No bio available."}
                            </p>
                        </div>

                        <div className="bg-white/50 dark:bg-white/5 rounded-2xl p-4 border border-slate-200/50 dark:border-white/5 shadow-sm flex flex-col gap-3">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-0.5">Email Address</p>
                                <p className="text-sm font-semibold truncate text-slate-700 dark:text-gray-200">{selectedUser.email || "No email visible"}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-0.5">Timezone</p>
                                <p className="text-sm font-semibold text-slate-700 dark:text-gray-200">GMT+5 (Local Time)</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-0.5">Encrypted</p>
                                <p className="text-sm font-semibold text-green-500 flex items-center gap-1.5">
                                    <span>🔒</span> End-to-end secure
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab: Media ── */}
                {activeTab === "media" && (
                    <div className="animate-slide-in-up">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-3">Shared Images</p>
                        {msgImages.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-gray-500 text-center mt-6">No images shared yet.</p>
                        ) : (
                            <div className="grid grid-cols-2 gap-2">
                                {msgImages.map((url, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => window.open(url, "_blank")}
                                        className="rounded-xl overflow-hidden aspect-square border border-slate-200/60 dark:border-white/5 shadow-sm hover:opacity-85 hover:scale-[1.03] transition duration-300 cursor-pointer"
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
                )}

                {/* ── Tab: Files ── */}
                {activeTab === "files" && (
                    <div className="flex flex-col gap-3 animate-slide-in-up">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-300 mb-1">Shared Documents</p>
                        {msgFiles.length === 0 ? (
                            <p className="text-xs text-slate-400 dark:text-gray-500 text-center mt-6">No documents shared yet.</p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {msgFiles.map((file, i) => (
                                    <a
                                        key={i}
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-white/50 dark:bg-white/5 hover:bg-slate-200/50 dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5 rounded-xl transition duration-300"
                                    >
                                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-300 text-lg flex-shrink-0">
                                            📎
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold truncate text-slate-700 dark:text-gray-200">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">{formatFileSize(file.size)}</p>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer Logout ── */}
            <div className="flex-shrink-0 p-5 border-t border-slate-200 dark:border-white/10 bg-slate-100/30 dark:bg-transparent">
                <button
                    onClick={logout}
                    className="w-full py-2.5 px-6 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-750 text-white text-xs font-bold rounded-full transition duration-300 shadow-md shadow-purple-500/20 active:scale-98 cursor-pointer"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default RightSideBar;
