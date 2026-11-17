import mongoose, { Schema, type Document } from 'mongoose';

export interface IInventoryMovement extends Document {
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId | null;
  sku: string;
  productName: string;
  type: 'reserve' | 'release' | 'sale' | 'restock' | 'adjustment' | 'return';
  delta: number;
  previousStockOnHand: number;
  newStockOnHand: number;
  previousReserved: number;
  newReserved: number;
  reason: string;
  referenceId?: string;
  actorId?: mongoose.Types.ObjectId | null;
  actorName?: string;
  createdAt: Date;
}

const InventoryMovementSchema = new Schema<IInventoryMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, default: null },
    sku: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    type: {
      type: String,
      enum: ['reserve', 'release', 'sale', 'restock', 'adjustment', 'return'],
      required: true,
      index: true,
    },
    delta: { type: Number, required: true },
    previousStockOnHand: { type: Number, required: true },
    newStockOnHand: { type: Number, required: true },
    previousReserved: { type: Number, required: true },
    newReserved: { type: Number, required: true },
    reason: { type: String, required: true, maxlength: 300 },
    referenceId: { type: String },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorName: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const InventoryMovementModel =
  mongoose.models.InventoryMovement || mongoose.model<IInventoryMovement>('InventoryMovement', InventoryMovementSchema);
