/**
 * EmojiStickerPicker
 *
 * A two-tab panel:
 *  - "Emoji"    → full emoji-picker-react keyboard
 *  - "Stickers" → curated grid of large Unicode emoji stickers
 *
 * Props:
 *  onEmojiSelect(emoji: string)   — called when an emoji char is picked
 *  onStickerSelect(sticker: string) — called when a sticker is picked
 *  onClose()                      — called when the panel should close
 */

import EmojiPicker, { Theme, EmojiStyle } from "emoji-picker-react";
import { useEffect, useRef, useState } from "react";

// ── Sticker data ──────────────────────────────────────────────────────────────
// Each sticker is a single Unicode emoji rendered at large size.
// Organized into named categories shown as tabs inside the Stickers panel.
const STICKER_CATEGORIES = [
    {
        label: "Faces",
        icon: "😀",
        stickers: [
            "😀","😂","🤣","😍","🥰","😘","😜","🤪","🥳","😎",
            "🤩","😏","😒","😔","😢","😭","😤","😠","🤬","😱",
            "😨","😰","🥺","🤗","🤭","🤫","🤔","🫠","🥴","😴",
        ],
    },
    {
        label: "Animals",
        icon: "🐶",
        stickers: [
            "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐸","🐵",
            "🐔","🐧","🐦","🦆","🦁","🐯","🐨","🐮","🐷","🐙",
            "🦋","🐝","🦄","🐬","🦈","🐊","🦓","🦒","🦘","🦔",
        ],
    },
    {
        label: "Food",
        icon: "🍕",
        stickers: [
            "🍕","🍔","🌮","🍜","🍣","🍩","🍪","🎂","🍫","🍿",
            "🥤","☕","🍺","🍓","🍉","🍋","🍎","🥝","🍑","🍇",
            "🥦","🌽","🥕","🫐","🍆","🥑","🧁","🍭","🍦","🥞",
        ],
    },
    {
        label: "Activities",
        icon: "⚽",
        stickers: [
            "⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸",
            "🥊","🎯","🎮","🎲","🧩","🎸","🎹","🎺","🎻","🥁",
            "🎭","🎨","🎬","🎤","🎧","🏆","🥇","🎖","🏅","🎗",
        ],
    },
    {
        label: "Travel",
        icon: "✈️",
        stickers: [
            "✈️","🚀","🚂","🚗","🏍","🚢","🚁","🛸","🏖","🏔",
            "🗼","🗽","🏰","🎡","🎢","🌋","🏜","🏕","🌅","🌃",
            "🌉","🌌","🗺","🧭","🏟","🎠","🌁","🌄","🌠","🎇",
        ],
    },
    {
        label: "Objects",
        icon: "💡",
        stickers: [
            "💡","📱","💻","🖥","⌨️","🖨","🖱","💾","📷","📸",
            "📹","🎥","📞","☎️","📟","📺","📻","🧲","🔋","🔌",
            "💊","🩺","🔭","🔬","🧪","🧫","📚","📖","✏️","🖊",
        ],
    },
    {
        label: "Hearts",
        icon: "❤️",
        stickers: [
            "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔",
            "❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️",
            "✌️","🤞","🤟","🤘","👍","👏","🙌","🤲","🫶","💪",
        ],
    },
    {
        label: "Symbols",
        icon: "✨",
        stickers: [
            "✨","🌟","💫","⭐","🔥","💥","🎉","🎊","🎈","🎀",
            "🎁","🎗","🌈","☁️","⚡","❄️","🌊","💧","🌸","🌺",
            "🌻","🍀","🌿","🍁","🍂","🌙","☀️","🌤","🌧","⛈",
        ],
    },
];

// ── Component ─────────────────────────────────────────────────────────────────
const EmojiStickerPicker = ({ onEmojiSelect, onStickerSelect, onClose }) => {
    const [tab, setTab] = useState("emoji"); // "emoji" | "stickers"
    const [stickerCat, setStickerCat] = useState(0);
    const panelRef = useRef(null);

    // Close when clicking outside the panel
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                onClose();
            }
        };
        // Use mousedown so it fires before the button's onClick
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    // Close on Escape key
    useEffect(() => {
        const handleKey = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [onClose]);

    return (
        <div
            ref={panelRef}
            className="absolute bottom-full mb-2 left-0 z-50 rounded-2xl overflow-hidden
            shadow-2xl border border-white/10 bg-[#1e1a3a]"
            style={{ width: 340 }}
        >
            {/* ── Tab bar ── */}
            <div className="flex border-b border-white/10">
                {[
                    { id: "emoji",    label: "😊 Emoji"    },
                    { id: "stickers", label: "🎭 Stickers" },
                ].map(({ id, label }) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={`flex-1 py-2 text-sm font-medium transition
                        ${tab === id
                            ? "text-violet-400 border-b-2 border-violet-400 bg-white/5"
                            : "text-gray-400 hover:text-white"
                        }`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {/* ── Emoji tab ── */}
            {tab === "emoji" && (
                <div className="emoji-picker-wrapper">
                    <EmojiPicker
                        onEmojiClick={(emojiData) => {
                            onEmojiSelect(emojiData.emoji);
                        }}
                        theme={Theme.DARK}
                        emojiStyle={EmojiStyle.NATIVE}
                        width={340}
                        height={380}
                        searchPlaceholder="Search emoji..."
                        previewConfig={{ showPreview: false }}
                        lazyLoadEmojis
                        skinTonesDisabled
                    />
                </div>
            )}

            {/* ── Stickers tab ── */}
            {tab === "stickers" && (
                <div className="flex flex-col" style={{ height: 380 }}>
                    {/* Category tabs */}
                    <div className="flex overflow-x-auto gap-1 p-2 border-b border-white/10 flex-shrink-0
                        scrollbar-none">
                        {STICKER_CATEGORIES.map((cat, i) => (
                            <button
                                key={cat.label}
                                type="button"
                                title={cat.label}
                                onClick={() => setStickerCat(i)}
                                className={`flex-shrink-0 w-8 h-8 text-lg rounded-lg transition
                                ${stickerCat === i
                                    ? "bg-violet-500/40 ring-1 ring-violet-400"
                                    : "hover:bg-white/10"
                                }`}
                            >
                                {cat.icon}
                            </button>
                        ))}
                    </div>

                    {/* Category label */}
                    <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">
                        {STICKER_CATEGORIES[stickerCat].label}
                    </p>

                    {/* Sticker grid */}
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="grid grid-cols-6 gap-1">
                            {STICKER_CATEGORIES[stickerCat].stickers.map((sticker, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => onStickerSelect(sticker)}
                                    className="w-full aspect-square flex items-center justify-center
                                    text-3xl rounded-xl hover:bg-white/10 active:scale-90 transition
                                    cursor-pointer select-none"
                                    title={sticker}
                                >
                                    {sticker}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmojiStickerPicker;
