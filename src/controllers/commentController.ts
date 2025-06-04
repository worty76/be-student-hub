import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Comment from '../models/Comment';
import Product from '../models/Product';
import mongoose from 'mongoose';

// Get all comments for a product
export const getCommentsByProduct = async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get top-level comments only (no parent)
    const comments = await Comment.find({ 
      product: productId,
      parent: { $exists: false }
    })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
    
    res.json(comments);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create a new comment
export const createComment = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { productId, content } = req.body;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Create new comment
    const comment = new Comment({
      product: productId,
      user: req.user.id,
      content
    });
    
    await comment.save();
    
    // Populate user info
    const populatedComment = await Comment.findById(comment._id)
      .populate('user', 'name avatar');
    
    res.status(201).json(populatedComment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update a comment
export const updateComment = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const commentId = req.params.id;
    
    // Find comment
    const comment = await Comment.findById(commentId);
    
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
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete a comment
export const deleteComment = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    
    // Find comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if user owns the comment
    if (comment.user.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }
    
    // Delete any replies to this comment
    await Comment.deleteMany({ parent: commentId });
    
    // Delete the comment
    await comment.deleteOne();
    
    res.json({ message: 'Comment removed' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reply to a comment
export const replyToComment = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { content } = req.body;
    const parentId = req.params.id;
    
    // Find parent comment
    const parentComment = await Comment.findById(parentId);
    
    if (!parentComment) {
      return res.status(404).json({ message: 'Parent comment not found' });
    }
    
    // Create reply
    const reply = new Comment({
      product: parentComment.product,
      user: req.user.id,
      content,
      parent: parentId
    });
    
    await reply.save();
    
    // Populate user info
    const populatedReply = await Comment.findById(reply._id)
      .populate('user', 'name avatar');
    
    res.status(201).json(populatedReply);
  } catch (error) {
    console.error('Reply to comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get replies for a comment
export const getCommentReplies = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    
    // Verify parent comment exists
    const parentComment = await Comment.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Get replies
    const replies = await Comment.find({ parent: commentId })
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 });
    
    res.json(replies);
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Like a comment
export const likeComment = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    
    // Find comment
    const comment = await Comment.findById(commentId);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    
    // Check if already liked
    if (comment.likes.includes(new mongoose.Types.ObjectId(userId))) {
      return res.status(400).json({ message: 'Comment already liked' });
    }
    
    // Add like
    comment.likes.push(new mongoose.Types.ObjectId(userId));
    await comment.save();
    
    res.json({ message: 'Comment liked' });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Unlike a comment
export const unlikeComment = async (req: Request, res: Response) => {
  try {
    const commentId = req.params.id;
    const userId = req.user.id;
    
    // Find comment
    const comment = await Comment.findById(commentId);
    
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
  } catch (error) {
    console.error('Unlike comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 