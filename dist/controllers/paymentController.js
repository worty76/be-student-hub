"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPaymentHistory = exports.refundVNPayTransaction = exports.queryVNPayTransaction = exports.getPaymentStatus = exports.handleVNPayIPN = exports.handleVNPayReturn = exports.handleMomoIPN = exports.createVNPayPayment = exports.createPayment = void 0;
const express_validator_1 = require("express-validator");
const momoService_1 = require("../services/momoService");
const vnpayService_1 = require("../services/vnpayService");
const Product_1 = __importDefault(require("../models/Product"));
const Payment_1 = __importDefault(require("../models/Payment"));
const moment_1 = __importDefault(require("moment"));
/**
 * Create a MoMo payment for a product
 * @route POST /api/payments/momo/create
 * @access Private
 */
const createPayment = async (req, res) => {
    try {
        // Check for validation errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { productId } = req.body;
        const buyerId = req.user.id;
        // Find product
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: 'Sản phẩm không tồn tại' });
            return;
        }
        // Check if product is available
        if (product.status !== 'available') {
            res.status(400).json({ message: 'Sản phẩm không khả dụng' });
            return;
        }
        // Check if user is trying to buy their own product
        if (product.seller.toString() === buyerId) {
            res.status(400).json({ message: 'Bạn không thể mua sản phẩm của chính mình' });
            return;
        }
        // Create MoMo payment request
        const paymentResponse = await (0, momoService_1.createMomoPayment)({
            productId: product._id.toString(),
            buyerId,
            sellerId: product.seller.toString(),
            amount: product.price,
            orderInfo: `Payment for ${product.title}`,
        });
        // Return payment URL
        res.status(200).json({
            success: true,
            payUrl: paymentResponse.payUrl,
            orderId: paymentResponse.orderId,
        });
    }
    catch (error) {
        console.error('Create payment error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi tạo thanh toán' });
    }
};
exports.createPayment = createPayment;
/**
 * Create a VNPay payment for a product
 * @route POST /api/payments/vnpay/create
 * @access Private
 */
const createVNPayPayment = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ errors: errors.array() });
            return;
        }
        const { productId, bankCode, locale } = req.body;
        const buyerId = req.user.id;
        const product = await Product_1.default.findById(productId);
        if (!product) {
            res.status(404).json({ message: 'Sản phẩm không tồn tại' });
            return;
        }
        if (product.status !== 'available') {
            res.status(400).json({ message: 'Sản phẩm không khả dụng' });
            return;
        }
        if (product.seller.toString() === buyerId) {
            res.status(400).json({ message: 'Bạn không thể mua sản phẩm của chính mình' });
            return;
        }
        const date = new Date();
        const orderId = `VNP${(0, moment_1.default)(date).format('YYMMDDHHmmss')}`;
        const ipAddr = req.headers['x-forwarded-for'] ||
            req.socket.remoteAddress ||
            '127.0.0.1';
        // Create payment in database
        const payment = new Payment_1.default({
            orderId,
            requestId: orderId,
            amount: product.price,
            productId: product._id,
            buyerId,
            sellerId: product.seller,
            paymentMethod: 'vnpay',
            paymentStatus: 'pending',
        });
        await payment.save();
        // Create VNPay payment URL
        const returnUrl = `${req.protocol}://${req.get('host')}/api/payments/vnpay/return`;
        const paymentUrl = vnpayService_1.vnpayService.createPaymentUrl({
            amount: product.price,
            orderId,
            orderInfo: `Payment for ${product.title}`,
            bankCode: bankCode || undefined,
            locale: locale || 'vn',
            ipAddr: typeof ipAddr === 'string' ? ipAddr : ipAddr[0],
            returnUrl,
        });
        // Update payment with payUrl
        payment.payUrl = paymentUrl;
        await payment.save();
        // Return payment URL
        res.status(200).json({
            success: true,
            payUrl: paymentUrl,
            orderId,
        });
    }
    catch (error) {
        console.error('Create VNPay payment error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi tạo thanh toán VNPay' });
    }
};
exports.createVNPayPayment = createVNPayPayment;
/**
 * Process MoMo IPN (Instant Payment Notification)
 * @route POST /api/payments/momo/ipn
 * @access Public
 */
const handleMomoIPN = async (req, res) => {
    try {
        const ipnData = req.body;
        // Process IPN data
        const result = await (0, momoService_1.processMomoIPN)(ipnData);
        // Return response to MoMo
        res.status(200).json(result);
    }
    catch (error) {
        console.error('MoMo IPN error:', error);
        res.status(500).json({
            message: error.message || 'Lỗi khi xử lý thanh toán',
            resultCode: 1
        });
    }
};
exports.handleMomoIPN = handleMomoIPN;
/**
 * Process VNPay Return URL
 * @route GET /api/payments/vnpay/return
 * @access Public
 */
