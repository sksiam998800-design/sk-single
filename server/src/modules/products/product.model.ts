import mongoose, { Schema, type Document } from 'mongoose';

export interface IProductImage {
  url: string;
  publicId?: string;
  alt: string;
  sortOrder: number;
}

export interface IProductVariant {
  _id: mongoose.Types.ObjectId;
  sku: string;
  barcode?: string;
  title: string;
  options: Record<string, string>;
  price?: number | null;
  salePrice?: number | null;
  stockOnHand: number;
  reservedStock: number;
  lowStockThreshold: number;
  weight?: number | null;
  imageUrl?: string;
  images?: string[];
  isActive: boolean;
}

export interface IProductAttributeValue {
  attributeId?: mongoose.Types.ObjectId | null;
  code: string;
  name: string;
  groupName?: string;
  inputType: string;
  value: Schema.Types.Mixed;
  unit?: string;
  colorHex?: string;
  sortOrder: number;
  isVisibleToCustomers: boolean;
  showOnProductDetails: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isComparable: boolean;
}

export interface IProductHighlight {
  icon: string;
  title: string;
  subtitle?: string;
  sortOrder: number;
}

export interface IProductVideo {
  title: string;
  url: string;
  thumbnailUrl?: string;
  sortOrder: number;
}

export interface IProductContentSection {
  sectionId: string;
  title: string;
  sectionType: string;
  body?: string;
  mediaUrl?: string;
  fields: Array<{ label: string; value: string; unit?: string }>;
  sortOrder: number;
  isEnabled: boolean;
  showToCustomer: boolean;
}

export interface IProductQuestion {
  _id: mongoose.Types.ObjectId;
  userId?: mongoose.Types.ObjectId | null;
  userName: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: Date | null;
  isPublished: boolean;
  createdAt: Date;
}

