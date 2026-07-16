import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import assets from "../assets/assets";

const ProfilePage = () => {
    const { authUser, updateProfile } = useContext(AuthContext);
    const navigate = useNavigate();

    const [selectedImg, setSelectedImg] = useState(null);
    const [name, setName] = useState(authUser?.fullName || "");
    const [bio, setBio] = useState(authUser?.bio || "");
    const [isLoading, setIsLoading] = useState(false);

    if (!authUser) return null;

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file (PNG, JPG, WEBP).");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Image must be smaller than 5 MB.");
            e.target.value = "";
            return;
        }
        setSelectedImg(file);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);

        try {
            if (!selectedImg) {
                await updateProfile({ fullName: name, bio });
                navigate("/");
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                try {
                    await updateProfile({
                        profilePic: reader.result,
                        fullName: name,
                        bio,
                    });
                    navigate("/");
                } catch (err) {
                    console.error("updateProfile error:", err);
                    toast.error("Failed to save profile. Please try again.");
                } finally {
                    setIsLoading(false);
                }
            };

            reader.onerror = () => {
                toast.error("Failed to read image file.");
                setIsLoading(false);
            };

            reader.readAsDataURL(selectedImg);
        } catch (err) {
            console.error("handleSubmit error:", err);
            toast.error("Something went wrong.");
            setIsLoading(false);
        }
    };

    const previewSrc = selectedImg
        ? URL.createObjectURL(selectedImg)
        : authUser.profilePic || assets.avatar_icon;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4 transition-colors duration-300">
            <div className="w-full max-w-2xl text-slate-800 dark:text-gray-200 flex items-center justify-between max-sm:flex-col-reverse rounded-3xl overflow-hidden glass-panel border border-slate-200/50 dark:border-white/10 shadow-2xl p-6 sm:p-10 animate-slide-in-up">

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 flex-1 w-full">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Profile Details</h3>

                    {/* Profile picture upload */}
                    <label htmlFor="avatar" className="flex items-center gap-4 cursor-pointer group">
                        <input
                            type="file"
                            id="avatar"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            hidden
                            onChange={handleImageChange}
                        />
                        <div className="relative w-16 h-16 flex-shrink-0">
                            <img
                                src={previewSrc}
                                alt="Profile preview"
                                className="w-16 h-16 rounded-full object-cover border-2 border-purple-500/50 group-hover:border-purple-500 transition shadow-md shadow-purple-500/10"
                                onError={(e) => { e.target.src = assets.avatar_icon; }}
                            />
                            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="text-white text-xs font-semibold">Change</span>
                            </div>
                        </div>
                        <span className="text-sm text-slate-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition font-medium">
                            {selectedImg ? `✓ ${selectedImg.name}` : "Upload profile picture"}
                        </span>
                    </label>

                    <input
                        type="text"
                        placeholder="Your name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="p-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-800/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 transition"
                    />

                    <textarea
                        placeholder="Write your bio"
                        required
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="p-3 border border-slate-300 dark:border-gray-700 rounded-xl bg-white/50 dark:bg-slate-800/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 resize-none transition"
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-750 text-white p-3 rounded-full text-base cursor-pointer disabled:opacity-60 transition font-bold shadow-md shadow-purple-500/20 active:scale-98"
                    >
                        {isLoading ? "Saving..." : "Save Profile"}
                    </button>
                </form>

                {/* ── Live preview ── */}
                <div className="flex flex-col items-center gap-3 mx-10 max-sm:my-6 flex-shrink-0">
                    <img
                        src={previewSrc}
                        alt="Preview"
                        className="w-32 h-32 rounded-full object-cover border-4 border-slate-200 dark:border-gray-700 shadow-xl"
                        onError={(e) => { e.target.src = assets.avatar_icon; }}
                    />
                    <p className="text-sm font-bold text-slate-600 dark:text-gray-400 text-center max-w-[140px] truncate">
                        {name || authUser.fullName}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
