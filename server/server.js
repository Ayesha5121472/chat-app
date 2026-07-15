// Server restarted!
import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import storyRouter from "./routes/storyRoutes.js";
import { Server } from "socket.io";
import { setIo } from "./controllers/groupController.js";
import { ExpressPeerServer } from "peer";

const app = express();
const server = http.createServer(app);

// ── CORS ──────────────────────────────────────────────────────────────────────
// CLIENT_URL is set to the Vercel frontend URL in production env vars on Render
const allowedOrigins = [
    process.env.CLIENT_URL,          // e.g. https://chat-app.vercel.app
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
].filter(Boolean); // remove undefined if CLIENT_URL not set

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn("CORS blocked:", origin);
            callback(new Error(`CORS blocked: ${origin}`));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));

// ── Socket.io ─────────────────────────────────────────────────────────────────
export const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        credentials: true,
    },
});

// Set io in group controller
setIo(io);

// ── Peer Server (for voice chat) ──────────────────────────────────────────────
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: "/peerjs",
});

app.use("/api/peerjs", peerServer);

export const userSocketMap = {}; // { userId: socketId }

// Set userSocketMap on app.locals for access in controllers
app.set("userSocketMap", userSocketMap);

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`Socket connected — userId: ${userId}`);

    if (userId) {
        userSocketMap[userId] = socket.id;
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    // Voice call events
    socket.on("initiateVoiceCall", ({ from, to }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("incomingVoiceCall", { from });
        }
    });

    socket.on("acceptVoiceCall", ({ from, to }) => {
        const callerSocketId = userSocketMap[to];
        if (callerSocketId) {
            io.to(callerSocketId).emit("voiceCallAccepted", { from });
        }
    });

    socket.on("endVoiceCall", ({ from, to }) => {
        const receiverSocketId = userSocketMap[to];
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("voiceCallEnded");
        }
    });

    // Typing events
    socket.on("typing", ({ from, to, isGroup }) => {
        if (isGroup) {
            socket.to(to).emit("typing", { from });
        } else {
            const receiverSocketId = userSocketMap[to];
            if (receiverSocketId) {
                io.to(receiverSocketId).emit("typing", { from });
            }
        }
    });

    socket.on("disconnect", () => {
        console.log(`Socket disconnected — userId: ${userId}`);
        if (userId) {
            delete userSocketMap[userId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });
});

// ── Body Parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/api/status", (req, res) =>
    res.json({ success: true, message: "Server is live" })
);
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRouter);
app.use("/api/stories", storyRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => {
        server.listen(PORT, () =>
            console.log(`Server running on port ${PORT}`)
        );
    })
    .catch((err) => {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    });
