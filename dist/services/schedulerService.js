"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_cron_1 = __importDefault(require("node-cron"));
const moment_1 = __importDefault(require("moment"));
const Payment_1 = __importDefault(require("../models/Payment"));
class SchedulerService {
    constructor() { }
    static getInstance() {
        if (!SchedulerService.instance) {
            SchedulerService.instance = new SchedulerService();
        }
        return SchedulerService.instance;
    }
    /**
     * Initialize all scheduled tasks
     */
    init() {
        console.log('Initializing scheduler service...');
        this.startAutoConfirmReceiptTask();
    }
    /**
     * Auto-confirm receipt for payments that have passed their deadline
     * Runs every hour
     */
    startAutoConfirmReceiptTask() {
        node_cron_1.default.schedule('0 * * * *', async () => {
            try {
                console.log('Running auto-confirm receipt task...');
                await this.autoConfirmExpiredReceipts();
            }
            catch (error) {
                console.error('Error in auto-confirm receipt task:', error);
            }
        });
        console.log('Auto-confirm receipt task scheduled (runs every hour)');
    }
    /**
     * Auto-confirm receipts for payments that have passed their deadline
     */
    async autoConfirmExpiredReceipts() {
        try {
            const now = new Date();
            // Find payments that:
            // 1. Are completed
            // 2. Have not been confirmed as received
            // 3. Have a deadline that has passed
            const expiredPayments = await Payment_1.default.find({
                paymentStatus: 'completed',
                receivedSuccessfully: false,
                receivedSuccessfullyDeadline: { $lte: now }
            }).populate('productId').populate('buyerId', 'name email');
            if (expiredPayments.length === 0) {
                console.log('No expired payments to auto-confirm');
                return;
            }
            console.log(`Found ${expiredPayments.length} payments to auto-confirm`);
            // Update all expired payments
            const updateResult = await Payment_1.default.updateMany({
                paymentStatus: 'completed',
                receivedSuccessfully: false,
                receivedSuccessfullyDeadline: { $lte: now }
            }, {
                $set: {
                    receivedSuccessfully: true,
                    receivedConfirmedAt: now
                }
            });
            console.log(`Auto-confirmed ${updateResult.modifiedCount} receipts`);
            // Log each auto-confirmed payment for audit purposes
            for (const payment of expiredPayments) {
                console.log(`Auto-confirmed receipt for order ${payment.orderId} (buyer: ${payment.buyerId?.name})`);
            }
        }
        catch (error) {
            console.error('Error in autoConfirmExpiredReceipts:', error);
            throw error;
        }
    }
    /**
     * Manually confirm receipt for a specific payment
     */
    async confirmReceipt(orderId, buyerId) {
        try {
            const payment = await Payment_1.default.findOne({ orderId, buyerId });
            if (!payment) {
                return {
                    success: false,
                    message: 'Payment not found'
                };
            }
            if (payment.paymentStatus !== 'completed') {
                return {
                    success: false,
                    message: 'Payment is not completed yet'
                };
            }
            if (payment.receivedSuccessfully) {
                return {
                    success: false,
                    message: 'Receipt has already been confirmed'
                };
            }
            // Update payment
            payment.receivedSuccessfully = true;
            payment.receivedConfirmedAt = new Date();
            await payment.save();
            console.log(`Receipt manually confirmed for order ${orderId} by buyer ${buyerId}`);
            return {
                success: true,
                message: 'Receipt confirmed successfully',
                payment: payment
            };
        }
        catch (error) {
            console.error('Error in confirmReceipt:', error);
            return {
                success: false,
                message: 'An error occurred while confirming receipt'
            };
        }
    }
    /**
     * Set receipt deadline for a payment (7 days from completion)
     */
    async setReceiptDeadline(paymentId) {
        try {
            const deadline = (0, moment_1.default)().add(7, 'days').toDate();
            await Payment_1.default.findByIdAndUpdate(paymentId, {
                receivedSuccessfullyDeadline: deadline
            });
            console.log(`Set receipt deadline for payment ${paymentId}: ${deadline}`);
        }
        catch (error) {
            console.error('Error setting receipt deadline:', error);
            throw error;
        }
    }
}
exports.default = SchedulerService;
