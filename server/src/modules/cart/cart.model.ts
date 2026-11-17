import mongoose, { Schema, type Document } from 'mongoose';

export interface ICartItem {
  productId: mongoose.Types.ObjectId;
  variantId?: string | null;
  quantity: number;
  selected?: boolean;
}

export interface ICart extends Document {
  userId: mongoose.Types.ObjectId;
  items: ICartItem[];
  couponCode?: string | null;
  updatedAt: Date;
}

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: {
      type: [
        {
          productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
          variantId: { type: String, default: null },
          quantity: { type: Number, required: true, min: 1, max: 99 },
          selected: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    couponCode: { type: String, default: null },
  },
  { timestamps: true },
);

export const CartModel = mongoose.models.Cart || mongoose.model<ICart>('Cart', CartSchema);

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  productIds: mongoose.Types.ObjectId[];
  updatedAt: Date;
}

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  { timestamps: true },
);

export const WishlistModel = mongoose.models.Wishlist || mongoose.model<IWishlist>('Wishlist', WishlistSchema);
