import type { RoleName } from '../lib/rbac';
import type {
  CancellationRequestStatus,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from '../lib/orderStateMachine';
import type {
  BannerBackgroundType,
  BannerLayoutSettings,
  BannerPlacement as DynamicBannerPlacement,
  BannerStatus,
  BannerWidthMode,
  ContentSettings,
  DynamicBannerConfig,
  GradientConfig,
  HomepageLayoutSectionConfig,
  ImageSettings,
  OverlaySettings,
  TypographySettings,
} from '../lib/bannerBuilder';
import type {
  AttributeInputType,
  AttributeOptionItem,
  AttributeScope,
  AttributeValidationRules,
  ProductAttributeValueEntry,
  ProductContentFieldItem,
  ProductContentSectionItem,
  ProductHighlightItem,
  ProductSpecificationRow,
  ProductVideoItem,
} from '../lib/productAttributes';
import type {
  NavigationAlignment,
  NavigationFocalPoint,
  NavigationGroupConfig,
  NavigationImageFit,
  NavigationItemConfig,
  NavigationMenuConfig,
  NavigationMenuSettings,
  NavigationMenuType,
  NavigationOverviewStats,
  NavigationPromotionConfig,
  NavigationSlideConfig,
  NavigationSliderSettings,
  NavigationWidthMode,
} from '../lib/navigationEngine';

export type {
  AttributeInputType,
  AttributeOptionItem,
  AttributeScope,
  AttributeValidationRules,
  NavigationAlignment,
  NavigationFocalPoint,
  NavigationGroupConfig,
  NavigationImageFit,
  NavigationItemConfig,
  NavigationMenuConfig,
  NavigationMenuSettings,
  NavigationMenuType,
  NavigationOverviewStats,
  NavigationPromotionConfig,
  NavigationSlideConfig,
  NavigationSliderSettings,
  NavigationWidthMode,
  ProductAttributeValueEntry,
  ProductContentFieldItem,
  ProductContentSectionItem,
  ProductHighlightItem,
  ProductSpecificationRow,
  ProductVideoItem,
};

export interface ProductTrustHighlightItem {
  icon: string;
  title: string;
  subtitle: string;
}

export interface ProductQuestionItem {
  id?: string;
  _id?: string;
  question: string;
  answer: string;
  askedBy: string;
  answeredBy?: string;
  answeredAt?: string | null;
  isPublished: boolean;
  createdAt: string;
}

export interface AttributeGroupItem {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  attributeCount?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;
  walletBalance?: number;
  role: RoleName;
  customPermissions: string[];
  isVerified: boolean;
  status?: 'active' | 'suspended';
  authProvider?: 'local' | 'google' | 'facebook';
  createdAt?: string;
  notificationPrefs: {
    orderUpdates: boolean;
    promotions: boolean;
    backInStock: boolean;
  };
}

export interface ProductImage {
  url: string;
  publicId?: string;
  alt: string;
  sortOrder: number;
}

export interface ProductVariant {
  _id?: string;
  sku: string;
  barcode?: string;
  title: string;
  options: Record<string, string>;
  price?: number | null;
  salePrice?: number | null;
  compareAtPrice?: number | null;
  stockOnHand: number;
  reservedStock: number;
  lowStockThreshold: number;
  weight?: number | null;
  imageUrl?: string;
  images?: Array<string | ProductImage>;
  isActive: boolean;
}

export interface ProductItem {
  id: string;
  _id?: string;
  name: string;
  nameBn?: string;
  slug: string;
  sku: string;
  barcode?: string;
  brandId?: string | { _id: string; name: string; slug: string; logoUrl?: string } | null;
  brandName?: string;
  categoryId: string | { _id: string; name: string; nameBn?: string; slug: string; attributeSchemaType?: string };
  subCategoryId?: string | { _id: string; id?: string; name: string; nameBn?: string; slug: string } | null;
  description: string;
  shortDescription?: string;
  features?: string[];
  attributeGroup: string;
  attributes?: Record<string, string>;
  attributeValues?: ProductAttributeValueEntry[];
  specifications?: ProductSpecificationRow[];
  highlights?: ProductHighlightItem[];
  videos?: ProductVideoItem[];
  contentSections?: ProductContentSectionItem[];
  questions?: ProductQuestionItem[];
  bilingualKeywords?: string[];
  basePrice: number;
  costPrice?: number | null;
  salePrice?: number | null;
  flashSalePrice?: number | null;
  flashSaleStartsAt?: string | null;
  flashSaleEndsAt?: string | null;
  currentPrice: number;
  originalPrice: number | null;
  discountPercent: number;
  isFlashSaleActive: boolean;
  availableStock: number;
  stockOnHand: number;
  reservedStock: number;
  lowStockThreshold?: number;
  manageInventory?: boolean;
  allowBackorder?: boolean;
  weight?: number | null;
  dimensions?: { length?: number | null; width?: number | null; height?: number | null };
  tags?: string[];
  hasVariants: boolean;
  variantOptions?: Array<{ name: string; values: string[]; colors?: Record<string, string> }>;
  variants: ProductVariant[];
  images: ProductImage[];
  warrantyInfo?: string;
  returnPolicyNote?: string;
  faqs?: Array<{ question: string; answer: string }>;
  status: 'draft' | 'published' | 'archived';
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isPremiumCollection?: boolean;
  soldCount: number;
  ratingAverage: number;
  reviewCount: number;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
}

export interface CategoryItem {
  id: string;
  _id?: string;
  name: string;
  nameBn?: string;
  slug: string;
  parentId?: string | null;
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
  productCount?: number;
}

export interface BrandItem {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  logoUrl?: string;
  cloudinaryPublicId?: string;
  description?: string;
  websiteUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  isActive: boolean;
  productCount?: number;
}

export interface CartLine {
  productId: string;
  variantId?: string | null;
  slug: string;
  name: string;
  shortDescription?: string;
  sku: string;
  variantTitle?: string | null;
  imageUrl: string;
  unitPrice: number;
  originalPrice?: number | null;
  discountPercent?: number;
  quantity: number;
  availableStock: number;
  isAvailable: boolean;
  selected?: boolean;
  categoryId?: string;
}

export interface SavedAddress {
  id: string;
  _id?: string;
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
}

export interface OrderRecord {
  id: string;
  _id?: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{
    productId: string;
    variantId?: string | null;
    sku: string;
    name: string;
    slug: string;
    imageUrl: string;
    variantOptions?: Record<string, string>;
    quantity: number;
    unitPrice: number;
    originalPrice?: number | null;
    lineTotal: number;
  }>;
  shippingAddress: {
    recipientName: string;
    email?: string;
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
  };
  deliveryMethod: 'standard' | 'express';
  deliveryOptionCode?: string;
  deliveryMethodName?: string;
  deliveryEta?: string;
  shippingZone: string;
  couponCode?: string | null;
  subtotal: number;
  discount: number;
  shippingCharge: number;
  tax: number;
  total: number;
  paymentMethod: 'cod' | 'sslcommerz' | 'bkash' | 'nagad' | 'card';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  courierName?: string;
  trackingNumber?: string;
  cancellationReason?: string;
  cancellationRequest?: {
    reason: string;
    message?: string;
    status: CancellationRequestStatus;
    orderStatusAtRequest?: string;
    requestedAt: string;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    reviewedByName?: string | null;
    adminNotes?: string;
    stockRestored?: boolean;
    refundTriggered?: boolean;
  } | null;
  cancellationHistory?: Array<{
    action?: 'direct_cancel' | 'requested' | 'approved' | 'rejected';
    event?: 'direct_cancel' | 'requested' | 'approved' | 'rejected';
    reason?: string;
    message?: string;
    adminNotes?: string;
    note?: string;
    actorId?: string | null;
    actorName: string;
    timestamp: string;
  }>;
  deliveredAt?: string;
  createdAt: string;
  paymentTransactions?: PaymentTransactionRecord[];
  statusHistory: Array<{
    fromStatus?: string;
    toStatus: string;
    actorName: string;
    reason?: string;
    timestamp: string;
  }>;
  staffNotes?: Array<{ note: string; actorName: string; timestamp: string }>;
}

export interface ReviewItem {
  _id: string;
  id?: string;
  productId: string | { _id: string; name: string; slug: string; sku?: string; images?: ProductImage[] };
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  isFeatured?: boolean;
  status: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
  reportedBy?: string[];
  createdAt: string;
}

export interface HomepageConfigData {
  storeInfo?: {
    storeName: string;
    tagline: string;
    description: string;
    logoUrl?: string;
    faviconUrl?: string;
    supportPhone: string;
    supportEmail: string;
  };
  currencySettings?: {
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
  headerSettings?: {
    showSearch: boolean;
    showWishlist: boolean;
    showCategoryMenu: boolean;
    stickyHeader: boolean;
    specialOfferLabel: string;
    specialOfferUrl: string;
  };
  footerSettings?: {
    description: string;
    tagline: string;
    copyrightText: string;
    storeStatus: 'live' | 'maintenance';
    columns: Array<{
      title: string;
      links: Array<{ label: string; url: string }>;
    }>;
  };
  navigationMenu?: Array<{
    label: string;
    url: string;
    icon?: string;
    openInNewTab?: boolean;
    sortOrder: number;
    isActive: boolean;
  }>;
  homepageSections?: Array<{
    key: string;
    title: string;
    subtitle?: string;
    enabled: boolean;
    sortOrder: number;
    productIds: string[];
  }>;
  heroSlides: Array<{
    id?: string;
    badgeText: string;
    headlineLine1: string;
    headlineLine2: string;
    subtitle: string;
    ctaLabel: string;
    ctaUrl: string;
    imageUrl: string;
    mobileImageUrl?: string;
    isActive: boolean;
  }>;
  promoBentoCards: Array<{
    id?: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaUrl: string;
    imageUrl: string;
    mobileImageUrl?: string;
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
  deliveryZones?: Array<{
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
  paymentMethods?: {
    codEnabled: boolean;
    sslcommerzEnabled: boolean;
    bkashEnabled: boolean;
    nagadEnabled?: boolean;
    cardEnabled: boolean;
    codMaxAmount: number;
    codInstructions: string;
  };
  taxSettings?: {
    enabled: boolean;
    label: string;
    ratePercent: number;
    inclusive: boolean;
  };
  emailSettings?: {
    senderName: string;
    senderEmail: string;
    replyTo: string;
    orderConfirmationSubject: string;
    shippingUpdateSubject: string;
  };
  notificationSettings?: {
    lowStockAlert: boolean;
    newOrderAlert: boolean;
    newReviewAlert: boolean;
    newEnquiryAlert: boolean;
    lowStockThresholdDefault: number;
  };
  securitySettings?: {
    requireEmailVerification: boolean;
    sessionTimeoutHours: number;
    maxLoginAttempts: number;
    maintenanceBypassAdmin: boolean;
  };
  maintenanceMode?: {
    enabled: boolean;
    title: string;
    message: string;
  };
  promotionalPopups?: Array<{
    title: string;
    subtitle: string;
    imageUrl?: string;
    ctaLabel: string;
    ctaUrl: string;
    couponCode?: string;
    delaySeconds: number;
    isActive: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
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
  productTrustHighlights?: ProductTrustHighlightItem[];
  cartHeroSettings?: CartHeroSliderSettings;
  checkoutHeroSettings?: CartHeroSliderSettings;
  wishlistHeroSettings?: CartHeroSliderSettings;
}

export interface CartHeroSliderSettings {
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
}

export type HeroSlidePlacement = 'home' | 'cart' | 'checkout' | 'wishlist';
export type HeroSlideAlignment = 'left' | 'center' | 'right';

export interface HeroSlideRecord {
  id: string;
  _id?: string;
  placement?: HeroSlidePlacement;
  badgeText: string;
  heading: string;
  headlineLine2?: string;
  subtitle?: string;
  desktopImageUrl: string;
  mobileImageUrl?: string;
  cloudinaryPublicId?: string;
  ctaText: string;
  ctaUrl: string;
  textAlignment?: HeroSlideAlignment;
  overlayOpacity?: number;
  sortOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type BannerPlacement = DynamicBannerPlacement;

export interface BannerRecord extends Partial<DynamicBannerConfig> {
  id: string;
  _id?: string;
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
  backgroundType?: BannerBackgroundType;
  backgroundColor?: string;
  backgroundOpacity?: number;
  gradientConfig?: GradientConfig;
  imageSettings?: ImageSettings;
  overlaySettings?: OverlaySettings;
  contentSettings?: ContentSettings;
  typographySettings?: TypographySettings;
  placement: BannerPlacement;
  theme: 'royal-blue' | 'ice-blue' | 'midnight-navy';
  widthMode?: BannerWidthMode;
  customWidthPercent?: number;
  layoutSettings?: BannerLayoutSettings;
  ctaText: string;
  destinationUrl: string;
  secondaryCtaText?: string;
  secondaryDestinationUrl?: string;
  displayOrder?: number;
  priority: number;
  status?: BannerStatus;
  startsAt?: string | null;
  endsAt?: string | null;
  isPublished: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type HomepageLayoutSection = HomepageLayoutSectionConfig;

export interface HomepageLayoutRecord {
  id: string;
  key: string;
  name: string;
  pageType: string;
  layoutVersion: number;
  status: 'draft' | 'published';
  publishedAt?: string | null;
  draftSections: HomepageLayoutSection[];
  publishedSections: HomepageLayoutSection[];
  updatedAt?: string;
}

export interface PromotionalAdData {
  id: string;
  _id?: string;
  title: string;
  altText: string;
  imageUrl: string;
  mobileImageUrl?: string;
  cloudinaryPublicId?: string;
  destinationUrl: string;
  placement: 'homepage_mid' | 'homepage_bottom' | 'category_sidebar' | 'product_detail' | 'promo_section';
  priority?: number;
  impressions?: number;
  clicks?: number;
  isEnabled: boolean;
  isPublished: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface FaqItem {
  id: string;
  _id?: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isPublished: boolean;
}

export interface BlogPostItem {
  id: string;
  _id?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl?: string;
  authorName: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  createdAt?: string;
}

export interface CmsStaticPageItem {
  id: string;
  _id?: string;
  slug: string;
  title: string;
  content: string;
  isPublished: boolean;
  seoTitle?: string;
  seoDescription?: string;
  updatedAt?: string;
}

export interface CouponItem {
  id: string;
  _id?: string;
  code: string;
  description?: string;
  discountType: 'fixed' | 'percentage';
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
  usageLimit?: number | null;
  perCustomerLimit?: number | null;
  usedCount: number;
  eligibleCategoryIds?: string[];
  eligibleProductIds?: string[];
}

export interface DiscountRuleItem {
  id: string;
  name: string;
  description?: string;
  ruleType: 'percentage' | 'fixed' | 'bulk';
  value: number;
  minQty: number;
  minSpend: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

export interface PromotionalCampaignItem {
  id: string;
  title: string;
  subtitle?: string;
  campaignType: 'flash_sale' | 'special_offer' | 'seasonal';
  discountLabel: string;
  badgeText?: string;
  bannerImageUrl?: string;
  ctaUrl: string;
  productIds: string[];
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

export interface ProductAttributePresetItem {
  id: string;
  _id?: string;
  name: string;
  code: string;
  description?: string;
  group: string;
  groupId?: string | null;
  groupName?: string;
  inputType?: AttributeInputType;
  unit?: string;
  scope?: AttributeScope;
  categoryIds?: string[];
  values: string[];
  options?: AttributeOptionItem[];
  defaultValue?: unknown;
  validationRules?: AttributeValidationRules;
  sortOrder?: number;
  isRequired?: boolean;
  isVisibleToCustomers?: boolean;
  showOnProductDetails?: boolean;
  isFilterable?: boolean;
  isSearchable?: boolean;
  isComparable?: boolean;
  isActive: boolean;
  usageCount?: number;
}

export interface InventoryMovementRecord {
  id: string;
  productId: string;
  variantId?: string | null;
  sku: string;
  productName: string;
  type: 'adjustment' | 'sale' | 'release' | 'return';
  delta: number;
  previousStockOnHand: number;
  newStockOnHand: number;
  previousReserved: number;
  newReserved: number;
  reason: string;
  referenceId?: string;
  actorName: string;
  createdAt: string;
}

export interface ReturnRequestRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  reason: string;
  status: 'requested' | 'approved' | 'rejected' | 'received' | 'refunded';
  refundAmount: number;
  restockEligible?: boolean;
  restocked?: boolean;
  inspectionNotes?: string;
  items: Array<{ productId: string; sku: string; name: string; quantity: number }>;
  createdAt: string;
}

export interface PaymentRefundRecord {
  refundId: string;
  gatewayRefundId?: string;
  amount: number;
  reason: string;
  status: 'pending' | 'completed' | 'failed';
  requestedBy?: string | null;
  requestedByName?: string;
  createdAt: string;
  completedAt?: string | null;
}

export interface PaymentWebhookEventRecord {
  eventId: string;
  source: string;
  status: string;
  receivedAt: string;
  verified: boolean;
  error?: string;
}

export interface PaymentTransactionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  userId?: string | null;
  customerName?: string;
  customerEmail?: string;
  provider: string;
  gateway?: string;
  paymentMethod?: 'cod' | 'sslcommerz' | 'bkash' | 'nagad' | 'card';
  transactionId: string;
  gatewayPaymentId?: string;
  gatewayTransactionId?: string;
  gatewayValidationId?: string;
  bankTransactionId?: string;
  amount: number;
  requestedAmount?: number;
  verifiedAmount?: number | null;
  currency?: string;
  refundedAmount?: number;
  status: PaymentStatus;
  failureReason?: string;
  reconciledAt?: string | null;
  reconciliationAttempts?: number;
  initiatedAt?: string;
  authorizedAt?: string | null;
  paidAt?: string | null;
  verifiedAt?: string | null;
  failedAt?: string | null;
  cancelledAt?: string | null;
  expiresAt?: string | null;
  refunds?: PaymentRefundRecord[];
  webhookEvents?: PaymentWebhookEventRecord[];
  createdAt: string;
}

export interface PaymentGatewayCapabilities {
  cod: { configured: boolean; mode: 'offline' };
  bkash: { configured: boolean; mode: 'sandbox' | 'production' };
  nagad: { configured: boolean; mode: 'sandbox' | 'production' };
  sslcommerz: { configured: boolean; mode: 'sandbox' | 'production' };
  card: { configured: boolean; mode: 'sandbox' | 'production' };
  anyOnline: boolean;
}

export interface CustomerGroupRecord {
  id: string;
  name: string;
  slug: string;
  description?: string;
  discountPercent: number;
  minOrders: number;
  isActive: boolean;
}

export interface AdminUserStats {
  totalUsers: number;
  totalCustomers: number;
  newToday: number;
  newThisWeek: number;
  newThisMonth: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  activeUsers: number;
  disabledUsers: number;
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: RoleName;
  isVerified: boolean;
  status: 'active' | 'suspended';
  authProvider?: 'local' | 'google' | 'facebook';
  customerGroupId?: string | { _id: string; name: string; discountPercent?: number } | null;
  notes?: string;
  createdAt: string;
  lastLoginAt?: string | null;
  orderCount: number;
  totalSpent: number;
}

export interface StaffMemberRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: RoleName;
  status: 'active' | 'suspended';
  customPermissions: string[];
  lastLoginAt?: string | null;
  createdAt: string;
}

export interface SupportEnquiryRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  orderNumber?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  internalNotes?: Array<{ note: string; actorName: string; timestamp: string }>;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorName: string;
  actorEmail?: string;
  actorRole?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  summary: string;
  createdAt: string;
}

export interface SystemLogRecord {
  id: string;
  level: 'info' | 'warn' | 'error';
  source: string;
  message: string;
  meta?: Record<string, unknown>;
  createdAt: string;
}

export interface WalletTransactionItem {
  id: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  description: string;
  referenceId?: string;
  balanceAfter: number;
  createdAt: string;
}

export interface AccountDashboardData {
  stats: {
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    wishlistCount: number;
    reviewsCount: number;
    addressesCount: number;
    walletBalance: number;
    activeCouponsCount: number;
  };
  recentOrders: OrderRecord[];
}

export interface WishlistAnalyticsData {
  totalWishlistUsers: number;
  totalWishlistedItems: number;
  avgItemsPerWishlist: number;
  topWishlistedProducts: Array<{
    productId: string;
    name: string;
    slug: string;
    sku: string;
    imageUrl: string;
    currentPrice: number;
    availableStock: number;
    wishlistCount: number;
  }>;
}



