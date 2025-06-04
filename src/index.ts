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

// Create Express app
const app = express();
const PORT = config.PORT;
const MONGO_URI = config.MONGO_URI;

// Middleware
app.use(cors());
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

// Socket.io connection
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });

  // Handle chat messages
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  socket.on("leaveRoom", (roomId) => {
    socket.leave(roomId);
    console.log(`User left room: ${roomId}`);
  });

  socket.on("sendMessage", (data) => {
    io.to(data.roomId).emit("newMessage", data);
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
