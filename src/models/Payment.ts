import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  orderId: string;
  requestId: string;
  amount: number;
  productId: Schema.Types.ObjectId;
  buyerId: Schema.Types.ObjectId;
  sellerId: Schema.Types.ObjectId;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  adminCommissionRate: number;
  adminCommission: number;
  sellerAmount: number;
  shippingAddress?: string;
  transactionId?: string;
  payUrl?: string;
  extraData?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
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
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    buyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sellerId: {
      type: Schema.Types.ObjectId,
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
      default: 0.05, // Default 5% commission
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
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate admin commission and seller amount
PaymentSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('adminCommissionRate')) {
    this.adminCommission = this.amount * this.adminCommissionRate;
    this.sellerAmount = this.amount - this.adminCommission;
  }
  next();
});

export default mongoose.model<IPayment>('Payment', PaymentSchema); 