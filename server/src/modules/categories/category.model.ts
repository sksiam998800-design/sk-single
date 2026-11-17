import mongoose, { Schema, type Document } from 'mongoose';

export interface ICategory extends Document {
  name: string;
  nameBn?: string;
  slug: string;
  parentId?: mongoose.Types.ObjectId | null;
  iconName?: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  description?: string;
  attributeSchemaType: 'general' | 'electronics' | 'beauty' | 'books' | 'home';
  sortOrder: number;
  isActive: boolean;
  showInHeader: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    nameBn: { type: String, trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    iconName: { type: String, default: 'Package' },
    imageUrl: { type: String },
    cloudinaryPublicId: { type: String },
    description: { type: String, maxlength: 500 },
    attributeSchemaType: {
      type: String,
      enum: ['general', 'electronics', 'beauty', 'books', 'home'],
      default: 'general',
    },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    showInHeader: { type: Boolean, default: true },
    seoTitle: { type: String, maxlength: 120 },
    seoDescription: { type: String, maxlength: 220 },
  },
  { timestamps: true },
);

export const CategoryModel = mongoose.models.Category || mongoose.model<ICategory>('Category', CategorySchema);

export interface IBrand extends Document {
  name: string;
  slug: string;
  logoUrl?: string;
  cloudinaryPublicId?: string;
  description?: string;
  websiteUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema<IBrand>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    logoUrl: { type: String },
    cloudinaryPublicId: { type: String },
    description: { type: String, maxlength: 500 },
    websiteUrl: { type: String, maxlength: 300 },
    seoTitle: { type: String, maxlength: 120 },
    seoDescription: { type: String, maxlength: 220 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const BrandModel = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

