"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const chatController = __importStar(require("../controllers/chatController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
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
router.get('/', auth_1.authenticate, chatController.getUserChats);
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
router.get('/:id', auth_1.authenticate, chatController.getChatById);
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
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('receiverId').notEmpty().withMessage('Receiver ID is required'),
    (0, express_validator_1.body)('productId').optional()
], chatController.createChat);
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
router.post('/:id/messages', auth_1.authenticate, [
    (0, express_validator_1.body)('content').notEmpty().withMessage('Message content is required'),
    (0, express_validator_1.body)('attachments').optional()
], chatController.sendMessage);
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
router.get('/:id/messages', auth_1.authenticate, chatController.getChatMessages);
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
router.put('/:id/read', auth_1.authenticate, chatController.markChatAsRead);
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
router.delete('/:id', auth_1.authenticate, chatController.deleteChat);
exports.default = router;
