"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyPaymentStatus = exports.processMomoIPN = exports.createMomoPayment = void 0;
const crypto_1 = __importDefault(require("crypto"));
const https_1 = __importDefault(require("https"));
const config_1 = __importDefault(require("../config/config"));
const Payment_1 = __importDefault(require("../models/Payment"));
const Product_1 = __importDefault(require("../models/Product"));
const moment_1 = __importDefault(require("moment"));
/**
 * Generate a signature for MoMo API
 * @param data - Data to sign
 * @returns - HMAC SHA256 signature
 */
const generateSignature = (data) => {
    return crypto_1.default
        .createHmac('sha256', config_1.default.MOMO_SECRET_KEY)
        .update(data)
        .digest('hex');
};
/**
 * Create a MoMo payment request
 * @param paymentData - Payment data
 * @returns - Payment response with payUrl
 */
const createMomoPayment = async (paymentData) => {
    const { productId, buyerId, sellerId, amount, orderInfo } = paymentData;
    // Check if amount is valid
    if (isNaN(amount) || amount <= 0) {
        throw new Error('Invalid payment amount');
    }
    // Generate request data
    const requestId = config_1.default.MOMO_PARTNER_CODE + new Date().getTime();
    const orderId = requestId;
    const redirectUrl = config_1.default.MOMO_REDIRECT_URL;
    const ipnUrl = config_1.default.MOMO_IPN_URL;
    const requestType = 'captureWallet';
    const extraData = Buffer.from(JSON.stringify({
        productId,
        buyerId,
        sellerId
    })).toString('base64');
    // Create raw signature
    const rawSignature = `accessKey=${config_1.default.MOMO_ACCESS_KEY}` +
        `&amount=${amount}` +
        `&extraData=${extraData}` +
        `&ipnUrl=${ipnUrl}` +
        `&orderId=${orderId}` +
        `&orderInfo=${orderInfo}` +
        `&partnerCode=${config_1.default.MOMO_PARTNER_CODE}` +
        `&redirectUrl=${redirectUrl}` +
        `&requestId=${requestId}` +
        `&requestType=${requestType}`;
    // Generate signature
    const signature = generateSignature(rawSignature);
    // Create request body
    const requestBody = JSON.stringify({
        partnerCode: config_1.default.MOMO_PARTNER_CODE,
        accessKey: config_1.default.MOMO_ACCESS_KEY,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        extraData: extraData,
        requestType: requestType,
        signature: signature,
        lang: 'vi'
    });
    // Save payment record
    const payment = new Payment_1.default({
        orderId,
        requestId,
        amount,
        productId,
        buyerId,
        sellerId,
        paymentMethod: 'momo',
        paymentStatus: 'pending',
        extraData,
    });
    await payment.save();
    try {
        // Send request to MoMo
        const response = await sendMomoRequest(requestBody);
        // Update payment record
        if (response.payUrl) {
            await Payment_1.default.findOneAndUpdate({ orderId }, {
                payUrl: response.payUrl,
                errorCode: response.errorCode,
                errorMessage: response.errorMessage
            });
        }
        return {
            orderId,
            requestId,
            amount,
            ...response
        };
    }
    catch (error) {
        // Update payment with error
        await Payment_1.default.findOneAndUpdate({ orderId }, {
            paymentStatus: 'failed',
            errorMessage: error.message
        });
        throw error;
    }
};
exports.createMomoPayment = createMomoPayment;
/**
 * Send request to MoMo API
 * @param requestBody - Request body in JSON format
 * @returns - Response from MoMo API
 */
const sendMomoRequest = (requestBody) => {
    const url = new URL(config_1.default.MOMO_ENDPOINT);
    const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody)
        }
    };
    return new Promise((resolve, reject) => {
        const req = https_1.default.request(options, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const jsonResponse = JSON.parse(data);
                    resolve(jsonResponse);
                }
                catch (error) {
                    reject(new Error('Invalid response from MoMo'));
                }
            });
        });
        req.on('error', (error) => {
            reject(error);
        });
        req.write(requestBody);
        req.end();
    });
};
/**
 * Process IPN (Instant Payment Notification) from MoMo
 * @param ipnData - IPN data from MoMo
 * @returns - Response to MoMo
 */
const processMomoIPN = async (ipnData) => {
    const { orderId, requestId, extraData, amount, orderInfo, orderType, transId, resultCode, message, payType, responseTime, signature } = ipnData;
    // Verify signature
    const rawSignature = `accessKey=${config_1.default.MOMO_ACCESS_KEY}` +
        `&amount=${amount}` +
        `&extraData=${extraData}` +
        `&message=${message}` +
        `&orderId=${orderId}` +
        `&orderInfo=${orderInfo}` +
        `&orderType=${orderType}` +
        `&partnerCode=${config_1.default.MOMO_PARTNER_CODE}` +
        `&payType=${payType}` +
        `&requestId=${requestId}` +
        `&responseTime=${responseTime}` +
        `&resultCode=${resultCode}` +
        `&transId=${transId}`;
    const expectedSignature = generateSignature(rawSignature);
    if (signature !== expectedSignature) {
        return {
            message: 'Invalid signature',
            resultCode: 1,
        };
    }
    // Find payment record
    const payment = await Payment_1.default.findOne({ orderId });
    if (!payment) {
        return {
            message: 'Order not found',
            resultCode: 1,
        };
    }
    // Process payment status
    if (resultCode === '0') {
        // Payment successful
        payment.paymentStatus = 'completed';
        payment.transactionId = transId;
        // Set 7-day deadline for receipt confirmation
        payment.receivedSuccessfullyDeadline = (0, moment_1.default)().add(7, 'days').toDate();
        await payment.save();
        // Update product status to sold
        await Product_1.default.findByIdAndUpdate(payment.productId, {
            status: 'sold',
            buyer: payment.buyerId
        });
        return {
            message: 'Payment processed successfully',
            resultCode: 0,
        };
    }
    else {
        // Payment failed
        payment.paymentStatus = 'failed';
        payment.errorCode = resultCode;
        payment.errorMessage = message;
        await payment.save();
        return {
            message: 'Payment processing failed',
            resultCode: 1,
        };
    }
};
exports.processMomoIPN = processMomoIPN;
/**
 * Verify payment status by orderId
 * @param orderId - Order ID
 * @returns - Payment details
 */
const verifyPaymentStatus = async (orderId) => {
    const payment = await Payment_1.default.findOne({ orderId }).populate('productId');
    if (!payment) {
        throw new Error('Payment not found');
    }
    return payment;
};
exports.verifyPaymentStatus = verifyPaymentStatus;
