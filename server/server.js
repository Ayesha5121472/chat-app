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
const allowedOrigins = [
    process.env.CLIENT_URL || "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
];

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
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

// Store online users { userId: socketId }
export const userSocketMap = {};

io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    console.log(`Socket connected — userId: ${userId}, socketId: ${socket.id}`);

    if (userId) {
        userSocketMap[userId] = socket.id;
        // Broadcast updated online users list
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

// ── Body Parsers ─────────────────────────────────────────────────────────────
// Must come after cors, before routes
// 10mb allows base64 images up to ~7.5MB actual size
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.get("/api/status", (req, res) => res.json({ success: true, message: "Server is live" }));
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error("Unhandled error:", err.stack || err.message);
    res.status(500).json({ success: false, message: "Internal server error" });
});

// ── Start Server After DB Connection ──────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
    .then(() => {
        server.listen(PORT, () =>
            console.log(`Server running on http://localhost:${PORT}`)
        );
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB. Server not started.", err);
        process.exit(1);
    });
