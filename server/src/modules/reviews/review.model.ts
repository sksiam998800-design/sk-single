import mongoose, { Schema, type Document } from 'mongoose';

export interface IReview extends Document {
  productId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userName: string;
  orderId?: mongoose.Types.ObjectId | null;
  rating: number;
  title: string;
  comment: string;
  images: Array<{ url: string; publicId?: string }>;
  isVerifiedPurchase: boolean;
  isFeatured: boolean;
  status: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  moderatedBy?: mongoose.Types.ObjectId | null;
  moderatedAt?: Date;
  reportedBy: mongoose.Types.ObjectId[];
  helpfulUserIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userName: { type: String, required: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    comment: { type: String, required: true, trim: true, maxlength: 1500 },
    images: {
      type: [{ url: { type: String, required: true }, publicId: { type: String } }],
      default: [],
    },
    isVerifiedPurchase: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    moderationReason: { type: String },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    moderatedAt: { type: Date },
    reportedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    helpfulUserIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

export const ReviewModel = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export interface IReturnRequest extends Document {
  orderId: mongoose.Types.ObjectId;
  orderNumber: string;
  userId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  items: Array<{ productId: mongoose.Types.ObjectId; sku: string; name: string; quantity: number }>;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';
  inspectionNotes?: string;
  restocked: boolean;
  refundAmount: number;
  handledBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnRequestSchema = new Schema<IReturnRequest>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    orderNumber: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, required: true, maxlength: 200 },
    details: { type: String, maxlength: 1000 },
    items: {
      type: [
        {
          productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
          sku: { type: String, required: true },
          name: { type: String, required: true },
          quantity: { type: Number, required: true, min: 1 },
        },
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'received', 'refunded'],
      default: 'requested',
      index: true,
    },
    inspectionNotes: { type: String },
    restocked: { type: Boolean, default: false },
    refundAmount: { type: Number, default: 0 },
    handledBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const ReturnRequestModel =
  mongoose.models.ReturnRequest || mongoose.model<IReturnRequest>('ReturnRequest', ReturnRequestSchema);
