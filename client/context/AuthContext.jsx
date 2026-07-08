import { createContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

// Always use relative URLs in the browser — Vite proxy handles /api → :5000 in dev,
// and in production the frontend is served from the same origin as the API.
// Do NOT set baseURL to backendUrl here — that bypasses the Vite proxy and breaks CORS.
axios.defaults.baseURL = "";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [authUser,       setAuthUser]       = useState(null);
    const [onlineUsers,    setOnlineUsers]    = useState([]);
    const [socket,         setSocket]         = useState(null);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);

    const socketRef = useRef(null);

    // ── Socket helpers ────────────────────────────────────────────────────────
    const connectSocket = (userData) => {
        if (!userData?._id) return;
        if (socketRef.current?.connected) return; // already connected

        const newSocket = io(backendUrl, {
            query: { userId: userData._id },
            transports: ["websocket", "polling"],
        });

        newSocket.on("connect",       () => console.log("Socket connected:", newSocket.id));
        newSocket.on("getOnlineUsers", (ids) => setOnlineUsers(ids));
        newSocket.on("connect_error", (err) => console.error("Socket error:", err.message));

        socketRef.current = newSocket;
        setSocket(newSocket);
    };

    const disconnectSocket = () => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
            setSocket(null);
        }
    };

    // ── Check stored token on mount ───────────────────────────────────────────
    const checkAuth = async () => {
        const storedToken = localStorage.getItem("token");
        if (!storedToken) {
            setIsCheckingAuth(false);
            return;
        }

        // Make sure token header is set before the request
        axios.defaults.headers.common["token"] = storedToken;

        try {
            const { data } = await axios.get("/api/auth/check");
            if (data.success) {
                setAuthUser(data.user);
                connectSocket(data.user);
            } else {
                localStorage.removeItem("token");
                delete axios.defaults.headers.common["token"];
            }
        } catch (err) {
            console.error("checkAuth error:", err.message);
            localStorage.removeItem("token");
            delete axios.defaults.headers.common["token"];
        } finally {
            // Always unblock the UI — no matter what happens
            setIsCheckingAuth(false);
        }
    };

    // ── Login / Signup ────────────────────────────────────────────────────────
    const login = async (state, credentials) => {
        try {
            const { data } = await axios.post(`/api/auth/${state}`, credentials);
            if (data.success) {
                localStorage.setItem("token", data.token);
                axios.defaults.headers.common["token"] = data.token;
                setAuthUser(data.userData);
                connectSocket(data.userData);
                toast.success(data.message);
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = () => {
        localStorage.removeItem("token");
        delete axios.defaults.headers.common["token"];
        setAuthUser(null);
        setOnlineUsers([]);
        disconnectSocket();
        toast.success("Logged out successfully");
    };

    // ── Update Profile ────────────────────────────────────────────────────────
    const updateProfile = async (body) => {
        try {
            const { data } = await axios.put("/api/auth/update-profile", body);
            if (data.success) {
                setAuthUser(data.user);
                toast.success("Profile updated successfully");
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    // ── Mount ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        checkAuth();
        return () => disconnectSocket();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <AuthContext.Provider value={{
            axios,
            authUser,
            onlineUsers,
            socket,
            isCheckingAuth,
            login,
            logout,
            updateProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
};
