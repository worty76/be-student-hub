# StudentHub

A second-hand marketplace for students to buy, sell, chat, comment, and post items within a university community.

## Features

- User authentication and profile management
- Product listing with images, categories, and filtering
- Real-time chat between buyers and sellers
- Comment and reply system for products
- User ratings and reviews
- Favorites system
- Search functionality
- API documentation with Swagger
- Cloud-based image upload and storage with Cloudinary

## Tech Stack

- Node.js with TypeScript
- Express.js
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT authentication
- Cloudinary for image storage
- Swagger for API documentation
- Multer for file uploads

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/studenthub.git
   cd studenthub
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   PORT=3000
   MONGO_URI=mongodb://localhost:27017/studenthub
   JWT_SECRET=your-super-secret-jwt-key
   CLIENT_URL=http://localhost:3000
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. Start the development server:
   ```
   npm run dev
   ```

   Or run without TypeScript type checking:
   ```
   npm run dev:nocheck
   ```

5. Access the API documentation:
   ```
   http://localhost:3000/api-docs
   ```

## API Endpoints

### Authentication
- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login user

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/:id/ratings` - Get user ratings
- `POST /api/users/:id/rate` - Rate a user

### Products
- `GET /api/products` - Get all products with filters
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create a new product
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product
- `GET /api/products/user/:userId` - Get products by user ID
- `GET /api/products/search/:query` - Search products
- `GET /api/products/category/:category` - Get products by category
- `POST /api/products/:id/favorite` - Add product to favorites
- `DELETE /api/products/:id/favorite` - Remove product from favorites
- `GET /api/products/favorites` - Get user's favorite products

### Chat
- `GET /api/chats` - Get all chats for the authenticated user
- `GET /api/chats/:id` - Get a specific chat by ID
- `POST /api/chats` - Create a new chat
- `POST /api/chats/:id/messages` - Send a new message in a chat
- `GET /api/chats/:id/messages` - Get all messages for a specific chat
- `PUT /api/chats/:id/read` - Mark chat as read
- `DELETE /api/chats/:id` - Delete a chat

### Comments
- `GET /api/comments/product/:productId` - Get all comments for a product
- `POST /api/comments` - Create a new comment
- `PUT /api/comments/:id` - Update a comment
- `DELETE /api/comments/:id` - Delete a comment
- `POST /api/comments/:id/replies` - Reply to a comment
- `GET /api/comments/:id/replies` - Get replies for a comment
- `POST /api/comments/:id/like` - Like a comment
- `DELETE /api/comments/:id/like` - Unlike a comment

## Socket.io Events

### Connection
- `connection` - User connects to socket server
- `disconnect` - User disconnects from socket server

### Chat
- `joinRoom` - Join a chat room (roomId = chatId)
- `leaveRoom` - Leave a chat room
- `sendMessage` - Send a message in a chat room
- `newMessage` - Receive a new message

## Project Structure

```
studenthub/
├── src/
│   ├── config/       # Configuration files
│   ├── controllers/  # Route controllers
│   ├── middleware/   # Custom middleware
│   ├── models/       # Mongoose models
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   ├── utils/        # Utility functions
│   └── index.ts      # Entry point
├── uploads/          # Uploaded files
├── .env              # Environment variables
├── package.json
├── tsconfig.json
└── README.md
```

## Future Enhancements

- Mobile app with React Native
- Payment integration
- Notifications system
- Admin dashboard
- Advanced search with filters
- Social sharing
- Localization

## License

This project is licensed under the MIT License. 