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
const commentController = __importStar(require("../controllers/commentController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - content
 *         - user
 *         - product
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the comment
 *         content:
 *           type: string
 *           description: Comment content
 *         user:
 *           type: string
 *           description: ID of the user who posted the comment
 *         product:
 *           type: string
 *           description: ID of the product being commented on
 *         parent:
 *           type: string
 *           description: ID of the parent comment (if this is a reply)
 *         likes:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who liked the comment
 *         likeCount:
 *           type: number
 *           description: Number of likes on the comment
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Comment creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Comment last update timestamp
 */
/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Comment management for products
 */
/**
 * @swagger
 * /api/comments/product/{productId}:
 *   get:
 *     summary: Get all comments for a product
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: Product ID
 *     responses:
 *       200:
 *         description: List of comments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.get('/product/:productId', commentController.getCommentsByProduct);
/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create a new comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - content
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to comment on
 *               content:
 *                 type: string
 *                 description: Comment content
 *     responses:
 *       201:
 *         description: Comment created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Product not found
 */
// @ts-ignore - Type issues with Express 5
router.post('/', auth_1.authenticate, [
    (0, express_validator_1.body)('productId').notEmpty().withMessage('Product ID is required'),
    (0, express_validator_1.body)('content').notEmpty().withMessage('Content is required')
], commentController.createComment);
/**
 * @swagger
 * /api/comments/{id}:
 *   put:
 *     summary: Update a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Comment ID
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
 *                 description: Updated comment content
 *     responses:
 *       200:
 *         description: Comment updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to update this comment
 *       404:
 *         description: Comment not found
 */
// @ts-ignore - Type issues with Express 5
router.put('/:id', auth_1.authenticate, [
    (0, express_validator_1.body)('content').notEmpty().withMessage('Content is required')
], commentController.updateComment);
/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Not authorized to delete this comment
 *       404:
 *         description: Comment not found
 */
// @ts-ignore - Type issues with Express 5
router.delete('/:id', auth_1.authenticate, commentController.deleteComment);
/**
 * @swagger
 * /api/comments/{id}/replies:
 *   post:
 *     summary: Reply to a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Parent comment ID
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
 *                 description: Reply content
 *     responses:
 *       201:
 *         description: Reply created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Parent comment not found
 */
// @ts-ignore - Type issues with Express 5
router.post('/:id/replies', auth_1.authenticate, [
    (0, express_validator_1.body)('content').notEmpty().withMessage('Content is required')
], commentController.replyToComment);
/**
 * @swagger
 * /api/comments/{id}/replies:
 *   get:
 *     summary: Get replies for a comment
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Parent comment ID
 *     responses:
 *       200:
 *         description: List of replies
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Parent comment not found
 */
// @ts-ignore - Type issues with Express 5
router.get('/:id/replies', commentController.getCommentReplies);
/**
 * @swagger
 * /api/comments/{id}/like:
 *   post:
 *     summary: Like a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment liked
 *       400:
 *         description: Comment already liked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
// @ts-ignore - Type issues with Express 5
router.post('/:id/like', auth_1.authenticate, commentController.likeComment);
/**
 * @swagger
 * /api/comments/{id}/like:
 *   delete:
 *     summary: Unlike a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment unliked
 *       400:
 *         description: Comment not liked
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Comment not found
 */
// @ts-ignore - Type issues with Express 5
router.delete('/:id/like', auth_1.authenticate, commentController.unlikeComment);
exports.default = router;
