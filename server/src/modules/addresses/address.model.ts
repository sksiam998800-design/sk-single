import mongoose, { Schema, type Document } from 'mongoose';

export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId;
  label: string;
  recipientName: string;
  phone: string;
  division: string;
  district: string;
  upazila: string;
  area: string;
  house: string;
  road?: string;
  landmark?: string;
  postalCode?: string;
  deliveryInstructions?: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    label: { type: String, default: 'Home', trim: true, maxlength: 40 },
    recipientName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 24 },
    division: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    upazila: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    house: { type: String, required: true, trim: true, maxlength: 140 },
    road: { type: String, trim: true, maxlength: 140 },
    landmark: { type: String, trim: true, maxlength: 140 },
    postalCode: { type: String, trim: true, maxlength: 12 },
    deliveryInstructions: { type: String, trim: true, maxlength: 240 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const AddressModel = mongoose.models.Address || mongoose.model<IAddress>('Address', AddressSchema);
