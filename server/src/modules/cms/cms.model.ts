import mongoose, { Schema, type Document } from 'mongoose';

export interface IHomepageConfig extends Document {
  key: string;
  storeInfo: {
    storeName: string;
    tagline: string;
    description: string;
    logoUrl?: string;
    faviconUrl?: string;
    supportPhone: string;
    supportEmail: string;
  };
  currencySettings: {
    code: string;
    symbol: string;
    position: 'prefix' | 'suffix';
  };
  announcementBar: {
    enabled: boolean;
    text: string;
    linkText?: string;
    linkUrl?: string;
  };
  headerSettings: {
    showSearch: boolean;
    showWishlist: boolean;
    showCategoryMenu: boolean;
    stickyHeader: boolean;
    specialOfferLabel: string;
    specialOfferUrl: string;
  };
  footerSettings: {
    description: string;
    tagline: string;
    copyrightText: string;
    storeStatus: 'live' | 'maintenance';
    columns: Array<{
      title: string;
      links: Array<{ label: string; url: string }>;
    }>;
  };
  navigationMenu: Array<{
    label: string;
    url: string;
    icon?: string;
    openInNewTab?: boolean;
    sortOrder: number;
    isActive: boolean;
  }>;
  homepageSections: Array<{
    key: string;
    title: string;
    subtitle?: string;
    enabled: boolean;
    sortOrder: number;
    productIds: string[];
  }>;
  heroSlides: Array<{
    badgeText: string;
    headlineLine1: string;
    headlineLine2: string;
    subtitle: string;
    ctaLabel: string;
    ctaUrl: string;
    imageUrl: string;
    cloudinaryPublicId?: string;
    isActive: boolean;
  }>;
  promoBentoCards: Array<{
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaUrl: string;
    imageUrl: string;
    theme: 'royal-blue' | 'ice-blue' | 'midnight-navy';
  }>;
  featureBanners: {
    giftBanner: {
      enabled: boolean;
      title: string;
      subtitle: string;
      description: string;
      ctaLabel: string;
      ctaUrl: string;
    };
    trustBanner: {
      enabled: boolean;
      title: string;
      subtitle: string;
      bullets: string[];
    };
  };
  sectionOrder: string[];
  enabledSections: Record<string, boolean>;
  shippingSettings: {
    dhakaMetroCharge: number;
    dhakaSuburbCharge: number;
    nationwideCharge: number;
    freeShippingThreshold: number;
    expressSurcharge: number;
  };
  deliveryZones: Array<{
    name: string;
    divisions: string[];
    charge: number;
    freeAbove: number;
    estimatedDays: string;
    isActive: boolean;
  }>;
  deliveryOptions?: Array<{
    code: string;
    name: string;
    description: string;
    estimatedTime: string;
    methodType: 'standard' | 'express';
    surcharge: number;
    freeShippingEligible: boolean;
    isActive: boolean;
    sortOrder: number;
    divisions?: string[];
  }>;
  paymentMethods: {
    codEnabled: boolean;
    sslcommerzEnabled: boolean;
    bkashEnabled: boolean;
    nagadEnabled: boolean;
    cardEnabled: boolean;
    codMaxAmount: number;
    codInstructions: string;
  };
  taxSettings: {
    enabled: boolean;
    label: string;
    ratePercent: number;
    inclusive: boolean;
  };
  emailSettings: {
    senderName: string;
    senderEmail: string;
    replyTo: string;
    orderConfirmationSubject: string;
    shippingUpdateSubject: string;
  };
  notificationSettings: {
    lowStockAlert: boolean;
    newOrderAlert: boolean;
    newReviewAlert: boolean;
    newEnquiryAlert: boolean;
    lowStockThresholdDefault: number;
  };
  securitySettings: {
    requireEmailVerification: boolean;
    sessionTimeoutHours: number;
    maxLoginAttempts: number;
    maintenanceBypassAdmin: boolean;
  };
  maintenanceMode: {
    enabled: boolean;
    title: string;
    message: string;
  };
  promotionalPopups: Array<{
    title: string;
    subtitle: string;
    imageUrl?: string;
    ctaLabel: string;
    ctaUrl: string;
    couponCode?: string;
    delaySeconds: number;
    isActive: boolean;
    startsAt?: Date | null;
    endsAt?: Date | null;
  }>;
  contactInfo: {
    phone?: string;
    email?: string;
    address?: string;
    whatsappUrl?: string;
    messengerUrl?: string;
    instagramUrl?: string;
    linkedinUrl?: string;
    facebookUrl?: string;
    youtubeUrl?: string;
    xUrl?: string;
    tiktokUrl?: string;
  };
  seoDefaults: {
    siteName: string;
    defaultTitle: string;
    defaultDescription: string;
  };
  productTrustHighlights: Array<{
    icon: string;
    title: string;
    subtitle: string;
    isActive: boolean;
  }>;
  cartHeroSettings?: {
    enabled: boolean;
    autoplay: boolean;
    autoplayIntervalMs: number;
    showDots: boolean;
    showArrows: boolean;
    transitionEffect: 'fade' | 'slide';
    confidenceBanner?: {
      enabled: boolean;
      title: string;
      subtitle: string;
    };
  };
  checkoutHeroSettings?: {
    enabled: boolean;
    autoplay: boolean;
    autoplayIntervalMs: number;
    showDots: boolean;
    showArrows: boolean;
    transitionEffect: 'fade' | 'slide';
    confidenceBanner?: {
      enabled: boolean;
      title: string;
      subtitle: string;
    };
  };
  wishlistHeroSettings?: {
    enabled: boolean;
    autoplay: boolean;
    autoplayIntervalMs: number;
    showDots: boolean;
    showArrows: boolean;
    transitionEffect: 'fade' | 'slide';
  };
  updatedAt: Date;
}

