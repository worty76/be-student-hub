"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlikeComment = exports.likeComment = exports.getCommentReplies = exports.replyToComment = exports.deleteComment = exports.updateComment = exports.createComment = exports.getCommentsByProduct = void 0;
const express_validator_1 = require("express-validator");
const Comment_1 = __importDefault(require("../models/Comment"));
const Product_1 = __importDefault(require("../models/Product"));
const mongoose_1 = __importDefault(require("mongoose"));
// Get all comments for a product
const getCommentsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;
        // Verify product exists
        const product = await Product_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Get top-level comments only (no parent)
        const comments = await Comment_1.default.find({
            product: productId,
            parent: { $exists: false }
        })
            .populate('user', 'name avatar')
            .sort({ createdAt: -1 });
        res.json(comments);
    }
    catch (error) {
        console.error('Get comments error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getCommentsByProduct = getCommentsByProduct;
// Create a new comment
const createComment = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { productId, content } = req.body;
        // Verify product exists
        const product = await Product_1.default.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        // Create new comment
        const comment = new Comment_1.default({
            product: productId,
            user: req.user.id,
            content
        });
        await comment.save();
        // Populate user info
        const populatedComment = await Comment_1.default.findById(comment._id)
            .populate('user', 'name avatar');
        res.status(201).json(populatedComment);
    }
    catch (error) {
        console.error('Create comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createComment = createComment;
// Update a comment
const updateComment = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { content } = req.body;
        const commentId = req.params.id;
        // Find comment
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        // Check if user owns the comment
        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this comment' });
        }
        // Update comment
        comment.content = content;
        await comment.save();
        res.json(comment);
    }
    catch (error) {
        console.error('Update comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateComment = updateComment;
// Delete a comment
const deleteComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        // Find comment
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        // Check if user owns the comment
        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }
        // Delete any replies to this comment
        await Comment_1.default.deleteMany({ parent: commentId });
        // Delete the comment
        await comment.deleteOne();
        res.json({ message: 'Comment removed' });
    }
    catch (error) {
        console.error('Delete comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.deleteComment = deleteComment;
// Reply to a comment
const replyToComment = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { content } = req.body;
        const parentId = req.params.id;
        // Find parent comment
        const parentComment = await Comment_1.default.findById(parentId);
        if (!parentComment) {
            return res.status(404).json({ message: 'Parent comment not found' });
        }
        // Create reply
        const reply = new Comment_1.default({
            product: parentComment.product,
            user: req.user.id,
            content,
            parent: parentId
        });
        await reply.save();
        // Populate user info
        const populatedReply = await Comment_1.default.findById(reply._id)
            .populate('user', 'name avatar');
        res.status(201).json(populatedReply);
    }
    catch (error) {
        console.error('Reply to comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.replyToComment = replyToComment;
// Get replies for a comment
const getCommentReplies = async (req, res) => {
    try {
        const commentId = req.params.id;
        // Verify parent comment exists
        const parentComment = await Comment_1.default.findById(commentId);
        if (!parentComment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        // Get replies
        const replies = await Comment_1.default.find({ parent: commentId })
            .populate('user', 'name avatar')
            .sort({ createdAt: 1 });
        res.json(replies);
    }
    catch (error) {
        console.error('Get replies error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getCommentReplies = getCommentReplies;
// Like a comment
const likeComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user.id;
        // Find comment
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        // Check if already liked
        if (comment.likes.includes(new mongoose_1.default.Types.ObjectId(userId))) {
            return res.status(400).json({ message: 'Comment already liked' });
        }
        // Add like
        comment.likes.push(new mongoose_1.default.Types.ObjectId(userId));
        await comment.save();
        res.json({ message: 'Comment liked' });
    }
    catch (error) {
        console.error('Like comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.likeComment = likeComment;
// Unlike a comment
const unlikeComment = async (req, res) => {
    try {
        const commentId = req.params.id;
        const userId = req.user.id;
        // Find comment
        const comment = await Comment_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }
        // Check if not liked
        if (!comment.likes.some(id => id.toString() === userId)) {
            return res.status(400).json({ message: 'Comment not liked yet' });
        }
        // Remove like
        comment.likes = comment.likes.filter(id => id.toString() !== userId);
        await comment.save();
        res.json({ message: 'Comment unliked' });
    }
    catch (error) {
        console.error('Unlike comment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.unlikeComment = unlikeComment;
