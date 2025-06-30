import mongoose, { Document, Schema } from 'mongoose';

export interface IChat extends Document {
  _id: mongoose.Types.ObjectId;
  participants: mongoose.Types.ObjectId[];
  product?: mongoose.Types.ObjectId;
  lastMessage?: mongoose.Types.ObjectId;
  unreadCount: Map<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema = new Schema<IChat>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }],
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product'
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message'
    },
    unreadCount: {
      type: Map,
      of: Number,
      default: {}
    }
  },
  { timestamps: true }
);

export default mongoose.model<IChat>('Chat', ChatSchema); 