export interface IProduct extends Document {
  name: string;
  nameBn?: string;
  slug: string;
  sku: string;
  barcode?: string;
  brandId?: mongoose.Types.ObjectId | null;
  brandName?: string;
  categoryId: mongoose.Types.ObjectId;
  subCategoryId?: mongoose.Types.ObjectId | null;
  categoryPath: string[];
  description: string;
  shortDescription?: string;
  features: string[];
  attributeGroup: string;
  attributes: Record<string, string>;
  attributeValues: IProductAttributeValue[];
  specifications: Array<{ label: string; value: string; unit?: string; groupName?: string; sortOrder?: number }>;
  highlights: IProductHighlight[];
  videos: IProductVideo[];
  contentSections: IProductContentSection[];
  questions: IProductQuestion[];
  bilingualKeywords: string[];
  basePrice: number;
  costPrice?: number | null;
  salePrice?: number | null;
  flashSalePrice?: number | null;
  flashSaleStartsAt?: Date | null;
  flashSaleEndsAt?: Date | null;
  stockOnHand: number;
  reservedStock: number;
  lowStockThreshold: number;
  manageInventory: boolean;
  allowBackorder: boolean;
  weight?: number | null;
  dimensions?: {
    length?: number | null;
    width?: number | null;
    height?: number | null;
  };
  tags: string[];
  hasVariants: boolean;
  variantOptions: Array<{ name: string; values: string[]; colors?: Record<string, string> }>;
  variants: IProductVariant[];
  images: IProductImage[];
  warrantyInfo?: string;
  returnPolicyNote?: string;
  faqs: Array<{ question: string; answer: string }>;
  status: 'draft' | 'published' | 'archived';
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isPremiumCollection: boolean;
  soldCount: number;
  ratingAverage: number;
  reviewCount: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductVariantSchema = new Schema<IProductVariant>(
  {
    sku: { type: String, required: true, trim: true, uppercase: true },
    barcode: { type: String, trim: true, default: '' },
    title: { type: String, required: true, trim: true },
    options: { type: Map, of: String, default: {} },
    price: { type: Number, min: 0, default: null },
    salePrice: { type: Number, min: 0, default: null },
    stockOnHand: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    weight: { type: Number, min: 0, default: null },
    imageUrl: { type: String },
    images: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, maxlength: 180 },
    nameBn: { type: String, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    barcode: { type: String, trim: true },
    brandId: { type: Schema.Types.ObjectId, ref: 'Brand', default: null, index: true },
    brandName: { type: String, trim: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    subCategoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null, index: true },
    categoryPath: { type: [String], default: [] },
    description: { type: String, required: true },
    shortDescription: { type: String, maxlength: 400 },
    features: { type: [String], default: [] },
    attributeGroup: {
      type: String,
      default: 'general',
      trim: true,
    },
    attributes: { type: Map, of: String, default: {} },
    attributeValues: {
      type: [
        {
          attributeId: { type: Schema.Types.ObjectId, ref: 'ProductAttributePreset', default: null },
          code: { type: String, required: true, lowercase: true, trim: true },
          name: { type: String, required: true, trim: true },
          groupName: { type: String, default: 'General Specifications', trim: true },
          inputType: { type: String, default: 'short_text' },
          value: { type: Schema.Types.Mixed, default: '' },
          unit: { type: String, default: '' },
          colorHex: { type: String, default: '' },
          sortOrder: { type: Number, default: 0 },
          isVisibleToCustomers: { type: Boolean, default: true },
          showOnProductDetails: { type: Boolean, default: true },
          isFilterable: { type: Boolean, default: false },
          isSearchable: { type: Boolean, default: false },
          isComparable: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    specifications: {
      type: [
        {
          label: { type: String, required: true },
          value: { type: String, required: true },
          unit: { type: String, default: '' },
          groupName: { type: String, default: 'Technical Specifications' },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    highlights: {
      type: [
        {
          icon: { type: String, default: 'Cpu' },
          title: { type: String, required: true, trim: true, maxlength: 80 },
          subtitle: { type: String, default: '', trim: true, maxlength: 80 },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    videos: {
      type: [
        {
          title: { type: String, default: '' },
          url: { type: String, required: true },
          thumbnailUrl: { type: String, default: '' },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    contentSections: {
      type: [
        {
          sectionId: { type: String, required: true },
          title: { type: String, required: true, trim: true, maxlength: 120 },
          sectionType: { type: String, default: 'custom' },
          body: { type: String, default: '' },
          mediaUrl: { type: String, default: '' },
          fields: {
            type: [
              {
                label: { type: String, required: true },
                value: { type: String, required: true },
                unit: { type: String, default: '' },
              },
            ],
            default: [],
          },
          sortOrder: { type: Number, default: 0 },
          isEnabled: { type: Boolean, default: true },
          showToCustomer: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    questions: {
      type: [
        {
          userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
          userName: { type: String, required: true, trim: true },
          question: { type: String, required: true, trim: true, maxlength: 500 },
          answer: { type: String, default: '', trim: true, maxlength: 2000 },
          answeredBy: { type: String, default: '' },
          answeredAt: { type: Date, default: null },
          isPublished: { type: Boolean, default: false },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    bilingualKeywords: { type: [String], default: [], index: true },
    basePrice: { type: Number, required: true, min: 0 },
    costPrice: { type: Number, min: 0, default: null },
    salePrice: { type: Number, min: 0, default: null },
    flashSalePrice: { type: Number, min: 0, default: null },
    flashSaleStartsAt: { type: Date, default: null },
    flashSaleEndsAt: { type: Date, default: null },
    stockOnHand: { type: Number, required: true, min: 0, default: 0 },
    reservedStock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    manageInventory: { type: Boolean, default: true },
    allowBackorder: { type: Boolean, default: false },
    weight: { type: Number, min: 0, default: null },
    dimensions: {
      length: { type: Number, min: 0, default: null },
      width: { type: Number, min: 0, default: null },
      height: { type: Number, min: 0, default: null },
    },
    tags: { type: [String], default: [] },
    hasVariants: { type: Boolean, default: false },
    variantOptions: {
      type: [
        {
          name: { type: String, required: true },
          values: { type: [String], default: [] },
          colors: { type: Map, of: String, default: {} },
        },
      ],
      default: [],
    },
    variants: { type: [ProductVariantSchema], default: [] },
    images: {
      type: [
        {
          url: { type: String, required: true },
          publicId: { type: String },
          alt: { type: String, default: '' },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    warrantyInfo: { type: String, maxlength: 300 },
    returnPolicyNote: { type: String, maxlength: 300 },
    faqs: {
      type: [{ question: { type: String, required: true }, answer: { type: String, required: true } }],
      default: [],
    },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },
    isBestSeller: { type: Boolean, default: false, index: true },
    isPremiumCollection: { type: Boolean, default: false, index: true },
    soldCount: { type: Number, default: 0, index: true },
    ratingAverage: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    seoTitle: { type: String, maxlength: 140 },
    seoDescription: { type: String, maxlength: 240 },
    seoKeywords: { type: [String], default: [] },
  },
  { timestamps: true },
);

ProductSchema.index({
  name: 'text',
  nameBn: 'text',
  description: 'text',
  brandName: 'text',
  bilingualKeywords: 'text',
  tags: 'text',
  sku: 'text',
});
ProductSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });
ProductSchema.index({ 'attributeValues.code': 1, 'attributeValues.value': 1 });

export const ProductModel = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
