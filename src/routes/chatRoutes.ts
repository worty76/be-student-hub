import express from 'express';
import { body } from 'express-validator';
import * as chatController from '../controllers/chatController';
import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Chat:
 *       type: object
 *       required:
 *         - participants
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the chat
 *         participants:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs participating in the chat
 *         product:
 *           type: string
 *           description: Optional product ID related to the chat
 *         lastMessage:
 *           type: string
 *           description: ID of the last message in the chat
 *         unreadCount:
 *           type: object
 *           additionalProperties:
 *             type: number
 *           description: Number of unread messages per user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Chat creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Chat last update timestamp
 *     Message:
 *       type: object
 *       required:
 *         - content
 *         - sender
 *         - chat
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the message
 *         content:
 *           type: string
 *           description: Message content
 *         sender:
 *           type: string
 *           description: ID of the user who sent the message
 *         chat:
 *           type: string
 *           description: ID of the chat the message belongs to
 *         attachments:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of attachment URLs
 *         read:
 *           type: boolean
 *           description: Whether the message has been read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Message creation timestamp
 */

/**
 * @swagger
 * tags:
 *   name: Chats
 *   description: Chat management and messaging
 */

/**
 * @swagger
 * /api/chats:
 *   get:
 *     summary: Get all chats for the authenticated user
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's chats
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Unauthorized
 */
// @ts-ignore - Type issues with Express 5
router.get('/', authenticate, chatController.getUserChats);

/**
 * @swagger
 * /api/chats/{id}:
 *   get:
 *     summary: Get a specific chat by ID
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 */
// @ts-ignore - Type issues with Express 5
router.get('/:id', authenticate, chatController.getChatById);

/**
 * @swagger
 * /api/chats:
 *   post:
 *     summary: Create a new chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *             properties:
 *               receiverId:
 *                 type: string
 *                 description: ID of the user to chat with
 *               productId:
 *                 type: string
 *                 description: Optional product ID related to the chat
 *     responses:
 *       201:
 *         description: Chat created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chat'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
// @ts-ignore - Type issues with Express 5
router.post(
  '/',
  authenticate as any,
  [
    body('receiverId').notEmpty().withMessage('Receiver ID is required'),
    body('productId').optional()
  ],
  chatController.createChat as any
);

/**
 * @swagger
 * /api/chats/{id}/messages:
 *   post:
 *     summary: Send a new message in a chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: Message content
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional array of attachment URLs
 *     responses:
 *       201:
 *         description: Message sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 */
// @ts-ignore - Type issues with Express 5
router.post(
  '/:id/messages',
  authenticate as any,
  [
    body('content').notEmpty().withMessage('Message content is required'),
    body('attachments').optional()
  ],
  chatController.sendMessage as any
);

/**
 * @swagger
 * /api/chats/{id}/messages:
 *   get:
 *     summary: Get all messages for a specific chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: List of messages
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 */
// @ts-ignore - Type issues with Express 5
router.get('/:id/messages', authenticate, chatController.getChatMessages);

/**
 * @swagger
 * /api/chats/{id}/read:
 *   put:
 *     summary: Mark chat as read
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat marked as read
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 */
// @ts-ignore - Type issues with Express 5
router.put('/:id/read', authenticate, chatController.markChatAsRead);

/**
 * @swagger
 * /api/chats/{id}:
 *   delete:
 *     summary: Delete a chat
 *     tags: [Chats]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Chat ID
 *     responses:
 *       200:
 *         description: Chat deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chat not found
 */
// @ts-ignore - Type issues with Express 5
router.delete('/:id', authenticate, chatController.deleteChat);

export default router; 