const handleVNPayReturn = async (req, res) => {
    try {
        const vnpParams = req.query;
        const isValidSignature = vnpayService_1.vnpayService.verifyReturnUrl(vnpParams);
        if (!isValidSignature) {
            res.status(400).json({ message: 'Invalid signature' });
            return;
        }
        const orderId = vnpParams.vnp_TxnRef;
        const transactionId = vnpParams.vnp_TransactionNo;
        const responseCode = vnpParams.vnp_ResponseCode;
        const transactionStatus = vnpParams.vnp_TransactionStatus;
        const payment = await Payment_1.default.findOne({ orderId });
        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }
        if (responseCode === '00' && transactionStatus === '00') {
            payment.paymentStatus = 'completed';
            payment.transactionId = transactionId;
            await payment.save();
            res.redirect(`${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`);
        }
        else {
            payment.paymentStatus = 'failed';
            payment.errorCode = responseCode;
            payment.errorMessage = `Transaction failed with code ${responseCode}`;
            await payment.save();
            res.redirect(`${process.env.CLIENT_URL}/payment/failed?orderId=${orderId}&code=${responseCode}`);
        }
    }
    catch (error) {
        console.error('VNPay Return error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi xử lý kết quả thanh toán' });
    }
};
exports.handleVNPayReturn = handleVNPayReturn;
/**
 * Process VNPay IPN
 * @route POST /api/payments/vnpay/ipn
 * @access Public
 */
const handleVNPayIPN = async (req, res) => {
    try {
        const vnpParams = req.query;
        const isValidSignature = vnpayService_1.vnpayService.verifyReturnUrl(vnpParams);
        if (!isValidSignature) {
            res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
            return;
        }
        const orderId = vnpParams.vnp_TxnRef;
        const responseCode = vnpParams.vnp_ResponseCode;
        const payment = await Payment_1.default.findOne({ orderId });
        if (!payment) {
            res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            return;
        }
        const vnpAmount = parseInt(vnpParams.vnp_Amount, 10) / 100;
        if (vnpAmount !== payment.amount) {
            res.status(200).json({ RspCode: '04', Message: 'Amount invalid' });
            return;
        }
        if (payment.paymentStatus !== 'pending') {
            res.status(200).json({ RspCode: '02', Message: 'This order has been updated to the payment status' });
            return;
        }
        if (responseCode === '00') {
            payment.paymentStatus = 'completed';
            payment.transactionId = vnpParams.vnp_TransactionNo;
            await payment.save();
            res.status(200).json({ RspCode: '00', Message: 'Success' });
        }
        else {
            payment.paymentStatus = 'failed';
            payment.errorCode = responseCode;
            payment.errorMessage = `Transaction failed with code ${responseCode}`;
            await payment.save();
            res.status(200).json({ RspCode: '00', Message: 'Success' });
        }
    }
    catch (error) {
        console.error('VNPay IPN error:', error);
        res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
};
exports.handleVNPayIPN = handleVNPayIPN;
/**
 * Get payment status
 * @route GET /api/payments/:orderId/status
 * @access Private
 */
const getPaymentStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const payment = await (0, momoService_1.verifyPaymentStatus)(orderId);
        res.status(200).json({
            success: true,
            payment
        });
    }
    catch (error) {
        console.error('Get payment status error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi lấy trạng thái thanh toán' });
    }
};
exports.getPaymentStatus = getPaymentStatus;
/**
 * Query VNPay transaction status
 * @route POST /api/payments/vnpay/query
 * @access Private
 */
const queryVNPayTransaction = async (req, res) => {
    try {
        const { orderId, transactionDate } = req.body;
        if (!orderId || !transactionDate) {
            res.status(400).json({ message: 'Order ID and transaction date are required' });
            return;
        }
        const result = await vnpayService_1.vnpayService.queryTransaction(orderId, transactionDate);
        res.status(200).json({
            success: true,
            result
        });
    }
    catch (error) {
        console.error('Query VNPay transaction error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi truy vấn giao dịch' });
    }
};
exports.queryVNPayTransaction = queryVNPayTransaction;
/**
 * Request refund for VNPay transaction
 * @route POST /api/payments/vnpay/refund
 * @access Private (Admin only)
 */
const refundVNPayTransaction = async (req, res) => {
    try {
        const { orderId, transactionDate, amount, transactionType } = req.body;
        const user = req.user.name || req.user.email || req.user.id;
        if (!orderId || !transactionDate || !amount || !transactionType) {
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }
        const result = await vnpayService_1.vnpayService.refundTransaction({
            orderId,
            transactionDate,
            amount,
            transactionType,
            user
        });
        res.status(200).json({
            success: true,
            result
        });
    }
    catch (error) {
        console.error('Refund VNPay transaction error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi hoàn tiền giao dịch' });
    }
};
exports.refundVNPayTransaction = refundVNPayTransaction;
/**
 * Get user payment history
 * @route GET /api/payments/history
 * @access Private
 */
const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const payments = await Payment_1.default.find({
            $or: [
                { buyerId: userId },
                { sellerId: userId },
            ],
        })
            .populate('productId', 'title images price')
            .populate('buyerId', 'name avatar')
            .populate('sellerId', 'name avatar')
            .sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            payments,
        });
    }
    catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({ message: error.message || 'Lỗi khi lấy lịch sử thanh toán' });
    }
};
exports.getPaymentHistory = getPaymentHistory;
