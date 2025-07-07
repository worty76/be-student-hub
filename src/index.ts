import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import config from "./config/config";
import { errorHandler, notFoundHandler } from "./utils/errorHandler";
import swaggerSpec from "./docs/swagger";

// Routes
import userRoutes from "./routes/userRoutes";
import productRoutes from "./routes/productRoutes";
import chatRoutes from "./routes/chatRoutes";
import commentRoutes from "./routes/commentRoutes";
import paymentRoutes from "./routes/paymentRoutes";

// Create Express app
const app = express();
const PORT = config.PORT;
const MONGO_URI = config.MONGO_URI;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL, // Use specific client URL instead of wildcard
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // Allow credentials (cookies, authorization headers)
  })
);
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use("/uploads", express.static("uploads"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/payments", paymentRoutes);

// Create HTTP server and Socket.io instance
const httpServer = createServer(app);
const io = new Server(httpServer, {
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
    } catch (error) {
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
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    // Start server
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(
        `Swagger documentation available at http://localhost:${PORT}/api-docs`
      );
    });
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });
