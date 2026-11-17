import mongoose, { Schema, type Document } from 'mongoose';

export interface INavigationItemSubdoc {
  _id?: mongoose.Types.ObjectId;
  label: string;
  slug: string;
  url: string;
  icon?: string;
  description?: string;
  target: '_self' | '_blank';
  badgeText?: string;
  isActive: boolean;
  displayOrder: number;
  visibilitySettings: {
    showIcon: boolean;
    showDescription: boolean;
    desktopVisible: boolean;
    mobileVisible: boolean;
  };
}

export interface INavigationGroupSubdoc {
  _id?: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  url?: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  items: INavigationItemSubdoc[];
}

export interface INavigationPromotionSubdoc {
  _id?: mongoose.Types.ObjectId;
  title: string;
  subtitle?: string;
  badgeText?: string;
  imageUrl?: string;
  cloudinaryPublicId?: string;
  altText?: string;
  ctaText?: string;
  ctaUrl?: string;
  theme: 'royal-blue' | 'ice-blue' | 'midnight-navy';
  isActive: boolean;
  displayOrder: number;
}

export interface INavigationSlideSubdoc {
  _id?: mongoose.Types.ObjectId;
  imageUrl: string;
  cloudinaryPublicId?: string;
  altText: string;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  target: '_self' | '_blank';
  focalPoint: 'center' | 'top' | 'bottom' | 'left' | 'right';
  objectFit: 'cover' | 'contain';
  isActive: boolean;
  displayOrder: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface INavigationMenu extends Document {
  name: string;
  slug: string;
  label: string;
  type: 'link' | 'dropdown' | 'mega_menu';
  url: string;
  openInNewTab: boolean;
  icon?: string;
  badgeText?: string;
  isActive: boolean;
  isPublished: boolean;
  displayOrder: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  groups: INavigationGroupSubdoc[];
  promotions: INavigationPromotionSubdoc[];
  slides: INavigationSlideSubdoc[];
  settings: {
    desktopVisible: boolean;
    mobileVisible: boolean;
    alignment: 'left' | 'center' | 'right' | 'full_width';
    menuWidth: 'auto' | 'md' | 'lg' | 'xl' | 'full';
    maxHeightPx: number;
    columns: number;
    showIcons: boolean;
    showDescriptions: boolean;
    showPromotions: boolean;
    showSlider: boolean;
    sliderSettings: {
      autoplay: boolean;
      intervalMs: number;
      pauseOnHover: boolean;
      showIndicators: boolean;
      showArrows: boolean;
      transitionDurationMs: number;
      aspectRatio: '16/10' | '4/3' | '16/9' | 'square';
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const NavigationItemSchema = new Schema<INavigationItemSubdoc>(
  {
    label: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    url: { type: String, required: true, trim: true, maxlength: 400 },
    icon: { type: String, default: '', trim: true, maxlength: 50 },
    description: { type: String, default: '', trim: true, maxlength: 160 },
    target: { type: String, enum: ['_self', '_blank'], default: '_self' },
    badgeText: { type: String, default: '', trim: true, maxlength: 24 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    visibilitySettings: {
      showIcon: { type: Boolean, default: true },
      showDescription: { type: Boolean, default: true },
      desktopVisible: { type: Boolean, default: true },
      mobileVisible: { type: Boolean, default: true },
    },
  },
  { _id: true },
);

const NavigationGroupSchema = new Schema<INavigationGroupSubdoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, trim: true, lowercase: true, maxlength: 100 },
    url: { type: String, default: '', trim: true, maxlength: 400 },
    icon: { type: String, default: '', trim: true, maxlength: 50 },
    description: { type: String, default: '', trim: true, maxlength: 160 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    items: { type: [NavigationItemSchema], default: [] },
  },
  { _id: true },
);

const NavigationPromotionSchema = new Schema<INavigationPromotionSubdoc>(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    subtitle: { type: String, default: '', trim: true, maxlength: 180 },
    badgeText: { type: String, default: '', trim: true, maxlength: 30 },
    imageUrl: { type: String, default: '', trim: true, maxlength: 500 },
    cloudinaryPublicId: { type: String, default: '', trim: true, maxlength: 240 },
    altText: { type: String, default: '', trim: true, maxlength: 140 },
    ctaText: { type: String, default: '', trim: true, maxlength: 40 },
    ctaUrl: { type: String, default: '/shop', trim: true, maxlength: 400 },
    theme: { type: String, enum: ['royal-blue', 'ice-blue', 'midnight-navy'], default: 'royal-blue' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: true },
);

const NavigationSlideSchema = new Schema<INavigationSlideSubdoc>(
  {
    imageUrl: { type: String, required: true, trim: true, maxlength: 500 },
    cloudinaryPublicId: { type: String, default: '', trim: true, maxlength: 240 },
    altText: { type: String, required: true, trim: true, maxlength: 160 },
    title: { type: String, default: '', trim: true, maxlength: 120 },
    subtitle: { type: String, default: '', trim: true, maxlength: 120 },
    description: { type: String, default: '', trim: true, maxlength: 240 },
    buttonText: { type: String, default: '', trim: true, maxlength: 40 },
    buttonUrl: { type: String, default: '', trim: true, maxlength: 400 },
    target: { type: String, enum: ['_self', '_blank'], default: '_self' },
    focalPoint: { type: String, enum: ['center', 'top', 'bottom', 'left', 'right'], default: 'center' },
    objectFit: { type: String, enum: ['cover', 'contain'], default: 'cover' },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
  },
  { _id: true, timestamps: true },
);

const NavigationMenuSchema = new Schema<INavigationMenu>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ['link', 'dropdown', 'mega_menu'], default: 'mega_menu' },
    url: { type: String, required: true, trim: true, maxlength: 400 },
    openInNewTab: { type: Boolean, default: false },
    icon: { type: String, default: '', trim: true, maxlength: 50 },
    badgeText: { type: String, default: '', trim: true, maxlength: 24 },
    isActive: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    groups: { type: [NavigationGroupSchema], default: [] },
    promotions: { type: [NavigationPromotionSchema], default: [] },
    slides: { type: [NavigationSlideSchema], default: [] },
    settings: {
      desktopVisible: { type: Boolean, default: true },
      mobileVisible: { type: Boolean, default: true },
      alignment: { type: String, enum: ['left', 'center', 'right', 'full_width'], default: 'left' },
      menuWidth: { type: String, enum: ['auto', 'md', 'lg', 'xl', 'full'], default: 'xl' },
      maxHeightPx: { type: Number, default: 540, min: 240, max: 760 },
      columns: { type: Number, default: 0, min: 0, max: 5 },
      showIcons: { type: Boolean, default: true },
      showDescriptions: { type: Boolean, default: true },
      showPromotions: { type: Boolean, default: true },
      showSlider: { type: Boolean, default: true },
      sliderSettings: {
        autoplay: { type: Boolean, default: true },
        intervalMs: { type: Number, default: 4500, min: 1500, max: 20000 },
        pauseOnHover: { type: Boolean, default: true },
        showIndicators: { type: Boolean, default: true },
        showArrows: { type: Boolean, default: true },
        transitionDurationMs: { type: Number, default: 420, min: 150, max: 1000 },
        aspectRatio: { type: String, enum: ['16/10', '4/3', '16/9', 'square'], default: '4/3' },
      },
    },
  },
  { timestamps: true },
);

export const NavigationMenuModel =
  mongoose.models.NavigationMenu || mongoose.model<INavigationMenu>('NavigationMenu', NavigationMenuSchema);
