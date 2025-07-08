"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const mongoose_1 = __importDefault(require("mongoose"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const config_1 = __importDefault(require("./config/config"));
const swagger_1 = __importDefault(require("./docs/swagger"));
// Routes
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
// Create Express app
const app = (0, express_1.default)();
const PORT = config_1.default.PORT;
const MONGO_URI = config_1.default.MONGO_URI;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL, // Use specific client URL instead of wildcard
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow credentials (cookies, authorization headers)
}));
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)("dev"));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Static files
app.use("/uploads", express_1.default.static("uploads"));
// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});
// Swagger documentation
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.default));
app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swagger_1.default);
});
// API Routes
app.use("/api/users", userRoutes_1.default);
app.use("/api/products", productRoutes_1.default);
app.use("/api/chats", chatRoutes_1.default);
app.use("/api/comments", commentRoutes_1.default);
app.use("/api/payments", paymentRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
// Create HTTP server and Socket.io instance
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
    },
});
// Make io instance available to controllers
app.set('io', io);
// Socket.io connection with authentication
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }
    // You can add JWT verification here if needed
    // For now, just store the token in socket data
    socket.data.token = token;
    next();
});
io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    // Handle user joining their personal rooms
    socket.on("joinUserRooms", async (data) => {
        try {
            const { userId, chatIds } = data;
            // Join user-specific room for notifications
            socket.join(`user:${userId}`);
            // Join all chat rooms the user is part of
            if (chatIds && Array.isArray(chatIds)) {
                chatIds.forEach(chatId => {
                    socket.join(chatId);
                    console.log(`User ${userId} joined chat room: ${chatId}`);
                });
            }
            socket.emit('roomsJoined', { success: true });
        }
        catch (error) {
            console.error('Error joining rooms:', error);
            socket.emit('error', { message: 'Failed to join rooms' });
        }
    });
    // Handle joining a specific chat room
    socket.on("joinRoom", (chatId) => {
        socket.join(chatId);
        console.log(`Socket ${socket.id} joined room: ${chatId}`);
        socket.emit('roomJoined', { chatId });
    });
    // Handle leaving a specific chat room
    socket.on("leaveRoom", (chatId) => {
        socket.leave(chatId);
        console.log(`Socket ${socket.id} left room: ${chatId}`);
        socket.emit('roomLeft', { chatId });
    });
    // Handle typing indicators
    socket.on("typing", (data) => {
        const { chatId, userId, isTyping } = data;
        socket.to(chatId).emit("userTyping", {
            chatId,
            userId,
            isTyping
        });
    });
    // Handle user status updates
    socket.on("updateStatus", (data) => {
        const { userId, status } = data;
        // Broadcast to all rooms this user is in
        socket.broadcast.emit("userStatusChanged", {
            userId,
            status,
            timestamp: new Date().toISOString()
        });
    });
    socket.on("disconnect", (reason) => {
        console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
    // Handle errors
    socket.on("error", (error) => {
        console.error("Socket error:", error);
    });
});
// Connect to MongoDB
mongoose_1.default
    .connect(MONGO_URI)
    .then(() => {
    console.log("Connected to MongoDB");
    // Start server
    httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
})
    .catch((error) => {
    console.error("MongoDB connection error:", error);
});
