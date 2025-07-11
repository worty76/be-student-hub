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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const PaymentSchema = new mongoose_1.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
    },
    requestId: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    productId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    buyerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    sellerId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    paymentMethod: {
        type: String,
        required: true,
        default: 'momo',
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
    },
    adminCommissionRate: {
        type: Number,
        required: true,
        default: 0.1,
        min: 0,
        max: 1,
    },
    adminCommission: {
        type: Number,
        required: true,
        default: 0,
    },
    sellerAmount: {
        type: Number,
        required: true,
        default: 0,
    },
    shippingAddress: {
        type: String,
    },
    transactionId: {
        type: String,
    },
    payUrl: {
        type: String,
    },
    extraData: {
        type: String,
    },
    errorCode: {
        type: String,
    },
    errorMessage: {
        type: String,
    },
    receivedSuccessfully: {
        type: Boolean,
        default: false,
    },
    receivedSuccessfullyDeadline: {
        type: Date,
    },
    receivedConfirmedAt: {
        type: Date,
    },
}, {
    timestamps: true,
});
// Pre-save hook to calculate admin commission and seller amount
PaymentSchema.pre('save', function (next) {
    if (this.isModified('amount') || this.isModified('adminCommissionRate')) {
        this.adminCommission = this.amount * this.adminCommissionRate;
        this.sellerAmount = this.amount - this.adminCommission;
    }
    next();
});
exports.default = mongoose_1.default.model('Payment', PaymentSchema);
