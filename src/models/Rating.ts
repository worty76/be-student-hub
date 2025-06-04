import mongoose, { Document, Schema } from 'mongoose';

export interface IRating extends Document {
  _id: mongoose.Types.ObjectId;
  rater: mongoose.Types.ObjectId;
  rated: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RatingSchema = new Schema<IRating>(
  {
    rater: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rated: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String
    }
  },
  { timestamps: true }
);

// Ensure a user can only rate another user once
RatingSchema.index({ rater: 1, rated: 1 }, { unique: true });

export default mongoose.model<IRating>('Rating', RatingSchema); 