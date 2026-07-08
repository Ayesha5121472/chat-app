import express from "express";
import "dotenv/config";
import cors from "cors";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import { Server } from "socket.io";

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

export const userSocketMap = {}; // { userId: socketId }

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`Socket connected — userId: ${userId}`);

    if (userId) {
        userSocketMap[userId] = socket.id;
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

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
app.use("/api/auth",     userRouter);
app.use("/api/messages", messageRouter);

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
