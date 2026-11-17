import mongoose, { Schema, type Document } from 'mongoose';

export type BannerPlacement =
  | 'hero_bento'
  | 'homepage_hero'
  | 'above_hero'
  | 'below_hero'
  | 'above_categories'
  | 'below_categories'
  | 'above_featured'
  | 'below_featured'
  | 'above_bestsellers'
  | 'below_bestsellers'
  | 'between_sections'
  | 'homepage_mid'
  | 'homepage_bottom'
  | 'category_top'
  | 'promo_strip'
  | 'promotional_section'
  | 'wishlist_bottom'
  | 'custom';

export type BannerBackgroundType = 'solid' | 'gradient' | 'image' | 'gradient_image' | 'image_overlay';
export type BannerWidthMode = 'full' | 'half' | 'one_third' | 'two_thirds' | 'custom';
export type BannerStatus = 'draft' | 'published' | 'scheduled' | 'inactive';

export interface IBanner extends Document {
  name?: string;
  slug?: string;
  title: string;
  highlightedTitle?: string;
  eyebrow?: string;
  promoLabel?: string;
  subtitle?: string;
  description?: string;
  caption?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  cloudinaryPublicId?: string;
  backgroundType: BannerBackgroundType;
  backgroundColor: string;
  backgroundOpacity: number;
  gradientConfig: {
    type: 'linear' | 'radial';
    angle: number;
    stops: Array<{ color: string; position: number }>;
    opacity: number;
  };
  imageSettings: {
    objectFit: 'cover' | 'contain' | 'fill' | 'auto';
    position: string;
    focalPoint: { x: number; y: number };
    repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
    opacity: number;
  };
  overlaySettings: {
    type: 'none' | 'solid' | 'gradient';
    color: string;
    secondaryColor: string;
    direction: string;
    opacity: number;
  };
  contentSettings: {
    horizontalAlign: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    tabletHorizontalAlign: 'left' | 'center' | 'right';
    mobileHorizontalAlign: 'left' | 'center' | 'right';
    contentWidth: string;
    maxWidthPx: number;
    paddingX: number;
    paddingY: number;
    elementSpacing: number;
    heightMode?: 'auto' | 'small' | 'medium' | 'large' | 'custom';
    minHeightPx: number;
    tabletMinHeightPx?: number;
    mobileMinHeightPx: number;
  };
  typographySettings: {
    titleFontFamily: string;
    subtitleFontFamily: string;
    titleFontSize: number;
    subtitleFontSize: number;
    descriptionFontSize: number;
    titleFontWeight: number;
    subtitleFontWeight: number;
    lineHeight: number;
    letterSpacing: number;
    textAlign: 'left' | 'center' | 'right';
    textTransform: 'none' | 'uppercase' | 'capitalize';
    titleColor: string;
    highlightColor: string;
    subtitleColor: string;
    descriptionColor: string;
    textShadow: string;
  };
  ctaText: string;
  destinationUrl: string;
  secondaryCtaText?: string;
  secondaryDestinationUrl?: string;
  buttonSettings: {
    primary: Record<string, unknown>;
    secondary: Record<string, unknown>;
  };
  styleSettings: {
    presetKey: string;
    borderRadius: number;
    borderWidth: number;
    borderStyle: 'none' | 'solid' | 'dashed';
    borderColor: string;
    boxShadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
    animation: 'none' | 'fade_in' | 'slide_up' | 'zoom_subtle';
    hoverEffect: 'none' | 'lift' | 'zoom_image' | 'glow';
    decorativeBadge: boolean;
    decorativeGlow: boolean;
  };
  placement: BannerPlacement;
  theme: 'royal-blue' | 'ice-blue' | 'midnight-navy';
  widthMode: BannerWidthMode;
  customWidthPercent: number;
  layoutSettings: {
    desktopCols: number;
    tabletCols: number;
    mobileCols: number;
    columnGap: number;
    rowGap: number;
    customSlotKey: string;
    visibleOnDesktop: boolean;
    visibleOnTablet: boolean;
    visibleOnMobile: boolean;
  };
  displayOrder: number;
  priority: number;
  status: BannerStatus;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isPublished: boolean;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const BANNER_PLACEMENTS: BannerPlacement[] = [
  'hero_bento',
  'homepage_hero',
  'above_hero',
  'below_hero',
  'above_categories',
  'below_categories',
  'above_featured',
  'below_featured',
  'above_bestsellers',
  'below_bestsellers',
  'between_sections',
  'homepage_mid',
  'homepage_bottom',
  'category_top',
  'promo_strip',
  'promotional_section',
  'wishlist_bottom',
  'custom',
];

const BannerSchema = new Schema<IBanner>(
  {
    name: { type: String, trim: true, maxlength: 160, default: '' },
    slug: { type: String, trim: true, lowercase: true, unique: true, sparse: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    highlightedTitle: { type: String, trim: true, maxlength: 120, default: '' },
    eyebrow: { type: String, trim: true, maxlength: 80, default: '' },
    promoLabel: { type: String, trim: true, maxlength: 80, default: '' },
    subtitle: { type: String, trim: true, maxlength: 300, default: '' },
    description: { type: String, trim: true, maxlength: 600, default: '' },
    caption: { type: String, trim: true, maxlength: 160, default: '' },
    desktopImageUrl: { type: String, trim: true, default: '' },
    mobileImageUrl: { type: String, trim: true, default: '' },
    cloudinaryPublicId: { type: String, default: '' },
    backgroundType: {
      type: String,
      enum: ['solid', 'gradient', 'image', 'gradient_image', 'image_overlay'],
      default: 'gradient_image',
    },
    backgroundColor: { type: String, default: '#EAF1FF', trim: true, maxlength: 40 },
    backgroundOpacity: { type: Number, default: 100, min: 0, max: 100 },
    gradientConfig: {
      type: {
        type: String,
        enum: ['linear', 'radial'],
        default: 'linear',
      },
      angle: { type: Number, default: 135, min: 0, max: 360 },
      stops: {
        type: [
          {
            color: { type: String, required: true },
            position: { type: Number, required: true, min: 0, max: 100 },
          },
        ],
        default: [
          { color: '#E8F0FF', position: 0 },
          { color: '#CFE0FF', position: 100 },
        ],
      },
      opacity: { type: Number, default: 100, min: 0, max: 100 },
    },
    imageSettings: {
      objectFit: { type: String, enum: ['cover', 'contain', 'fill', 'auto'], default: 'cover' },
      position: { type: String, default: 'center center' },
      focalPoint: {
        x: { type: Number, default: 50, min: 0, max: 100 },
        y: { type: Number, default: 50, min: 0, max: 100 },
      },
      repeat: { type: String, enum: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'], default: 'no-repeat' },
      opacity: { type: Number, default: 85, min: 0, max: 100 },
    },
    overlaySettings: {
      type: { type: String, enum: ['none', 'solid', 'gradient'], default: 'gradient' },
      color: { type: String, default: '#EAF1FF' },
      secondaryColor: { type: String, default: '#FFFFFF' },
      direction: { type: String, default: 'to right' },
      opacity: { type: Number, default: 35, min: 0, max: 100 },
    },
    contentSettings: {
      horizontalAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      verticalAlign: { type: String, enum: ['top', 'middle', 'bottom'], default: 'middle' },
      tabletHorizontalAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      mobileHorizontalAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      contentWidth: { type: String, default: '58%' },
      maxWidthPx: { type: Number, default: 540 },
      paddingX: { type: Number, default: 32 },
      paddingY: { type: Number, default: 32 },
      elementSpacing: { type: Number, default: 12 },
      heightMode: {
        type: String,
        enum: ['auto', 'small', 'medium', 'large', 'custom'],
        default: 'medium',
      },
      minHeightPx: { type: Number, default: 260 },
      tabletMinHeightPx: { type: Number, default: 230 },
      mobileMinHeightPx: { type: Number, default: 200 },
    },
    typographySettings: {
      titleFontFamily: { type: String, default: 'Outfit' },
      subtitleFontFamily: { type: String, default: 'Plus Jakarta Sans' },
      titleFontSize: { type: Number, default: 36 },
      subtitleFontSize: { type: Number, default: 15 },
      descriptionFontSize: { type: Number, default: 13 },
      titleFontWeight: { type: Number, default: 800 },
      subtitleFontWeight: { type: Number, default: 500 },
      lineHeight: { type: Number, default: 1.15 },
      letterSpacing: { type: Number, default: -0.02 },
      textAlign: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
      textTransform: { type: String, enum: ['none', 'uppercase', 'capitalize'], default: 'none' },
      titleColor: { type: String, default: '#0A1F44' },
      highlightColor: { type: String, default: '#145CFF' },
      subtitleColor: { type: String, default: '#475569' },
      descriptionColor: { type: String, default: '#64748B' },
      textShadow: { type: String, default: 'none' },
    },
    ctaText: { type: String, default: 'Shop Now', trim: true, maxlength: 60 },
    destinationUrl: { type: String, default: '/shop', trim: true, maxlength: 300 },
    secondaryCtaText: { type: String, default: '', trim: true, maxlength: 60 },
    secondaryDestinationUrl: { type: String, default: '/offers', trim: true, maxlength: 300 },
    buttonSettings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    styleSettings: {
      presetKey: { type: String, default: 'modern_blue' },
      borderRadius: { type: Number, default: 16 },
      borderWidth: { type: Number, default: 1 },
      borderStyle: { type: String, enum: ['none', 'solid', 'dashed'], default: 'solid' },
      borderColor: { type: String, default: '#DCE6F7' },
      boxShadow: { type: String, enum: ['none', 'sm', 'md', 'lg', 'xl'], default: 'sm' },
      animation: { type: String, enum: ['none', 'fade_in', 'slide_up', 'zoom_subtle'], default: 'none' },
      hoverEffect: { type: String, enum: ['none', 'lift', 'zoom_image', 'glow'], default: 'lift' },
      decorativeBadge: { type: Boolean, default: true },
      decorativeGlow: { type: Boolean, default: false },
    },
    placement: {
      type: String,
      enum: BANNER_PLACEMENTS,
      default: 'hero_bento',
      index: true,
    },
    theme: {
      type: String,
      enum: ['royal-blue', 'ice-blue', 'midnight-navy'],
      default: 'royal-blue',
    },
    widthMode: {
      type: String,
      enum: ['full', 'half', 'one_third', 'two_thirds', 'custom'],
      default: 'full',
    },
    customWidthPercent: { type: Number, default: 100, min: 10, max: 100 },
    layoutSettings: {
      desktopCols: { type: Number, default: 1, min: 1, max: 6 },
      tabletCols: { type: Number, default: 1, min: 1, max: 4 },
      mobileCols: { type: Number, default: 1, min: 1, max: 2 },
      columnGap: { type: Number, default: 16, min: 0, max: 64 },
      rowGap: { type: Number, default: 16, min: 0, max: 64 },
      customSlotKey: { type: String, default: '', trim: true, maxlength: 80 },
      visibleOnDesktop: { type: Boolean, default: true },
      visibleOnTablet: { type: Boolean, default: true },
      visibleOnMobile: { type: Boolean, default: true },
    },
    displayOrder: { type: Number, default: 1, index: true },
    priority: { type: Number, default: 0, index: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'scheduled', 'inactive'],
      default: 'published',
      index: true,
    },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isPublished: { type: Boolean, default: true, index: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const BannerModel = mongoose.models.Banner || mongoose.model<IBanner>('Banner', BannerSchema);
