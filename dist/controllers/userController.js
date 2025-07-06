"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestEmail = exports.resetPassword = exports.forgetPassword = exports.getDashboardStats = exports.getReportedUsers = exports.deleteUser = exports.updateUserByAdmin = exports.getAllUsers = exports.reportUser = exports.rateUser = exports.getUserRatings = exports.getUserById = exports.updateProfile = exports.getProfile = exports.login = exports.register = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const User_1 = __importDefault(require("../models/User"));
const Rating_1 = __importDefault(require("../models/Rating"));
const Product_1 = __importDefault(require("../models/Product"));
const Report_1 = __importDefault(require("../models/Report"));
const emailService_1 = require("../services/emailService");
// Generate JWT token
const generateToken = (userId) => {
    const secret = process.env.JWT_SECRET || "your-secret-key";
    return jsonwebtoken_1.default.sign({ userId }, secret, { expiresIn: "7d" });
};
// Register user
const register = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { name, email, password, role } = req.body;
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "Người dùng đã tồn tại với email này" });
            return;
        }
        // Create new user
        const user = new User_1.default({
            name,
            email,
            password,
            role: role || "user", // Default to 'user' if not provided
        });
        await user.save();
        // Generate token
        const token = generateToken(user._id.toString());
        // Send welcome email (don't wait for it to complete)
        emailService_1.emailService.sendWelcomeEmail(user).catch((error) => {
            console.error("Failed to send welcome email:", error);
        });
        res.status(201).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.register = register;
// Login user
const login = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email, password } = req.body;
        // Find user by email
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        // Generate token
        const token = generateToken(user._id.toString());
        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.login = login;
