import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages,       setMessages]       = useState([]);
    const [users,          setUsers]          = useState([]);
    const [selectedUser,   setSelectedUser]   = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const { socket, axios, authUser } = useContext(AuthContext);

    // Ref keeps socket handler in sync with latest selectedUser without re-subscribing
    const selectedUserRef = useRef(null);
    useEffect(() => {
        selectedUserRef.current = selectedUser;
    }, [selectedUser]);

    // ── Get all users for sidebar ─────────────────────────────────────────────
    const getUsers = async () => {
        // Don't fetch if not logged in — avoids 401 toasts on app load
        if (!localStorage.getItem("token")) return;

        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages || {});
            }
        } catch (err) {
            // Silently ignore 401 (not logged in yet); show other errors
            if (err.response?.status !== 401) {
                toast.error(err.response?.data?.message || err.message);
            }
        }
    };

    // ── Get messages for selected user ────────────────────────────────────────
    const getMessages = async (userId) => {
        try {
            const { data } = await axios.get(`/api/messages/${userId}`);
            if (data.success) {
                setMessages(data.messages);
                setUnseenMessages((prev) => ({ ...prev, [userId]: 0 }));
            }
        } catch (err) {
            if (err.response?.status !== 401) {
                toast.error(err.response?.data?.message || err.message);
            }
        }
    };

    // ── Send a message ────────────────────────────────────────────────────────
    const sendMessage = async (messageData) => {
        const currentUser = selectedUserRef.current;
        if (!currentUser) return;

        try {
            const { data } = await axios.post(
                `/api/messages/send/${currentUser._id}`,
                messageData
            );
            if (data.success) {
                setMessages((prev) => [...prev, data.newMessage]);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    // ── Refresh user list when auth user changes ──────────────────────────────
    useEffect(() => {
        if (authUser) {
            getUsers();
        } else {
            // Logged out — clear state
            setUsers([]);
            setMessages([]);
            setSelectedUser(null);
            setUnseenMessages({});
        }
    }, [authUser]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Socket: listen for incoming messages ──────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = async (newMessage) => {
            const currentSelectedUser = selectedUserRef.current;

            const incomingSenderId =
                typeof newMessage.senderId === "object"
                    ? newMessage.senderId.toString()
                    : String(newMessage.senderId);

            const openChatId = currentSelectedUser?._id?.toString();

            if (currentSelectedUser && incomingSenderId === openChatId) {
                // Active chat — append and mark seen
                setMessages((prev) => [...prev, { ...newMessage, seen: true }]);
                try {
                    await axios.put(`/api/messages/mark/${newMessage._id}`);
                } catch (err) {
                    console.error("mark seen error:", err);
                }
            } else {
                // Background chat — bump badge
                setUnseenMessages((prev) => ({
                    ...prev,
                    [incomingSenderId]: (prev[incomingSenderId] || 0) + 1,
                }));
            }
        };

        socket.on("newMessage", handleNewMessage);
        return () => socket.off("newMessage", handleNewMessage);
    }, [socket]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <ChatContext.Provider value={{
            messages,  setMessages,
            users,     setUsers,
            selectedUser, setSelectedUser,
            unseenMessages, setUnseenMessages,
            getUsers,
            getMessages,
            sendMessage,
        }}>
            {children}
        </ChatContext.Provider>
    );
};
