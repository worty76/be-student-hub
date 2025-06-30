import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Chat from '../models/Chat';
import Message from '../models/Message';
import User from '../models/User';

// Get all chats for the authenticated user
export const getUserChats = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    
    // Find all chats where the user is a participant
    const chats = await Chat.find({ participants: userId })
      .populate([
        {
          path: 'participants',
          select: 'name avatar',
          match: { _id: { $ne: userId } } // Only populate other participants
        },
        {
          path: 'lastMessage'
        },
        {
          path: 'product',
          select: 'title images price'
        }
      ])
      .sort({ updatedAt: -1 });
    
    res.json(chats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get a specific chat by ID
export const getChatById = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;
    const chatId = req.params.id;
    
    // Find the chat
    const chat = await Chat.findById(chatId)
      .populate([
        {
          path: 'participants',
          select: 'name avatar'
        },
        {
          path: 'product',
          select: 'title images price status'
        }
      ]);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.some(p => p._id.toString() === userId)) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    res.json(chat);
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new chat
export const createChat = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { receiverId, productId } = req.body;
    const senderId = req.user.id;
    
    // Cannot create chat with yourself
    if (senderId === receiverId) {
      return res.status(400).json({ message: 'Cannot create chat with yourself' });
    }
    
    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }
    
    // Check if chat already exists between these users (and optionally for this product)
    const filter: any = {
      participants: { $all: [senderId, receiverId] }
    };
    
    if (productId) {
      filter.product = productId;
    }
    
    let chat = await Chat.findOne(filter);
    
    if (chat) {
      return res.json(chat); // Return existing chat
    }
    
    // Create new chat
    chat = new Chat({
      participants: [senderId, receiverId],
      product: productId,
      unreadCount: { [receiverId]: 0 }
    });
    
    await chat.save();
    
    // Populate the chat
    chat = await Chat.findById(chat._id).populate([
      {
        path: 'participants',
        select: 'name avatar'
      },
      {
        path: 'product',
        select: 'title images price status'
      }
    ]);
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send a new message in a chat
export const sendMessage = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content, attachments } = req.body;
    const chatId = req.params.id;
    const senderId = req.user.id;
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.includes(new mongoose.Types.ObjectId(senderId))) {
      return res.status(403).json({ message: 'Not authorized to send messages in this chat' });
    }
    
    // Create new message
    const message = new Message({
      chat: chatId,
      sender: senderId,
      content,
      attachments: attachments || []
    });
    
    await message.save();
    
    // Update chat's last message and unread count
    const otherParticipants = chat.participants.filter(
      p => p.toString() !== senderId
    );
    
    // Properly handle the Map type for unreadCount
    otherParticipants.forEach(participant => {
      const participantId = participant.toString();
      const currentCount = chat.unreadCount.get(participantId) || 0;
      chat.unreadCount.set(participantId, currentCount + 1);
    });
    
    chat.lastMessage = message._id;
    await chat.save();
    
    // Populate the message
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'name avatar');
    
    // Emit real-time message to all participants in the chat room
    const io = req.app.get('io');
    if (io) {
      // Emit to the chat room
      io.to(chatId).emit('newMessage', {
        message: populatedMessage,
        chatId: chatId
      });
      
      // Also emit chat update for unread counts
      io.to(chatId).emit('chatUpdated', {
        chatId: chatId,
        lastMessage: populatedMessage,
        unreadCount: Object.fromEntries(chat.unreadCount)
      });
    }
    
    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all messages for a specific chat
export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.includes(new mongoose.Types.ObjectId(userId))) {
      return res.status(403).json({ message: 'Not authorized to access messages in this chat' });
    }
    
    // Get messages
    const messages = await Message.find({ chat: chatId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Mark chat as read
export const markChatAsRead = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.includes(new mongoose.Types.ObjectId(userId))) {
      return res.status(403).json({ message: 'Not authorized to access this chat' });
    }
    
    // Reset unread count for the user using Map.set method
    chat.unreadCount.set(userId, 0);
    await chat.save();
    
    // Emit read status update to other participants
    const io = req.app.get('io');
    if (io) {
      io.to(chatId).emit('chatRead', {
        chatId: chatId,
        userId: userId,
        unreadCount: Object.fromEntries(chat.unreadCount)
      });
    }
    
    res.json({ message: 'Chat marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a chat
export const deleteChat = async (req: Request, res: Response) => {
  try {
    const chatId = req.params.id;
    const userId = req.user.id;
    
    // Find the chat
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Check if user is a participant
    if (!chat.participants.includes(new mongoose.Types.ObjectId(userId))) {
      return res.status(403).json({ message: 'Not authorized to delete this chat' });
    }
    
    // Delete all messages in the chat
    await Message.deleteMany({ chat: chatId });
    
    // Delete the chat
    await chat.deleteOne();
    
    res.json({ message: 'Chat deleted' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 