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
const paymentController = __importStar(require("../controllers/paymentController"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment API
 */
/**
 * @swagger
 * /api/payments/momo/create:
 *   post:
 *     summary: Create a new MoMo payment
 *     tags: [Payments]
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
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to purchase
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payUrl:
 *                   type: string
 *                   description: URL to redirect user for payment
 *                 orderId:
 *                   type: string
 *                   description: Order ID for tracking
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Product not found
 */
router.post('/momo/create', auth_1.authenticate, [
    (0, express_validator_1.body)('productId')
        .notEmpty()
        .withMessage('Product ID is required')
], paymentController.createPayment);
/**
 * @swagger
 * /api/payments/vnpay/create:
 *   post:
 *     summary: Create a new VNPay payment
 *     tags: [Payments]
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
 *             properties:
 *               productId:
 *                 type: string
 *                 description: ID of the product to purchase
 *               bankCode:
 *                 type: string
 *                 description: Bank code for direct bank payment
 *               locale:
 *                 type: string
 *                 enum: [vn, en]
 *                 default: vn
 *                 description: Language for payment page
 *     responses:
 *       200:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 payUrl:
 *                   type: string
 *                   description: URL to redirect user for payment
 *                 orderId:
 *                   type: string
 *                   description: Order ID for tracking
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Product not found
 */
router.post('/vnpay/create', auth_1.authenticate, [
    (0, express_validator_1.body)('productId')
        .notEmpty()
        .withMessage('Product ID is required')
], paymentController.createVNPayPayment);
/**
 * @swagger
 * /api/payments/vnpay/return:
 *   get:
 *     summary: Handle VNPay payment return
 *     description: Endpoint for VNPay to return the user after payment completion
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: vnp_ResponseCode
 *         schema:
 *           type: string
 *         description: Response code from VNPay
 *       - in: query
 *         name: vnp_TxnRef
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       302:
 *         description: Redirects to success or failure page
 */
router.get('/vnpay/return', paymentController.handleVNPayReturn);
/**
 * @swagger
 * /api/payments/vnpay/ipn:
 *   get:
 *     summary: Handle VNPay IPN (Instant Payment Notification)
 *     description: Endpoint for VNPay to send payment notifications
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: IPN processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 RspCode:
 *                   type: string
 *                 Message:
 *                   type: string
 */
router.get('/vnpay/ipn', paymentController.handleVNPayIPN);
/**
 * @swagger
 * /api/payments/vnpay/query:
 *   post:
 *     summary: Query VNPay transaction status
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - transactionDate
 *             properties:
 *               orderId:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: YYYYMMDDHHmmss
 *     responses:
 *       200:
 *         description: Transaction query result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.post('/vnpay/query', auth_1.authenticate, paymentController.queryVNPayTransaction);
/**
 * @swagger
 * /api/payments/vnpay/refund:
 *   post:
 *     summary: Request refund for VNPay transaction
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - transactionDate
 *               - amount
 *               - transactionType
 *             properties:
 *               orderId:
 *                 type: string
 *               transactionDate:
 *                 type: string
 *                 format: YYYYMMDDHHmmss
 *               amount:
 *                 type: number
 *               transactionType:
 *                 type: string
 *                 enum: [02, 03]
 *                 description: 02 for partial refund, 03 for full refund
 *     responses:
 *       200:
 *         description: Refund request result
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Not authenticated
 */
router.post('/vnpay/refund', auth_1.authenticate, paymentController.refundVNPayTransaction);
/**
 * @swagger
 * /api/payments/{orderId}/status:
 *   get:
 *     summary: Get payment status by order ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         schema:
 *           type: string
 *         required: true
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment status
 *       401:
 *         description: Not authenticated
 *       404:
 *         description: Payment not found
 */
router.get('/:orderId/status', auth_1.authenticate, paymentController.getPaymentStatus);
/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Payment history
 *       401:
 *         description: Not authenticated
 */
router.get('/history', auth_1.authenticate, paymentController.getPaymentHistory);
/**
 * @swagger
 * /api/payments/momo/ipn:
 *   post:
 *     summary: Handle MoMo IPN (Instant Payment Notification)
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: IPN processed
 */
router.post('/momo/ipn', paymentController.handleMomoIPN);
exports.default = router;