const HomepageConfigSchema = new Schema<IHomepageConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    storeInfo: {
      storeName: { type: String, default: 'NOVARA COMMERCE' },
      tagline: { type: String, default: 'Smart Technology & Lifestyle Store Bangladesh' },
      description: {
        type: String,
        default: 'Genuine electronics, fashion, books, and smart lifestyle essentials delivered nationwide across Bangladesh.',
      },
      logoUrl: { type: String, default: '' },
      faviconUrl: { type: String, default: '' },
      supportPhone: { type: String, default: '+880 1700-000000' },
      supportEmail: { type: String, default: 'support@novara.com.bd' },
    },
    currencySettings: {
      code: { type: String, default: 'BDT' },
      symbol: { type: String, default: '৳' },
      position: { type: String, enum: ['prefix', 'suffix'], default: 'prefix' },
    },
    announcementBar: {
      enabled: { type: Boolean, default: true },
      text: { type: String, default: 'Free Shipping on Orders Over ৳999' },
      linkText: { type: String, default: 'Shop Offers' },
      linkUrl: { type: String, default: '/offers' },
    },
    headerSettings: {
      showSearch: { type: Boolean, default: true },
      showWishlist: { type: Boolean, default: true },
      showCategoryMenu: { type: Boolean, default: true },
      stickyHeader: { type: Boolean, default: true },
      specialOfferLabel: { type: String, default: 'Special Offers' },
      specialOfferUrl: { type: String, default: '/offers' },
    },
    footerSettings: {
      description: {
        type: String,
        default: 'Bangladesh’s trusted destination for verified electronics, fashion, and lifestyle essentials.',
      },
      tagline: { type: String, default: 'Nationwide Courier · Genuine Warranty · Cash on Delivery' },
      copyrightText: { type: String, default: '© 2026 NOVARA. All Rights Reserved.' },
      storeStatus: { type: String, enum: ['live', 'maintenance'], default: 'live' },
      columns: {
        type: [
          {
            title: { type: String, required: true },
            links: {
              type: [{ label: { type: String, required: true }, url: { type: String, required: true } }],
              default: [],
            },
          },
        ],
        default: [
          {
            title: 'Shop',
            links: [
              { label: 'All Products', url: '/shop' },
              { label: 'Special Offers', url: '/offers' },
              { label: 'Track Order', url: '/track-order' },
            ],
          },
          {
            title: 'Company',
            links: [
              { label: 'About Us', url: '/about' },
              { label: 'Contact Support', url: '/contact' },
              { label: 'Journal & Blog', url: '/blog' },
              { label: 'FAQs', url: '/faqs' },
            ],
          },
        ],
      },
    },
    navigationMenu: {
      type: [
        {
          label: { type: String, required: true },
          url: { type: String, required: true },
          icon: { type: String, default: '' },
          openInNewTab: { type: Boolean, default: false },
          sortOrder: { type: Number, default: 0 },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [
        { label: 'Home', url: '/', sortOrder: 0, isActive: true },
        { label: 'Shop', url: '/shop', sortOrder: 1, isActive: true },
        { label: 'Special Offers', url: '/offers', sortOrder: 2, isActive: true },
        { label: 'Blog', url: '/blog', sortOrder: 3, isActive: true },
        { label: 'About Us', url: '/about', sortOrder: 4, isActive: true },
        { label: 'Contact Us', url: '/contact', sortOrder: 5, isActive: true },
      ],
    },
    homepageSections: {
      type: [
        {
          key: { type: String, required: true },
          title: { type: String, required: true },
          subtitle: { type: String, default: '' },
          enabled: { type: Boolean, default: true },
          sortOrder: { type: Number, default: 0 },
          productIds: { type: [String], default: [] },
        },
      ],
      default: [
        { key: 'hero', title: 'Hero Showcase', subtitle: 'Primary storefront carousel', enabled: true, sortOrder: 0, productIds: [] },
        { key: 'categories', title: 'Shop by Category', subtitle: 'Explore top departments', enabled: true, sortOrder: 1, productIds: [] },
        { key: 'promoBento', title: 'Curated Highlights', subtitle: 'Seasonal picks and bundles', enabled: true, sortOrder: 2, productIds: [] },
        { key: 'bestSellers', title: 'Best Sellers', subtitle: 'Most loved by shoppers across Bangladesh', enabled: true, sortOrder: 3, productIds: [] },
        { key: 'featureBanners', title: 'Customer Perks & Guarantees', subtitle: 'Why shop with NOVARA', enabled: true, sortOrder: 4, productIds: [] },
        { key: 'promotionalAd', title: 'Featured Campaign', subtitle: 'Scheduled marketing placement', enabled: true, sortOrder: 5, productIds: [] },
        { key: 'premiumCollection', title: 'Premium Collection', subtitle: 'Flagship releases & exclusive editions', enabled: true, sortOrder: 6, productIds: [] },
        { key: 'reviews', title: 'Verified Customer Reviews', subtitle: 'Real feedback from recent orders', enabled: true, sortOrder: 7, productIds: [] },
        { key: 'newsletter', title: 'Newsletter & Deals', subtitle: 'Weekly drops and coupon alerts', enabled: true, sortOrder: 8, productIds: [] },
      ],
    },
    heroSlides: {
      type: [
        {
          badgeText: { type: String, required: true },
          headlineLine1: { type: String, required: true },
          headlineLine2: { type: String, required: true },
          subtitle: { type: String, required: true },
          ctaLabel: { type: String, required: true },
          ctaUrl: { type: String, required: true },
          imageUrl: { type: String, required: true },
          cloudinaryPublicId: { type: String },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    promoBentoCards: {
      type: [
        {
          eyebrow: { type: String, required: true },
          title: { type: String, required: true },
          subtitle: { type: String, required: true },
          ctaLabel: { type: String, required: true },
          ctaUrl: { type: String, required: true },
          imageUrl: { type: String, required: true },
          theme: { type: String, enum: ['royal-blue', 'ice-blue', 'midnight-navy'], default: 'royal-blue' },
        },
      ],
      default: [],
    },
    featureBanners: {
      giftBanner: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Special Gift' },
        subtitle: { type: String, default: 'For Our Valued Customers' },
        description: { type: String, default: 'Get a Free Gift on Orders Over ৳5,000' },
        ctaLabel: { type: String, default: 'Shop Now' },
        ctaUrl: { type: String, default: '/shop' },
      },
      trustBanner: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Premium Quality Guaranteed' },
        subtitle: { type: String, default: 'Shop with Confidence' },
        bullets: { type: [String], default: ['Easy Returns', 'Secure Payment', 'Trusted Store'] },
      },
    },
    sectionOrder: {
      type: [String],
      default: [
        'hero',
        'categories',
        'promoBento',
        'bestSellers',
        'featureBanners',
        'promotionalAd',
        'premiumCollection',
        'reviews',
        'newsletter',
      ],
    },
    enabledSections: {
      type: Map,
      of: Boolean,
      default: {
        hero: true,
        categories: true,
        promoBento: true,
        bestSellers: true,
        featureBanners: true,
        promotionalAd: true,
        premiumCollection: true,
        reviews: true,
        newsletter: true,
      },
    },
    shippingSettings: {
      dhakaMetroCharge: { type: Number, default: 60 },
      dhakaSuburbCharge: { type: Number, default: 90 },
      nationwideCharge: { type: Number, default: 120 },
      freeShippingThreshold: { type: Number, default: 999 },
      expressSurcharge: { type: Number, default: 80 },
    },
    deliveryZones: {
      type: [
        {
          name: { type: String, required: true },
          divisions: { type: [String], default: [] },
          charge: { type: Number, default: 100 },
          freeAbove: { type: Number, default: 999 },
          estimatedDays: { type: String, default: '2-4 business days' },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [
        { name: 'Dhaka Metro', divisions: ['Dhaka'], charge: 60, freeAbove: 999, estimatedDays: '24-48 hours', isActive: true },
        { name: 'Dhaka Suburbs', divisions: ['Dhaka'], charge: 90, freeAbove: 1499, estimatedDays: '2-3 days', isActive: true },
        { name: 'Nationwide', divisions: ['Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Rangpur', 'Barishal', 'Mymensingh'], charge: 120, freeAbove: 1999, estimatedDays: '3-5 days', isActive: true },
      ],
    },
    deliveryOptions: {
      type: [
        {
          code: { type: String, required: true, trim: true },
          name: { type: String, required: true, trim: true },
          description: { type: String, default: '' },
          estimatedTime: { type: String, default: 'Within 2–5 Business Days' },
          methodType: { type: String, enum: ['standard', 'express'], default: 'standard' },
          surcharge: { type: Number, default: 0, min: 0 },
          freeShippingEligible: { type: Boolean, default: true },
          isActive: { type: Boolean, default: true },
          sortOrder: { type: Number, default: 0 },
          divisions: { type: [String], default: ['All'] },
        },
      ],
      default: [
        {
          code: 'standard',
          name: 'Standard Delivery',
          description: 'Doorstep parcel courier across Bangladesh',
          estimatedTime: 'Within 2–5 Business Days',
          methodType: 'standard',
          surcharge: 0,
          freeShippingEligible: true,
          isActive: true,
          sortOrder: 0,
          divisions: ['All'],
        },
        {
          code: 'express',
          name: 'Priority Express',
          description: 'Accelerated dispatch & priority courier handling',
          estimatedTime: 'Within 1–2 Business Days',
          methodType: 'express',
          surcharge: 80,
          freeShippingEligible: false,
          isActive: true,
          sortOrder: 1,
          divisions: ['All'],
        },
      ],
    },
    paymentMethods: {
      codEnabled: { type: Boolean, default: true },
      sslcommerzEnabled: { type: Boolean, default: true },
      bkashEnabled: { type: Boolean, default: true },
      nagadEnabled: { type: Boolean, default: true },
      cardEnabled: { type: Boolean, default: true },
      codMaxAmount: { type: Number, default: 50000 },
      codInstructions: { type: String, default: 'Pay in cash to the delivery courier upon parcel inspection.' },
    },
    taxSettings: {
      enabled: { type: Boolean, default: false },
      label: { type: String, default: 'VAT' },
      ratePercent: { type: Number, default: 0, min: 0, max: 50 },
      inclusive: { type: Boolean, default: false },
    },
    emailSettings: {
      senderName: { type: String, default: 'NOVARA COMMERCE' },
      senderEmail: { type: String, default: 'orders@novara.com.bd' },
      replyTo: { type: String, default: 'support@novara.com.bd' },
      orderConfirmationSubject: { type: String, default: 'Your NOVARA COMMERCE Order Confirmation' },
      shippingUpdateSubject: { type: String, default: 'Shipping Update for your NOVARA Order' },
    },
    notificationSettings: {
      lowStockAlert: { type: Boolean, default: true },
      newOrderAlert: { type: Boolean, default: true },
      newReviewAlert: { type: Boolean, default: true },
      newEnquiryAlert: { type: Boolean, default: true },
      lowStockThresholdDefault: { type: Number, default: 5 },
    },
    securitySettings: {
      requireEmailVerification: { type: Boolean, default: false },
      sessionTimeoutHours: { type: Number, default: 168 },
      maxLoginAttempts: { type: Number, default: 30 },
      maintenanceBypassAdmin: { type: Boolean, default: true },
    },
    maintenanceMode: {
      enabled: { type: Boolean, default: false },
      title: { type: String, default: 'Scheduled Maintenance Underway' },
      message: { type: String, default: 'We are upgrading our storefront experience. Please check back shortly.' },
    },
    promotionalPopups: {
      type: [
        {
          title: { type: String, required: true },
          subtitle: { type: String, default: '' },
          imageUrl: { type: String, default: '' },
          ctaLabel: { type: String, default: 'Claim Offer' },
          ctaUrl: { type: String, default: '/shop' },
          couponCode: { type: String, default: '' },
          delaySeconds: { type: Number, default: 12 },
          isActive: { type: Boolean, default: false },
          startsAt: { type: Date, default: null },
          endsAt: { type: Date, default: null },
        },
      ],
      default: [],
    },
    contactInfo: {
      phone: { type: String, default: '+880 1700-000000' },
      email: { type: String, default: 'support@novara.com.bd' },
      address: { type: String, default: 'House 24, Road 11, Banani, Dhaka 1213, Bangladesh' },
      whatsappUrl: { type: String, default: '' },
      messengerUrl: { type: String, default: '' },
      instagramUrl: { type: String, default: 'https://instagram.com' },
      linkedinUrl: { type: String, default: 'https://linkedin.com' },
      facebookUrl: { type: String, default: 'https://facebook.com' },
      youtubeUrl: { type: String, default: 'https://youtube.com' },
      xUrl: { type: String, default: 'https://x.com' },
      tiktokUrl: { type: String, default: 'https://tiktok.com' },
    },
    seoDefaults: {
      siteName: { type: String, default: 'NOVARA COMMERCE' },
      defaultTitle: { type: String, default: 'NOVARA COMMERCE – Smart Technology & Lifestyle Store Bangladesh' },
      defaultDescription: {
        type: String,
        default: 'Shop genuine electronics, fashion, books, and home essentials across Bangladesh with fast nationwide delivery.',
      },
    },
    productTrustHighlights: {
      type: [
        {
          icon: { type: String, default: 'ShieldCheck' },
          title: { type: String, required: true, trim: true, maxlength: 80 },
          subtitle: { type: String, default: '', trim: true, maxlength: 100 },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [
        { icon: 'ShieldCheck', title: '100% Original', subtitle: 'Products', isActive: true },
        { icon: 'Truck', title: 'Fast Delivery', subtitle: 'Across Bangladesh', isActive: true },
        { icon: 'Headphones', title: '24/7 Support', subtitle: 'Always Here', isActive: true },
        { icon: 'CheckCircle2', title: 'Secure Payment', subtitle: 'SSL Encrypted', isActive: true },
        { icon: 'RotateCcw', title: 'Easy Returns', subtitle: 'Within 7 Days', isActive: true },
      ],
    },
    cartHeroSettings: {
      enabled: { type: Boolean, default: true },
      autoplay: { type: Boolean, default: true },
      autoplayIntervalMs: { type: Number, default: 5000, min: 1500, max: 30000 },
      showDots: { type: Boolean, default: true },
      showArrows: { type: Boolean, default: true },
      transitionEffect: { type: String, enum: ['fade', 'slide'], default: 'fade' },
      confidenceBanner: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Shop with Confidence', maxlength: 120 },
        subtitle: { type: String, default: 'Safe Payment  |  Secure Checkout  |  7-Day Return Policy', maxlength: 200 },
      },
    },
    checkoutHeroSettings: {
      enabled: { type: Boolean, default: true },
      autoplay: { type: Boolean, default: true },
      autoplayIntervalMs: { type: Number, default: 5500, min: 1500, max: 30000 },
      showDots: { type: Boolean, default: true },
      showArrows: { type: Boolean, default: false },
      transitionEffect: { type: String, enum: ['fade', 'slide'], default: 'fade' },
      confidenceBanner: {
        enabled: { type: Boolean, default: true },
        title: { type: String, default: 'Shop with Confidence', maxlength: 120 },
        subtitle: { type: String, default: '7-Day Return Policy • Secure Payment • 100% Genuine Products', maxlength: 200 },
      },
    },
    wishlistHeroSettings: {
      enabled: { type: Boolean, default: true },
      autoplay: { type: Boolean, default: true },
      autoplayIntervalMs: { type: Number, default: 5000, min: 1500, max: 30000 },
      showDots: { type: Boolean, default: true },
      showArrows: { type: Boolean, default: false },
      transitionEffect: { type: String, enum: ['fade', 'slide'], default: 'fade' },
    },
  },
  { timestamps: true },
);

export const HomepageConfigModel =
  mongoose.models.HomepageConfig || mongoose.model<IHomepageConfig>('HomepageConfig', HomepageConfigSchema);

export interface IPromotionalAd extends Document {
  title: string;
  altText: string;
  imageUrl: string;
  mobileImageUrl?: string;
  cloudinaryPublicId?: string;
  destinationUrl: string;
  placement: 'homepage_mid' | 'homepage_bottom' | 'category_sidebar' | 'product_detail' | 'promo_section';
  priority: number;
  impressions: number;
  clicks: number;
  isEnabled: boolean;
  isPublished: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PromotionalAdSchema = new Schema<IPromotionalAd>(
  {
    title: { type: String, required: true, maxlength: 140 },
    altText: { type: String, required: true, maxlength: 200 },
    imageUrl: { type: String, required: true },
    mobileImageUrl: { type: String },
    cloudinaryPublicId: { type: String },
    destinationUrl: { type: String, required: true },
    placement: {
      type: String,
      enum: ['homepage_mid', 'homepage_bottom', 'category_sidebar', 'product_detail', 'promo_section'],
      default: 'homepage_mid',
    },
    priority: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    isEnabled: { type: Boolean, default: true },
    isPublished: { type: Boolean, default: false },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PromotionalAdModel =
  mongoose.models.PromotionalAd || mongoose.model<IPromotionalAd>('PromotionalAd', PromotionalAdSchema);

export interface ICmsPage extends Document {
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt: Date;
}

const CmsPageSchema = new Schema<ICmsPage>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    isPublished: { type: Boolean, default: true },
    seoTitle: { type: String },
    seoDescription: { type: String },
  },
  { timestamps: true },
);

export const CmsPageModel = mongoose.models.CmsPage || mongoose.model<ICmsPage>('CmsPage', CmsPageSchema);

export interface IFaq extends Document {
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FaqSchema = new Schema<IFaq>(
  {
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 3000 },
    category: { type: String, default: 'General', trim: true },
    sortOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const FaqModel = mongoose.models.Faq || mongoose.model<IFaq>('Faq', FaqSchema);

export interface IBlogPost extends Document {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  authorName: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date | null;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, default: '', maxlength: 400 },
    content: { type: String, required: true },
    coverImageUrl: { type: String },
    authorName: { type: String, default: 'NOVARA Editorial' },
    category: { type: String, default: 'Buying Guides' },
    tags: { type: [String], default: [] },
    isPublished: { type: Boolean, default: true, index: true },
    publishedAt: { type: Date, default: null },
    seoTitle: { type: String, maxlength: 140 },
    seoDescription: { type: String, maxlength: 240 },
  },
  { timestamps: true },
);

export const BlogPostModel = mongoose.models.BlogPost || mongoose.model<IBlogPost>('BlogPost', BlogPostSchema);

export interface IAttributeGroup extends Document {
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttributeGroupSchema = new Schema<IAttributeGroup>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '', maxlength: 300 },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const AttributeGroupModel =
  mongoose.models.AttributeGroup ||
  mongoose.model<IAttributeGroup>('AttributeGroup', AttributeGroupSchema);

export interface IProductAttributeOption {
  label: string;
  value: string;
  colorHex?: string;
  sortOrder: number;
}

export interface IProductAttributePreset extends Document {
  name: string;
  code: string;
  description?: string;
  group: string;
  groupId?: mongoose.Types.ObjectId | null;
  groupName?: string;
  inputType:
    | 'short_text'
    | 'long_text'
    | 'number'
    | 'decimal'
    | 'boolean'
    | 'single_select'
    | 'multi_select'
    | 'color'
    | 'date'
    | 'url'
    | 'measurement'
    | 'file';
  unit?: string;
  scope: 'global' | 'category' | 'product';
  categoryIds: mongoose.Types.ObjectId[];
  values: string[];
  options: IProductAttributeOption[];
  defaultValue?: Schema.Types.Mixed;
  validationRules?: {
    min?: number | null;
    max?: number | null;
    minLength?: number | null;
    maxLength?: number | null;
    pattern?: string;
  };
  sortOrder: number;
  isRequired: boolean;
  isVisibleToCustomers: boolean;
  showOnProductDetails: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isComparable: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductAttributePresetSchema = new Schema<IProductAttributePreset>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    code: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: '', maxlength: 300 },
    group: {
      type: String,
      default: 'general',
      trim: true,
    },
    groupId: { type: Schema.Types.ObjectId, ref: 'AttributeGroup', default: null, index: true },
    groupName: { type: String, default: 'General Specifications', trim: true, maxlength: 80 },
    inputType: {
      type: String,
      enum: [
        'short_text',
        'long_text',
        'number',
        'decimal',
        'boolean',
        'single_select',
        'multi_select',
        'color',
        'date',
        'url',
        'measurement',
        'file',
      ],
      default: 'single_select',
    },
    unit: { type: String, default: '', trim: true, maxlength: 30 },
    scope: {
      type: String,
      enum: ['global', 'category', 'product'],
      default: 'global',
      index: true,
    },
    categoryIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Category' }], default: [], index: true },
    values: { type: [String], default: [] },
    options: {
      type: [
        {
          label: { type: String, required: true, trim: true },
          value: { type: String, required: true, trim: true },
          colorHex: { type: String, default: '' },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    defaultValue: { type: Schema.Types.Mixed, default: null },
    validationRules: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      minLength: { type: Number, default: null },
      maxLength: { type: Number, default: null },
      pattern: { type: String, default: '' },
    },
    sortOrder: { type: Number, default: 0 },
    isRequired: { type: Boolean, default: false },
    isVisibleToCustomers: { type: Boolean, default: true },
    showOnProductDetails: { type: Boolean, default: true },
    isFilterable: { type: Boolean, default: false, index: true },
    isSearchable: { type: Boolean, default: false },
    isComparable: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ProductAttributePresetModel =
  mongoose.models.ProductAttributePreset ||
  mongoose.model<IProductAttributePreset>('ProductAttributePreset', ProductAttributePresetSchema);
