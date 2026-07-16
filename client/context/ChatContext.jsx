import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [messages, setMessages] = useState([]);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [stories, setStories] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [unseenMessages, setUnseenMessages] = useState({});

    const { socket, axios, authUser } = useContext(AuthContext);

    const selectedRef = useRef(null);
    useEffect(() => {
        selectedRef.current = selectedUser || selectedGroup;
    }, [selectedUser, selectedGroup]);

    const getUsers = async () => {
        if (!localStorage.getItem("token")) return;

        try {
            const { data } = await axios.get("/api/messages/users");
            if (data.success) {
                setUsers(data.users);
                setUnseenMessages(data.unseenMessages || {});
            }
        } catch (err) {
            if (err.response?.status !== 401) {
                toast.error(err.response?.data?.message || err.message);
            }
        }
    };

    const getMyGroups = async () => {
        if (!localStorage.getItem("token")) return;

        try {
            const { data } = await axios.get("/api/groups/my-groups");
            if (data.success) {
                setGroups(data.groups);
            }
        } catch (err) {
            if (err.response?.status !== 401) {
                toast.error(err.response?.data?.message || err.message);
            }
        }
    };

    const getStories = async () => {
        if (!localStorage.getItem("token")) return;

        try {
            const { data } = await axios.get("/api/stories");
            if (data.success) {
                setStories(data.stories);
            }
        } catch (err) {
            if (err.response?.status !== 401) {
                toast.error(err.response?.data?.message || err.message);
            }
        }
    };

    const createGroup = async (groupData) => {
        try {
            const { data } = await axios.post("/api/groups", groupData);
            if (data.success) {
                setGroups((prev) => [data.group, ...prev]);
                toast.success("Group created successfully!");
                return data.group;
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const joinGroup = async (groupId) => {
        try {
            const { data } = await axios.post(`/api/groups/join/${groupId}`);
            if (data.success) {
                setGroups((prev) => [data.group, ...prev]);
                toast.success("Joined group successfully!");
                return data.group;
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const leaveGroup = async (groupId) => {
        try {
            await axios.post(`/api/groups/leave/${groupId}`);
            setGroups((prev) => prev.filter((g) => g._id !== groupId));
            if (selectedGroup?._id === groupId) setSelectedGroup(null);
            toast.success("Left group successfully!");
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const deleteGroup = async (groupId) => {
        try {
            await axios.delete(`/api/groups/${groupId}`);
            setGroups((prev) => prev.filter((g) => g._id !== groupId));
            if (selectedGroup?._id === groupId) setSelectedGroup(null);
            toast.success("Group deleted successfully!");
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const addGroupMember = async (groupId, userId) => {
        try {
            const { data } = await axios.post(`/api/groups/add-member/${groupId}`, { userId });
            if (data.success) {
                setGroups((prev) =>
                    prev.map((g) => (g._id === groupId ? data.group : g))
                );
                if (selectedGroup?._id === groupId) {
                    setSelectedGroup(data.group);
                }
                toast.success("Member added successfully!");
                return data.group;
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const removeGroupMember = async (groupId, userId) => {
        try {
            const { data } = await axios.delete(`/api/groups/remove-member/${groupId}/${userId}`);
            if (data.success) {
                setGroups((prev) =>
                    prev.map((g) => (g._id === groupId ? data.group : g))
                );
                if (selectedGroup?._id === groupId) {
                    setSelectedGroup(data.group);
                }
                toast.success("Member removed successfully!");
                return data.group;
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const createStory = async (storyData) => {
        try {
            const { data } = await axios.post("/api/stories", storyData);
            if (data.success) {
                setStories((prev) => [data.story, ...prev]);
                toast.success("Story created!");
                return data.story;
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const deleteStory = async (storyId) => {
        try {
            await axios.delete(`/api/stories/${storyId}`);
            setStories((prev) => prev.filter((s) => s._id !== storyId));
            toast.success("Story deleted!");
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const markStoryViewed = async (storyId, viewerData) => {
        try {
            await axios.post(`/api/stories/view/${storyId}`);
            // Update local state to include viewer
            setStories((prev) =>
                prev.map((s) =>
                    s._id === storyId
                        ? {
                              ...s,
                              views: s.views?.some((v) => (v._id || v) === viewerData._id)
                                  ? s.views
                                  : [...(s.views || []), viewerData],
                          }
                        : s
                )
            );
        } catch (err) {
            // Silently fail - view tracking is non-critical
            console.warn("Could not mark story viewed:", err.message);
        }
    };

    const getMessages = async (id) => {
        try {
            const { data } = await axios.get(`/api/messages/${id}`);
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (err) {
            if (err.response?.status !== 401) {
                toast.error(err.response?.data?.message || err.message);
            }
        }
    };

    const sendMessage = async (messageData) => {
        const current = selectedRef.current;
        if (!current) return;

        console.log("📨 Sending messageData:", messageData);

        try {
            const { data } = await axios.post(
                `/api/messages/send/${current._id}`,
                messageData
            );
            console.log("📩 Received response:", data);
            if (data.success) {
                setMessages((prev) => [...prev, data.newMessage]);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            console.error("❌ sendMessage error:", err);
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const addReaction = async (messageId, emoji) => {
        try {
            const { data } = await axios.post(`/api/messages/react/${messageId}`, { emoji });
            if (data.success) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m._id === messageId ? { ...m, reactions: data.message.reactions } : m
                    )
                );
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const editMessage = async (messageId, newText) => {
        try {
            const { data } = await axios.put(`/api/messages/edit/${messageId}`, { text: newText });
            if (data.success) {
                setMessages((prev) =>
                    prev.map((m) =>
                        m._id === messageId ? { ...m, text: newText, edited: true } : m
                    )
                );
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    const deleteMessage = async (messageId) => {
        try {
            await axios.delete(`/api/messages/delete/${messageId}`);
            setMessages((prev) =>
                prev.map((m) =>
                    m._id === messageId ? { ...m, deleted: true } : m
                )
            );
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    useEffect(() => {
        if (authUser) {
            // Reset previous session's state first
            setSelectedUser(null);
            setSelectedGroup(null);
            setMessages([]);
            setUnseenMessages({});
            // Then fetch fresh data for the new user
            getUsers();
            getMyGroups();
            getStories();
        } else {
            setUsers([]);
            setGroups([]);
            setStories([]);
            setMessages([]);
            setSelectedUser(null);
            setSelectedGroup(null);
            setUnseenMessages({});
        }
    }, [authUser]);

    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = async (newMessage) => {
            const current = selectedRef.current;

            const isGroupMsg = !!newMessage.groupId;
            const incomingSenderId =
                typeof newMessage.senderId === "object"
                    ? newMessage.senderId._id?.toString() || newMessage.senderId.toString()
                    : String(newMessage.senderId);

            const openId = isGroupMsg
                ? current?._id?.toString() === newMessage.groupId?.toString()
                : current?._id?.toString() === incomingSenderId;

            if (openId) {
                setMessages((prev) => [...prev, newMessage]);
            } else if (!isGroupMsg) {
                setUnseenMessages((prev) => ({
                    ...prev,
                    [incomingSenderId]: (prev[incomingSenderId] || 0) + 1,
                }));
            }
        };

        const handleMessageReaction = ({ messageId, reactions }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? { ...m, reactions } : m))
            );
        };

        const handleMessageEdited = ({ messageId, text, edited }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? { ...m, text, edited } : m))
            );
        };

        const handleMessageDeleted = ({ messageId }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? { ...m, deleted: true } : m))
            );
        };

        const handleMessageSeen = ({ messageId }) => {
            setMessages((prev) =>
                prev.map((m) => (m._id === messageId ? { ...m, seen: true } : m))
            );
        };

        const handleGroupUpdated = (group) => {
            setGroups((prev) =>
                prev.map((g) => (g._id === group._id ? group : g))
            );
            if (selectedGroup?._id === group._id) {
                setSelectedGroup(group);
            }
        };

        const handleGroupDeleted = (groupId) => {
            setGroups((prev) => prev.filter((g) => g._id !== groupId));
            if (selectedGroup?._id === groupId) {
                setSelectedGroup(null);
            }
        };

        socket.on("newMessage", handleNewMessage);
        socket.on("messageReaction", handleMessageReaction);
        socket.on("messageEdited", handleMessageEdited);
        socket.on("messageDeleted", handleMessageDeleted);
        socket.on("messageSeen", handleMessageSeen);
        socket.on("groupUpdated", handleGroupUpdated);
        socket.on("groupDeleted", handleGroupDeleted);

        return () => {
            socket.off("newMessage", handleNewMessage);
            socket.off("messageReaction", handleMessageReaction);
            socket.off("messageEdited", handleMessageEdited);
            socket.off("messageDeleted", handleMessageDeleted);
            socket.off("messageSeen", handleMessageSeen);
            socket.off("groupUpdated", handleGroupUpdated);
            socket.off("groupDeleted", handleGroupDeleted);
        };
    }, [socket, axios]);

    return (
        <ChatContext.Provider
            value={{
                messages,
                setMessages,
                users,
                setUsers,
                groups,
                setGroups,
                stories,
                setStories,
                selectedUser,
                setSelectedUser,
                selectedGroup,
                setSelectedGroup,
                unseenMessages,
                setUnseenMessages,
                getUsers,
                getMyGroups,
                getStories,
                createGroup,
                joinGroup,
                leaveGroup,
                deleteGroup,
                addGroupMember,
                removeGroupMember,
                createStory,
                deleteStory,
                markStoryViewed,
                getMessages,
                sendMessage,
                addReaction,
                editMessage,
                deleteMessage,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
