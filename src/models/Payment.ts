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

export default mongoose.model<IPayment>('Payment', PaymentSchema); 