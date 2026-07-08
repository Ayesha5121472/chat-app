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
        // 5 MB max — base64 is ~33% larger so this keeps payload under 7 MB
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
                // No new picture — just update text fields
                await updateProfile({ fullName: name, bio });
                navigate("/");
                return;
            }

            // Convert image file → base64 data URI, then send to server
            const reader = new FileReader();

            reader.onloadend = async () => {
                try {
                    await updateProfile({
                        profilePic: reader.result, // base64 data URI
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
            // NOTE: don't call setIsLoading(false) here —
            // the reader is async; finally() above handles it
        } catch (err) {
            console.error("handleSubmit error:", err);
            toast.error("Something went wrong.");
            setIsLoading(false);
        }
    };

    // Use object URL for local preview, Cloudinary URL or default for saved pic
    const previewSrc = selectedImg
        ? URL.createObjectURL(selectedImg)
        : authUser.profilePic || assets.avatar_icon;

    return (
        <div className="min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-2xl backdrop-blur-2xl text-gray-300 border-2
                border-gray-600 flex items-center justify-between max-sm:flex-col-reverse
                rounded-xl overflow-hidden">

                {/* ── Form ── */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-10 flex-1">
                    <h3 className="text-xl font-medium text-white">Profile Details</h3>

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
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-500
                                group-hover:border-violet-400 transition"
                                onError={(e) => { e.target.src = assets.avatar_icon; }}
                            />
                            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center
                                justify-center opacity-0 group-hover:opacity-100 transition">
                                <span className="text-white text-xs font-medium">Change</span>
                            </div>
                        </div>
                        <span className="text-sm text-gray-400 group-hover:text-violet-400 transition">
                            {selectedImg ? `✓ ${selectedImg.name}` : "Upload profile picture"}
                        </span>
                    </label>

                    <input
                        type="text"
                        placeholder="Your name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="p-2 border border-gray-500 rounded-md bg-transparent
                        focus:outline-none focus:ring-2 focus:ring-violet-500 text-white
                        placeholder-gray-400"
                    />

                    <textarea
                        placeholder="Write your bio"
                        required
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="p-2 border border-gray-500 rounded-md bg-transparent
                        focus:outline-none focus:ring-2 focus:ring-violet-500 text-white
                        placeholder-gray-400 resize-none"
                    />

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-gradient-to-r from-purple-400 to-violet-600 text-white
                        p-2 rounded-full text-lg cursor-pointer disabled:opacity-60 transition font-medium"
                    >
                        {isLoading ? "Saving..." : "Save Profile"}
                    </button>
                </form>

                {/* ── Live preview ── */}
                <div className="flex flex-col items-center gap-3 mx-10 max-sm:mt-8 flex-shrink-0">
                    <img
                        src={previewSrc}
                        alt="Preview"
                        className="w-36 h-36 rounded-full object-cover border-4 border-gray-500"
                        onError={(e) => { e.target.src = assets.avatar_icon; }}
                    />
                    <p className="text-sm text-gray-400 text-center max-w-[140px] truncate">
                        {name || authUser.fullName}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