// Get user profile
const getProfile = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id).select("-password");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getProfile = getProfile;
// Update user profile
const updateProfile = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { name, email, bio, avatar, location, role } = req.body;
        // Find user
        let user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Update fields
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (bio !== undefined)
            user.bio = bio;
        if (avatar !== undefined)
            user.avatar = avatar;
        if (location !== undefined)
            user.location = location;
        // Only allow role updates if user is an admin
        if (role !== undefined && req.user.role === "admin") {
            user.role = role;
        }
        await user.save();
        res.json(user);
    }
    catch (error) {
        console.error("Update profile error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateProfile = updateProfile;
// Get user by ID
const getUserById = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id).select("-password");
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Get user's product count
        const productCount = await Product_1.default.countDocuments({ seller: user._id });
        res.json({
            ...user.toObject(),
            productCount,
        });
    }
    catch (error) {
        console.error("Get user error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUserById = getUserById;
// Get user ratings
const getUserRatings = async (req, res) => {
    try {
        const ratings = await Rating_1.default.find({ rated: req.params.id })
            .populate("rater", "name avatar")
            .sort({ createdAt: -1 });
        res.json(ratings);
    }
    catch (error) {
        console.error("Get ratings error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getUserRatings = getUserRatings;
// Rate a user
const rateUser = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { rating, comment } = req.body;
        const raterId = req.user.id;
        const ratedId = req.params.id;
        // Can't rate yourself
        if (raterId === ratedId) {
            res.status(400).json({ message: "You cannot rate yourself" });
            return;
        }
        // Find rated user
        const ratedUser = await User_1.default.findById(ratedId);
        if (!ratedUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Check if user already rated
        let userRating = await Rating_1.default.findOne({ rater: raterId, rated: ratedId });
        if (userRating) {
            // Update existing rating
            userRating.rating = rating;
            if (comment !== undefined)
                userRating.comment = comment;
            await userRating.save();
        }
        else {
            // Create new rating
            userRating = new Rating_1.default({
                rater: raterId,
                rated: ratedId,
                rating,
                comment,
            });
            await userRating.save();
        }
        // Update user's average rating
        const allRatings = await Rating_1.default.find({ rated: ratedId });
        const totalRating = allRatings.reduce((sum, item) => sum + item.rating, 0);
        const averageRating = totalRating / allRatings.length;
        // Update user
        ratedUser.rating = averageRating;
        ratedUser.ratingCount = allRatings.length;
        await ratedUser.save();
        res.status(201).json(userRating);
    }
    catch (error) {
        console.error("Rate user error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.rateUser = rateUser;
// Report a user
const reportUser = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { reason, description } = req.body;
        const reporterId = req.user.id;
        const reportedId = req.params.id;
        // Can't report yourself
        if (reporterId === reportedId) {
            res.status(400).json({ message: "You cannot report yourself" });
            return;
        }
        // Find reported user
        const reportedUser = await User_1.default.findById(reportedId);
        if (!reportedUser) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Create a report
        // Note: You would typically have a Report model/schema
        // This is a placeholder for where you would create the report
        const report = {
            type: "user",
            reporter: reporterId,
            reported: reportedId,
            reason,
            description: description || "",
            status: "pending", // pending, reviewed, dismissed
            createdAt: new Date(),
        };
        // In a real implementation, you'd save this to a Reports collection
        // const newReport = new Report(report);
        // await newReport.save();
        // For now, just return success response
        res.status(201).json({
            message: "User reported successfully",
            report,
        });
    }
    catch (error) {
        console.error("Report user error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.reportUser = reportUser;
// ADMIN USER MANAGEMENT FUNCTIONS
// Get all users (admin)
const getAllUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, role, sort = "createdAt", order = "desc", } = req.query;
        // Build filter object
        const filter = {};
        if (role)
            filter.role = role;
        // Build sort object
        const sortObj = {};
        sortObj[sort] = order === "asc" ? 1 : -1;
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Get users with pagination
        const users = await User_1.default.find(filter)
            .select("-password")
            .sort(sortObj)
            .skip(skip)
            .limit(Number(limit));
        // Get total count for pagination
        const total = await User_1.default.countDocuments(filter);
        res.json({
            users,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getAllUsers = getAllUsers;
// Update any user by admin
const updateUserByAdmin = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { name, email, role, bio, avatar, location } = req.body;
        // Find user
        let user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Update fields
        if (name)
            user.name = name;
        if (email)
            user.email = email;
        if (role)
            user.role = role;
        if (bio !== undefined)
            user.bio = bio;
        if (avatar !== undefined)
            user.avatar = avatar;
        if (location !== undefined)
            user.location = location;
        await user.save();
        res.json({
            message: "User updated by admin",
            user: {
                ...user.toObject(),
                password: undefined,
            },
        });
    }
    catch (error) {
        console.error("Admin update user error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.updateUserByAdmin = updateUserByAdmin;
// Delete a user (admin only)
const deleteUser = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        // Delete the user
        await User_1.default.findByIdAndDelete(req.params.id);
        // Delete all products by this user
        await Product_1.default.deleteMany({ seller: req.params.id });
        // Remove from favorites lists
        await User_1.default.updateMany({ favorites: { $in: [req.params.id] } }, { $pull: { favorites: req.params.id } });
        // Delete ratings
        await Rating_1.default.deleteMany({
            $or: [{ rater: req.params.id }, { rated: req.params.id }],
        });
        res.json({ message: "User and all associated data deleted successfully" });
    }
    catch (error) {
        console.error("Delete user error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.deleteUser = deleteUser;
// Get reported users (admin)
const getReportedUsers = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = "pending", // pending, reviewed, dismissed
         } = req.query;
        // Calculate pagination
        const skip = (Number(page) - 1) * Number(limit);
        // Find reports for users
        const reports = await Report_1.default.find({
            type: "user",
            status: status,
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .populate("reporter", "name email")
            .populate("reported", "name email");
        // Get total count for pagination
        const total = await Report_1.default.countDocuments({
            type: "user",
            status: status,
        });
        res.json({
            reports,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Get reported users error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getReportedUsers = getReportedUsers;
// Get dashboard stats (admin)
const getDashboardStats = async (req, res) => {
    try {
        // Get various counts for dashboard
        const userCount = await User_1.default.countDocuments();
        const productCount = await Product_1.default.countDocuments();
        const availableProductCount = await Product_1.default.countDocuments({
            status: "available",
        });
        const soldProductCount = await Product_1.default.countDocuments({ status: "sold" });
        // Get recent products
        const recentProducts = await Product_1.default.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("seller", "name");
        // Get recent users
        const recentUsers = await User_1.default.find()
            .select("-password")
            .sort({ createdAt: -1 })
            .limit(5);
        // Get stats by category
        const categoryStats = await Product_1.default.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
        ]);
        res.json({
            counts: {
                users: userCount,
                products: productCount,
                availableProducts: availableProductCount,
                soldProducts: soldProductCount,
            },
            recentProducts,
            recentUsers,
            categoryStats,
        });
    }
    catch (error) {
        console.error("Get admin dashboard stats error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.getDashboardStats = getDashboardStats;
// Forget password
const forgetPassword = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { email } = req.body;
        // Find user by email
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ message: "User not found with this email" });
            return;
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(32).toString("hex");
        // Set token and expiration (1 hour from now)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
        await user.save();
        // Send password reset email
        try {
            await emailService_1.emailService.sendPasswordResetEmail(user, resetToken);
            res.json({
                message: "Password reset email sent successfully. Please check your email.",
                email: user.email,
            });
        }
        catch (emailError) {
            console.error("Email sending failed:", emailError);
            // Clear the reset token if email fails
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            res.status(500).json({
                message: "Failed to send password reset email. Please try again later."
            });
        }
    }
    catch (error) {
        console.error("Forget password error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.forgetPassword = forgetPassword;
// Reset password
const resetPassword = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { token, newPassword } = req.body;
        // Find user by reset token and check if token is still valid
        const user = await User_1.default.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });
        if (!user) {
            res.status(400).json({ message: "Invalid or expired reset token" });
            return;
        }
        // Update password
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ message: "Password reset successfully" });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Server error" });
    }
};
exports.resetPassword = resetPassword;
// Test email endpoint (remove in production)
const sendTestEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ message: "Email is required" });
            return;
        }
        await emailService_1.emailService.sendTestEmail(email);
        res.json({
            message: "Test email sent successfully! Check your inbox.",
            email: email,
        });
    }
    catch (error) {
        console.error("Test email error:", error);
        res.status(500).json({
            message: "Failed to send test email",
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
};
exports.sendTestEmail = sendTestEmail;
