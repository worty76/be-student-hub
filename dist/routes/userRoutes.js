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
const userController = __importStar(require("../controllers/userController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the user
 *         email:
 *           type: string
 *           description: User email address
 *         name:
 *           type: string
 *           description: User full name
 *         avatar:
 *           type: string
 *           description: URL to user avatar image
 *         bio:
 *           type: string
 *           description: User biography
 *         location:
 *           type: string
 *           description: User location
 *         rating:
 *           type: number
 *           description: Average user rating
 *         ratingCount:
 *           type: number
 *           description: Number of ratings received
 *         favorites:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of product IDs saved as favorites
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: User role (user or admin)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Account last update timestamp
 *     Rating:
 *       type: object
 *       required:
 *         - rating
 *         - user
 *         - target
 *       properties:
 *         _id:
 *           type: string
 *           description: The auto-generated ID of the rating
 *         rating:
 *           type: number
 *           description: Rating value (1-5)
 *         comment:
 *           type: string
 *           description: Optional comment with the rating
 *         user:
 *           type: string
 *           description: ID of user who left the rating
 *         target:
 *           type: string
 *           description: ID of user who received the rating
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Rating creation timestamp
 */
/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and authentication
 */
/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *               name:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: User role (defaults to 'user' if not specified)
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 */
// Register new user
router.post("/register", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Please enter a valid email"),
    (0, express_validator_1.body)("password")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long"),
    (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
    (0, express_validator_1.body)("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
], 
// @ts-ignore - Type issues with Express 5
userController.register);
/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Invalid credentials
 */
// Login user
router.post("/login", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Please enter a valid email"),
    (0, express_validator_1.body)("password").notEmpty().withMessage("Password is required"),
], 
// @ts-ignore - Type issues with Express 5
userController.login);
/**
 * @swagger
 * /api/users/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Not authenticated
 */
// Logout user
router.post("/logout", auth_1.authenticate, 
// @ts-ignore - Type issues with Express 5
userController.logout);
/**
 * @swagger
 * /api/users/forget-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the user
 *     responses:
 *       200:
 *         description: Password reset token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 resetToken:
 *                   type: string
 *                 email:
 *                   type: string
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User not found
 */
// Forget password
router.post("/forget-password", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Please enter a valid email"),
], 
// @ts-ignore - Type issues with Express 5
userController.forgetPassword);
/**
 * @swagger
 * /api/users/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset token
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid input or expired token
 */
// Reset password
router.post("/reset-password", [
    (0, express_validator_1.body)("token").notEmpty().withMessage("Reset token is required"),
    (0, express_validator_1.body)("newPassword")
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters long"),
], 
// @ts-ignore - Type issues with Express 5
userController.resetPassword);
/**
 * @swagger
 * /api/users/test-email:
 *   post:
 *     summary: Send test email (development only)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to send test email to
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Failed to send email
 */
// Test email (remove in production)
router.post("/test-email", [
    (0, express_validator_1.body)("email").isEmail().withMessage("Please enter a valid email"),
], 
// @ts-ignore - Type issues with Express 5
userController.sendTestEmail);
/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
// Get user profile
// @ts-ignore - Type issues with Express 5
router.get("/profile", auth_1.authenticate, userController.getProfile);
/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               bio:
 *                 type: string
 *               avatar:
 *                 type: string
 *               location:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 description: User role (admin users only)
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
// Update user profile
router.put("/profile", auth_1.authenticate, [
    (0, express_validator_1.body)("name").optional(),
    (0, express_validator_1.body)("email")
        .optional()
        .isEmail()
        .withMessage("Please enter a valid email"),
    (0, express_validator_1.body)("bio").optional(),
    (0, express_validator_1.body)("avatar").optional(),
    (0, express_validator_1.body)("location").optional(),
    (0, express_validator_1.body)("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
], 
// @ts-ignore - Type issues with Express 5
userController.updateProfile);
// ADMIN ROUTES - Must come before parameterized routes
/**
 * @swagger
 * /api/users/admin/all:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
// Get all users (admin only)
// @ts-ignore - Type issues with Express 5
router.get("/admin/all", auth_1.authenticate, auth_1.isAdmin, userController.getAllUsers);
/**
 * @swagger
 * /api/users/admin/{id}:
 *   put:
 *     summary: Update any user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *     responses:
 *       200:
 *         description: User updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
// Update any user (admin only)
router.put("/admin/:id", auth_1.authenticate, auth_1.isAdmin, [
    (0, express_validator_1.body)("name").optional(),
    (0, express_validator_1.body)("email")
        .optional()
        .isEmail()
        .withMessage("Please enter a valid email"),
    (0, express_validator_1.body)("role").optional().isIn(["user", "admin"]).withMessage("Invalid role"),
], 
// @ts-ignore - Type issues with Express 5
userController.updateUserByAdmin);
/**
 * @swagger
 * /api/users/admin/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: User not found
 */
// Delete a user (admin only)
// @ts-ignore - Type issues with Express 5
router.delete("/admin/:id", auth_1.authenticate, auth_1.isAdmin, userController.deleteUser);
// PARAMETERIZED ROUTES - Must come after specific routes
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
// Get user by ID
// @ts-ignore - Type issues with Express 5
router.get("/:id", userController.getUserById);
/**
 * @swagger
 * /api/users/{id}/ratings:
 *   get:
 *     summary: Get user ratings
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of user ratings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Rating'
 *       404:
 *         description: User not found
 */
// Get user ratings
// @ts-ignore - Type issues with Express 5
router.get("/:id/ratings", userController.getUserRatings);
/**
 * @swagger
 * /api/users/{id}/rate:
 *   post:
 *     summary: Rate a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to rate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating value
 *               comment:
 *                 type: string
 *                 description: Optional comment
 *     responses:
 *       201:
 *         description: Rating created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
// Rate a user
router.post("/:id/rate", auth_1.authenticate, [
    (0, express_validator_1.body)("rating")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be between 1 and 5"),
    (0, express_validator_1.body)("comment").optional(),
], 
// @ts-ignore - Type issues with Express 5
userController.rateUser);
/**
 * @swagger
 * /api/users/{id}/report:
 *   post:
 *     summary: Report a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: User ID to report
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 enum: [inappropriate, fake, scam, harassment, other]
 *                 description: Reason for reporting
 *               description:
 *                 type: string
 *                 description: Additional details about the report
 *     responses:
 *       201:
 *         description: User reported successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post("/:id/report", auth_1.authenticate, [
    (0, express_validator_1.body)("reason")
        .isIn(["inappropriate", "fake", "scam", "harassment", "other"])
        .withMessage("Valid reason is required"),
    (0, express_validator_1.body)("description").optional(),
], 
// @ts-ignore - Type issues with Express 5
userController.reportUser);
/**
 * @swagger
 * /api/users/admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
// @ts-ignore - Type issues with Express 5
router.get("/admin/dashboard", auth_1.authenticate, auth_1.isAdmin, userController.getDashboardStats);
/**
 * @swagger
 * /api/users/admin/reports:
 *   get:
 *     summary: Get reported users (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, reviewed, dismissed]
 *         description: Report status
 *     responses:
 *       200:
 *         description: List of reported users
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
// @ts-ignore - Type issues with Express 5
router.get("/admin/reports", auth_1.authenticate, auth_1.isAdmin, userController.getReportedUsers);
exports.default = router;
