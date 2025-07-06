"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authentication required. No token provided.' });
        }
        const token = authHeader.split(' ')[1];
        // Verify token
        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // Find user
        const user = await User_1.default.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        // Attach user to request
        req.user = user;
        next();
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ message: 'Invalid token' });
    }
};
exports.authenticate = authenticate;
const isAdmin = async (req, res, next) => {
    try {
        // User should already be authenticated with the authenticate middleware
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admin role required' });
        }
        next();
    }
    catch (error) {
        console.error('Admin middleware error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
};
exports.isAdmin = isAdmin;
