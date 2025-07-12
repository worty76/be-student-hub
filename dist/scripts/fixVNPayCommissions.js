"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Payment_1 = __importDefault(require("../models/Payment"));
const config_1 = __importDefault(require("../config/config"));
async function fixVNPayCommissions() {
    try {
        // Connect to database
        await mongoose_1.default.connect(config_1.default.MONGO_URI);
        console.log('Connected to database');
        // Find all completed VNPay payments
        const vnpayPayments = await Payment_1.default.find({
            paymentMethod: 'vnpay',
            paymentStatus: 'completed'
        });
        console.log(`Found ${vnpayPayments.length} completed VNPay payments`);
        let updatedCount = 0;
        for (const payment of vnpayPayments) {
            const oldCommission = payment.adminCommission;
            const oldSellerAmount = payment.sellerAmount;
            // Check if commission is already correct
            const expectedCommission = payment.amount * payment.adminCommissionRate;
            if (Math.abs(payment.adminCommission - expectedCommission) > 0.01) {
                // Force recalculation by marking adminCommissionRate as modified
                payment.markModified('adminCommissionRate');
                await payment.save();
                updatedCount++;
                console.log(`Updated payment ${payment.orderId}:`);
                console.log(`  Amount: ${payment.amount}`);
                console.log(`  Rate: ${payment.adminCommissionRate * 100}%`);
                console.log(`  Commission: ${oldCommission} → ${payment.adminCommission}`);
                console.log(`  Seller Amount: ${oldSellerAmount} → ${payment.sellerAmount}`);
                console.log('');
            }
        }
        console.log(`✅ Successfully updated ${updatedCount} VNPay payments`);
        console.log('All VNPay payments now have correct commission calculations');
    }
    catch (error) {
        console.error('Error fixing VNPay commissions:', error);
    }
    finally {
        await mongoose_1.default.disconnect();
        console.log('Disconnected from database');
    }
}
// Run the script
fixVNPayCommissions();
