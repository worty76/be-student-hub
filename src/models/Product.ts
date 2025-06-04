import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  condition: 'new' | 'like new' | 'good' | 'fair' | 'poor';
  status: 'available' | 'pending' | 'sold';
  seller: mongoose.Types.ObjectId;
  location?: string;
  views: number;
  favorites: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    images: [{
      type: String
    }],
    category: {
      type: String,
      required: true,
      enum: ['books', 'electronics', 'furniture', 'clothing', 'vehicles', 'services', 'other']
    },
    condition: {
      type: String,
      required: true,
      enum: ['new', 'like new', 'good', 'fair', 'poor']
    },
    status: {
      type: String,
      enum: ['available', 'pending', 'sold'],
      default: 'available'
    },
    seller: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    location: {
      type: String
    },
    views: {
      type: Number,
      default: 0
    },
    favorites: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Add text index for search functionality
ProductSchema.index({ title: 'text', description: 'text' });

export default mongoose.model<IProduct>('Product', ProductSchema); 