export type BannerBackgroundType = 'solid' | 'gradient' | 'image' | 'gradient_image' | 'image_overlay';

export type BannerWidthMode = 'full' | 'half' | 'one_third' | 'two_thirds' | 'custom';

export type BannerStatus = 'draft' | 'published' | 'scheduled' | 'inactive';

export type BannerHeightMode = 'auto' | 'small' | 'medium' | 'large' | 'custom';

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

export interface GradientStop {
  color: string;
  position: number;
}

export interface GradientConfig {
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
  opacity: number;
}

export interface ImageSettings {
  objectFit: 'cover' | 'contain' | 'fill' | 'auto';
  position: string;
  focalPoint: { x: number; y: number };
  repeat: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  opacity: number;
}

export interface OverlaySettings {
  type: 'none' | 'solid' | 'gradient';
  color: string;
  secondaryColor: string;
  direction: string;
  opacity: number;
}

export interface ContentSettings {
  horizontalAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  tabletHorizontalAlign: 'left' | 'center' | 'right';
  mobileHorizontalAlign: 'left' | 'center' | 'right';
  contentWidth: string;
  maxWidthPx: number;
  paddingX: number;
  paddingY: number;
  elementSpacing: number;
  heightMode?: BannerHeightMode;
  minHeightPx: number;
  tabletMinHeightPx?: number;
  mobileMinHeightPx: number;
}

export interface TypographySettings {
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
}

export interface BannerButtonConfig {
  text: string;
  url: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  borderRadius: number;
  size: 'sm' | 'md' | 'lg';
  paddingX: number;
  paddingY: number;
  fontSize: number;
  fontWeight: number;
  hoverBgColor: string;
  hoverTextColor: string;
  hoverAnimation: 'none' | 'lift' | 'scale' | 'slide';
  align: 'left' | 'center' | 'right';
  style: 'solid' | 'outline' | 'ghost';
}

export interface StyleSettings {
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
}

export interface BannerLayoutSettings {
  desktopCols: number;
  tabletCols: number;
  mobileCols: number;
  columnGap: number;
  rowGap: number;
  customSlotKey: string;
  visibleOnDesktop: boolean;
  visibleOnTablet: boolean;
  visibleOnMobile: boolean;
}

export interface DynamicBannerConfig {
  id?: string;
  name: string;
  slug: string;
  title: string;
  highlightedTitle: string;
  eyebrow: string;
  promoLabel: string;
  subtitle: string;
  description: string;
  caption: string;
  desktopImageUrl: string;
  mobileImageUrl: string;
  cloudinaryPublicId: string;
  backgroundType: BannerBackgroundType;
  backgroundColor: string;
  backgroundOpacity: number;
  gradientConfig: GradientConfig;
  imageSettings: ImageSettings;
  overlaySettings: OverlaySettings;
  contentSettings: ContentSettings;
  typographySettings: TypographySettings;
  ctaText: string;
  destinationUrl: string;
  secondaryCtaText: string;
  secondaryDestinationUrl: string;
  buttonSettings: {
    primary: BannerButtonConfig;
    secondary: BannerButtonConfig;
  };
  styleSettings: StyleSettings;
  placement: BannerPlacement;
  theme: 'royal-blue' | 'ice-blue' | 'midnight-navy';
  widthMode: BannerWidthMode;
  customWidthPercent: number;
  layoutSettings: BannerLayoutSettings;
  displayOrder: number;
  priority: number;
  status: BannerStatus;
  isPublished: boolean;
  startsAt: string | null;
  endsAt: string | null;
  updatedAt?: string;
  createdAt?: string;
}

export const BANNER_PLACEMENT_OPTIONS: Array<{ value: BannerPlacement; label: string; group: string }> = [
  { value: 'homepage_hero', label: 'Homepage Hero Section', group: 'Hero Area' },
  { value: 'hero_bento', label: 'Hero Bento Cards', group: 'Hero Area' },
  { value: 'above_hero', label: 'Above Hero Slider', group: 'Hero Area' },
  { value: 'below_hero', label: 'Below Hero Slider', group: 'Hero Area' },
  { value: 'above_categories', label: 'Above Categories', group: 'Categories' },
  { value: 'below_categories', label: 'Below Categories', group: 'Categories' },
  { value: 'above_featured', label: 'Above Featured Products', group: 'Products' },
  { value: 'below_featured', label: 'Below Featured Products', group: 'Products' },
  { value: 'above_bestsellers', label: 'Above Best Sellers', group: 'Products' },
  { value: 'below_bestsellers', label: 'Below Best Sellers', group: 'Products' },
  { value: 'between_sections', label: 'Between Product Sections', group: 'Products' },
  { value: 'homepage_mid', label: 'Homepage Mid', group: 'Storefront' },
  { value: 'homepage_bottom', label: 'Homepage Bottom', group: 'Storefront' },
  { value: 'promotional_section', label: 'Promotional Section', group: 'Storefront' },
  { value: 'promo_strip', label: 'Promo Strip', group: 'Storefront' },
  { value: 'category_top', label: 'Category Page Top', group: 'Category' },
  { value: 'wishlist_bottom', label: 'Wishlist Page Bottom Promo', group: 'Storefront' },
  { value: 'custom', label: 'Custom Homepage Placement', group: 'Custom' },
];

export const GRADIENT_PRESETS: Array<{
  name: string;
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
}> = [
  {
    name: 'Novara Ocean',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#145CFF', position: 0 },
      { color: '#0A2DFF', position: 100 },
    ],
  },
  {
    name: 'Ice Horizon',
    type: 'linear',
    angle: 120,
    stops: [
      { color: '#EAF1FF', position: 0 },
      { color: '#CFE0FF', position: 100 },
    ],
  },
  {
    name: 'Midnight Navy',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#071B3A', position: 0 },
      { color: '#113B84', position: 100 },
    ],
  },
  {
    name: 'Emerald Tech',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#064E3B', position: 0 },
      { color: '#0D9488', position: 100 },
    ],
  },
  {
    name: 'Sunset Coral',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#F97316', position: 0 },
      { color: '#E11D48', position: 100 },
    ],
  },
  {
    name: 'Royal Champagne',
    type: 'linear',
    angle: 135,
    stops: [
      { color: '#111827', position: 0 },
      { color: '#374151', position: 55 },
      { color: '#B45309', position: 100 },
    ],
  },
];

export interface BannerDesignPreset {
  key: string;
  label: string;
  description: string;
  backgroundType: BannerBackgroundType;
  backgroundColor: string;
  gradientConfig: GradientConfig;
  overlaySettings: OverlaySettings;
  typographySettings: Partial<TypographySettings>;
  primaryButton: Partial<BannerButtonConfig>;
  styleSettings: Partial<StyleSettings>;
}

export const BANNER_DESIGN_PRESETS: BannerDesignPreset[] = [
  {
    key: 'modern_blue',
    label: 'Modern Blue',
    description: 'Clean ice-to-sky surface with royal blue highlight',
    backgroundType: 'gradient_image',
    backgroundColor: '#EAF1FF',
    gradientConfig: {
      type: 'linear',
      angle: 120,
      stops: [
        { color: '#E7F0FF', position: 0 },
        { color: '#CFE1FF', position: 100 },
      ],
      opacity: 90,
    },
    overlaySettings: { type: 'gradient', color: '#E7F0FF', secondaryColor: '#FFFFFF', direction: 'to right', opacity: 35 },
    typographySettings: { titleColor: '#0A1F44', highlightColor: '#145CFF', subtitleColor: '#475569', descriptionColor: '#475569' },
    primaryButton: { bgColor: '#145CFF', textColor: '#FFFFFF', borderColor: '#145CFF', hoverBgColor: '#0E47D9', hoverTextColor: '#FFFFFF', style: 'solid' },
    styleSettings: { borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#DCE6F7', boxShadow: 'sm' },
  },
  {
    key: 'luxury_dark',
    label: 'Luxury Dark',
    description: 'Deep obsidian canvas with crisp light typography',
    backgroundType: 'gradient',
    backgroundColor: '#0B1120',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#090E1A', position: 0 },
        { color: '#1E293B', position: 100 },
      ],
      opacity: 100,
    },
    overlaySettings: { type: 'solid', color: '#090E1A', secondaryColor: '#1E293B', direction: 'to right', opacity: 45 },
    typographySettings: { titleColor: '#FFFFFF', highlightColor: '#60A5FA', subtitleColor: '#CBD5E1', descriptionColor: '#94A3B8' },
    primaryButton: { bgColor: '#FFFFFF', textColor: '#0B1120', borderColor: '#FFFFFF', hoverBgColor: '#E2E8F0', hoverTextColor: '#0B1120', style: 'solid' },
    styleSettings: { borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#1E293B', boxShadow: 'lg' },
  },
  {
    key: 'minimal_white',
    label: 'Minimal White',
    description: 'Airy editorial white card with hairline frame',
    backgroundType: 'solid',
    backgroundColor: '#FFFFFF',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#FFFFFF', position: 0 },
        { color: '#F8FAFC', position: 100 },
      ],
      opacity: 100,
    },
    overlaySettings: { type: 'none', color: '#FFFFFF', secondaryColor: '#F8FAFC', direction: 'to right', opacity: 0 },
    typographySettings: { titleColor: '#0F172A', highlightColor: '#145CFF', subtitleColor: '#475569', descriptionColor: '#64748B' },
    primaryButton: { bgColor: '#0F172A', textColor: '#FFFFFF', borderColor: '#0F172A', hoverBgColor: '#1E293B', hoverTextColor: '#FFFFFF', style: 'solid' },
    styleSettings: { borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#E2E8F0', boxShadow: 'sm' },
  },
  {
    key: 'premium_gradient',
    label: 'Premium Gradient',
    description: 'Vibrant royal-to-cobalt gradient showcase',
    backgroundType: 'gradient',
    backgroundColor: '#145CFF',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#145CFF', position: 0 },
        { color: '#0A2DFF', position: 100 },
      ],
      opacity: 100,
    },
    overlaySettings: { type: 'gradient', color: '#0A1F44', secondaryColor: '#145CFF', direction: 'to right', opacity: 35 },
    typographySettings: { titleColor: '#FFFFFF', highlightColor: '#93C5FD', subtitleColor: '#E0EAFF', descriptionColor: '#DBEAFE' },
    primaryButton: { bgColor: '#FFFFFF', textColor: '#0A1F44', borderColor: '#FFFFFF', hoverBgColor: '#EFF6FF', hoverTextColor: '#145CFF', style: 'solid' },
    styleSettings: { borderRadius: 18, borderWidth: 0, borderStyle: 'none', borderColor: '#145CFF', boxShadow: 'md' },
  },
  {
    key: 'black_gold',
    label: 'Elegant Black & Gold',
    description: 'High-contrast charcoal with warm amber gold',
    backgroundType: 'gradient',
    backgroundColor: '#111111',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#111111', position: 0 },
        { color: '#272014', position: 100 },
      ],
      opacity: 100,
    },
    overlaySettings: { type: 'solid', color: '#0D0B07', secondaryColor: '#272014', direction: 'to right', opacity: 50 },
    typographySettings: { titleColor: '#FAF7F0', highlightColor: '#F59E0B', subtitleColor: '#D6D3D1', descriptionColor: '#A8A29E' },
    primaryButton: { bgColor: '#F59E0B', textColor: '#111111', borderColor: '#F59E0B', hoverBgColor: '#D97706', hoverTextColor: '#111111', style: 'solid' },
    styleSettings: { borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#44403C', boxShadow: 'lg' },
  },
  {
    key: 'technology_blue',
    label: 'Technology Blue',
    description: 'Deep navy enterprise hardware backdrop',
    backgroundType: 'gradient_image',
    backgroundColor: '#071B3A',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#071B3A', position: 0 },
        { color: '#145CFF', position: 100 },
      ],
      opacity: 95,
    },
    overlaySettings: { type: 'gradient', color: '#071B3A', secondaryColor: '#145CFF', direction: 'to right', opacity: 55 },
    typographySettings: { titleColor: '#FFFFFF', highlightColor: '#60A5FA', subtitleColor: '#DBEAFE', descriptionColor: '#BFDBFE' },
    primaryButton: { bgColor: '#145CFF', textColor: '#FFFFFF', borderColor: '#60A5FA', hoverBgColor: '#0E47D9', hoverTextColor: '#FFFFFF', style: 'solid' },
    styleSettings: { borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#1E3A8A', boxShadow: 'md' },
  },
  {
    key: 'fashion_editorial',
    label: 'Fashion Editorial',
    description: 'Warm neutral stone editorial lookbook card',
    backgroundType: 'solid',
    backgroundColor: '#F5F3EF',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#F5F3EF', position: 0 },
        { color: '#EAE5DC', position: 100 },
      ],
      opacity: 100,
    },
    overlaySettings: { type: 'solid', color: '#1C1917', secondaryColor: '#44403C', direction: 'to right', opacity: 25 },
    typographySettings: { titleColor: '#1C1917', highlightColor: '#9A3412', subtitleColor: '#57534E', descriptionColor: '#78716C' },
    primaryButton: { bgColor: '#1C1917', textColor: '#FAF9F6', borderColor: '#1C1917', hoverBgColor: '#44403C', hoverTextColor: '#FFFFFF', style: 'solid' },
    styleSettings: { borderRadius: 12, borderWidth: 1, borderStyle: 'solid', borderColor: '#E7E5E4', boxShadow: 'none' },
  },
  {
    key: 'minimal_ecommerce',
    label: 'Minimal Ecommerce',
    description: 'Cool soft slate retail promotion surface',
    backgroundType: 'solid',
    backgroundColor: '#F4F7FF',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#F4F7FF', position: 0 },
        { color: '#E9F0FE', position: 100 },
      ],
      opacity: 100,
    },
    overlaySettings: { type: 'none', color: '#0A1F44', secondaryColor: '#145CFF', direction: 'to right', opacity: 0 },
    typographySettings: { titleColor: '#0F1D3A', highlightColor: '#145CFF', subtitleColor: '#475569', descriptionColor: '#64748B' },
    primaryButton: { bgColor: '#145CFF', textColor: '#FFFFFF', borderColor: '#145CFF', hoverBgColor: '#0E47D9', hoverTextColor: '#FFFFFF', style: 'solid' },
    styleSettings: { borderRadius: 16, borderWidth: 1, borderStyle: 'solid', borderColor: '#E4EAF5', boxShadow: 'sm' },
  },
];

export function createDefaultDynamicBanner(overrides: Partial<DynamicBannerConfig> = {}): DynamicBannerConfig {
  return {
    name: '',
    slug: '',
    title: 'Smart Technology',
    highlightedTitle: 'Better Life',
    eyebrow: 'Featured Collection',
    promoLabel: '',
    subtitle: 'Discover the latest gadgets and upgrade your lifestyle with NOVARA.',
    description: '',
    caption: '',
    desktopImageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
    mobileImageUrl: '',
    cloudinaryPublicId: '',
    backgroundType: 'gradient_image',
    backgroundColor: '#EAF1FF',
    backgroundOpacity: 95,
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#E8F0FF', position: 0 },
        { color: '#CFE0FF', position: 100 },
      ],
      opacity: 90,
    },
    imageSettings: {
      objectFit: 'cover',
      position: 'center center',
      focalPoint: { x: 50, y: 50 },
      repeat: 'no-repeat',
      opacity: 85,
    },
    overlaySettings: {
      type: 'gradient',
      color: '#F4F8FF',
      secondaryColor: '#FFFFFF',
      direction: 'to right',
      opacity: 82,
    },
    contentSettings: {
      horizontalAlign: 'left',
      verticalAlign: 'middle',
      tabletHorizontalAlign: 'left',
      mobileHorizontalAlign: 'left',
      contentWidth: '58%',
      maxWidthPx: 540,
      paddingX: 32,
      paddingY: 32,
      elementSpacing: 12,
      heightMode: 'medium',
      minHeightPx: 260,
      tabletMinHeightPx: 230,
      mobileMinHeightPx: 200,
    },
    typographySettings: {
      titleFontFamily: 'Outfit',
      subtitleFontFamily: 'Plus Jakarta Sans',
      titleFontSize: 36,
      subtitleFontSize: 15,
      descriptionFontSize: 13,
      titleFontWeight: 800,
      subtitleFontWeight: 500,
      lineHeight: 1.15,
      letterSpacing: -0.02,
      textAlign: 'left',
      textTransform: 'none',
      titleColor: '#0A1F44',
      highlightColor: '#145CFF',
      subtitleColor: '#334155',
      descriptionColor: '#475569',
      textShadow: 'none',
    },
    ctaText: 'Shop Now',
    destinationUrl: '/shop',
    secondaryCtaText: '',
    secondaryDestinationUrl: '/offers',
    buttonSettings: {
      primary: {
        text: 'Shop Now',
        url: '/shop',
        bgColor: '#145CFF',
        textColor: '#FFFFFF',
        borderColor: '#145CFF',
        borderRadius: 999,
        size: 'md',
        paddingX: 22,
        paddingY: 10,
        fontSize: 13,
        fontWeight: 600,
        hoverBgColor: '#0E47D9',
        hoverTextColor: '#FFFFFF',
        hoverAnimation: 'lift',
        align: 'left',
        style: 'solid',
      },
      secondary: {
        text: '',
        url: '/offers',
        bgColor: 'transparent',
        textColor: '#0A1F44',
        borderColor: '#CBD5E1',
        borderRadius: 999,
        size: 'md',
        paddingX: 18,
        paddingY: 10,
        fontSize: 13,
        fontWeight: 600,
        hoverBgColor: '#F1F5F9',
        hoverTextColor: '#0A1F44',
        hoverAnimation: 'none',
        align: 'left',
        style: 'outline',
      },
    },
    styleSettings: {
      presetKey: 'modern_blue',
      borderRadius: 16,
      borderWidth: 1,
      borderStyle: 'solid',
      borderColor: '#DCE6F7',
      boxShadow: 'sm',
      animation: 'none',
      hoverEffect: 'lift',
      decorativeBadge: true,
      decorativeGlow: false,
    },
    placement: 'hero_bento',
    theme: 'royal-blue',
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: {
      desktopCols: 1,
      tabletCols: 1,
      mobileCols: 1,
      columnGap: 16,
      rowGap: 16,
      customSlotKey: '',
      visibleOnDesktop: true,
      visibleOnTablet: true,
      visibleOnMobile: true,
    },
    displayOrder: 1,
    priority: 10,
    status: 'published',
    isPublished: true,
    startsAt: null,
    endsAt: null,
    ...overrides,
  };
}

export function hexToRgba(hex: string, opacityPercent: number): string {
  const clean = (hex || '#145CFF').replace('#', '').trim();
  const alpha = Math.max(0, Math.min(1, Number(opacityPercent ?? 100) / 100));
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    if ([r, g, b].some(Number.isNaN)) return `rgba(20, 92, 255, ${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return `rgba(20, 92, 255, ${alpha})`;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return `rgba(20, 92, 255, ${alpha})`;
}

export function buildGradientCss(gradient: GradientConfig): string {
  const stops = (gradient.stops && gradient.stops.length >= 2
    ? gradient.stops
    : [
        { color: '#145CFF', position: 0 },
        { color: '#0A2DFF', position: 100 },
      ]
  )
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((s) => `${hexToRgba(s.color, gradient.opacity ?? 100)} ${Math.max(0, Math.min(100, s.position))}%`)
    .join(', ');

  if (gradient.type === 'radial') {
    return `radial-gradient(circle at center, ${stops})`;
  }
  const angle = Number.isFinite(gradient.angle) ? gradient.angle : 135;
  return `linear-gradient(${angle}deg, ${stops})`;
}

export function buildOverlayCss(overlay: OverlaySettings): string {
  if (!overlay || overlay.type === 'none' || overlay.opacity <= 0) {
    return 'none';
  }
  if (overlay.type === 'solid') {
    const rgba = hexToRgba(overlay.color || '#0A1F44', overlay.opacity);
    return `linear-gradient(180deg, ${rgba} 0%, ${rgba} 100%)`;
  }
  const dir = overlay.direction || 'to right';
  const c1 = hexToRgba(overlay.color || '#0A1F44', overlay.opacity);
  const cMid = hexToRgba(overlay.color || '#0A1F44', overlay.opacity * 0.68);
  const c2 = hexToRgba(overlay.secondaryColor || overlay.color || '#0A1F44', Math.max(0, overlay.opacity * 0.12));
  return `linear-gradient(${dir}, ${c1} 0%, ${cMid} 48%, ${c2} 100%)`;
}

export function buildBackgroundLayerStyle(banner: Partial<DynamicBannerConfig>): {
  backgroundColor?: string;
  backgroundImage?: string;
} {
  const type = banner.backgroundType || 'gradient_image';
  const bgOpacity = banner.backgroundOpacity ?? 100;
  const baseColor = hexToRgba(banner.backgroundColor || '#145CFF', bgOpacity);
  const gradient = banner.gradientConfig
    ? buildGradientCss(banner.gradientConfig)
    : 'linear-gradient(135deg, #145CFF 0%, #0A2DFF 100%)';

  if (type === 'solid') {
    return { backgroundColor: baseColor };
  }
  if (type === 'gradient') {
    return { backgroundColor: baseColor, backgroundImage: gradient };
  }
  if (type === 'gradient_image') {
    return { backgroundColor: baseColor, backgroundImage: gradient };
  }
  if (type === 'image' || type === 'image_overlay') {
    return { backgroundColor: baseColor };
  }
  return { backgroundColor: baseColor };
}

export function getBannerGridColSpanClass(widthMode?: BannerWidthMode): string {
  switch (widthMode) {
    case 'half':
      return 'md:col-span-6';
    case 'one_third':
      return 'md:col-span-4';
    case 'two_thirds':
      return 'md:col-span-8';
    case 'custom':
      return 'md:col-span-12';
    case 'full':
    default:
      return 'md:col-span-12';
  }
}

export function getWidthModeLabel(widthMode?: BannerWidthMode, customPercent?: number): string {
  switch (widthMode) {
    case 'half':
      return 'Half (50%)';
    case 'one_third':
      return '1/3 Width (33%)';
    case 'two_thirds':
      return '2/3 Width (67%)';
    case 'custom':
      return `Custom (${Math.max(10, Math.min(100, Number(customPercent || 100)))}%)`;
    case 'full':
    default:
      return 'Full (100%)';
  }
}

export function getCustomColSpanValue(customWidthPercent?: number): number {
  const pct = Math.max(10, Math.min(100, Number(customWidthPercent || 100)));
  return Math.max(1, Math.min(12, Math.round((pct / 100) * 12)));
}

export function resolveBannerHeights(content?: Partial<ContentSettings>): {
  desktop: string;
  tablet: string;
  mobile: string;
} {
  const mode = content?.heightMode;
  const customDesktop = Math.max(100, Math.min(900, Number(content?.minHeightPx || 260)));
  const customTablet = Math.max(
    100,
    Math.min(900, Number(content?.tabletMinHeightPx || Math.round(customDesktop * 0.88))),
  );
  const customMobile = Math.max(100, Math.min(800, Number(content?.mobileMinHeightPx || 200)));

  switch (mode) {
    case 'auto':
      return { desktop: 'auto', tablet: 'auto', mobile: 'auto' };
    case 'small':
      return { desktop: '160px', tablet: '150px', mobile: '140px' };
    case 'large':
      return { desktop: '380px', tablet: '320px', mobile: '260px' };
    case 'custom':
      return {
        desktop: `${customDesktop}px`,
        tablet: `${customTablet}px`,
        mobile: `${customMobile}px`,
      };
    case 'medium':
      return { desktop: '260px', tablet: '230px', mobile: '200px' };
    default:
      return {
        desktop: `${customDesktop}px`,
        tablet: `${customTablet}px`,
        mobile: `${customMobile}px`,
      };
  }
}

export function sortBannersByOrder<T extends { displayOrder?: number; priority?: number; updatedAt?: string }>(
  banners: T[],
): T[] {
  return banners.slice().sort((a, b) => {
    const orderDiff = Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0);
    if (orderDiff !== 0) return orderDiff;
    const priorityDiff = Number(b.priority ?? 0) - Number(a.priority ?? 0);
    if (priorityDiff !== 0) return priorityDiff;
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
}

export function randomizeGradientConfig(): GradientConfig {
  const palettes: Array<[string, string]> = [
    ['#145CFF', '#0A2DFF'],
    ['#071B3A', '#1E40AF'],
    ['#0F766E', '#0284C7'],
    ['#1E293B', '#4F46E5'],
    ['#9333EA', '#2563EB'],
    ['#EA580C', '#DB2777'],
    ['#065F46', '#10B981'],
    ['#111827', '#B45309'],
  ];
  const pair = palettes[Math.floor(Math.random() * palettes.length)];
  const angles = [90, 120, 135, 160, 180];
  return {
    type: 'linear',
    angle: angles[Math.floor(Math.random() * angles.length)],
    stops: [
      { color: pair[0], position: 0 },
      { color: pair[1], position: 100 },
    ],
    opacity: 100,
  };
}

export function normalizeBannerFromApi(raw: Record<string, unknown>): DynamicBannerConfig {
  const defaults = createDefaultDynamicBanner();
  const title = String(raw.title || defaults.title);
  const bgType = (raw.backgroundType as BannerBackgroundType) || (raw.desktopImageUrl ? 'image_overlay' : 'gradient');
  const legacyTheme = (raw.theme as 'royal-blue' | 'ice-blue' | 'midnight-navy') || 'royal-blue';

  const rawGradient = (raw.gradientConfig || {}) as Partial<GradientConfig>;
  const rawImg = (raw.imageSettings || {}) as Partial<ImageSettings>;
  const rawOverlay = (raw.overlaySettings || {}) as Partial<OverlaySettings>;
  const rawContent = (raw.contentSettings || {}) as Partial<ContentSettings>;
  const rawTypo = (raw.typographySettings || {}) as Partial<TypographySettings>;
  const rawBtn = (raw.buttonSettings || {}) as { primary?: Partial<BannerButtonConfig>; secondary?: Partial<BannerButtonConfig> };
  const rawStyle = (raw.styleSettings || {}) as Partial<StyleSettings>;
  const rawLayout = (raw.layoutSettings || {}) as Partial<BannerLayoutSettings>;

  const ctaText = String(raw.ctaText || rawBtn.primary?.text || defaults.ctaText);
  const destinationUrl = String(raw.destinationUrl || rawBtn.primary?.url || defaults.destinationUrl);
  const secondaryCtaText = String(raw.secondaryCtaText || rawBtn.secondary?.text || '');
  const secondaryDestinationUrl = String(raw.secondaryDestinationUrl || rawBtn.secondary?.url || '/offers');

  const statusValue: BannerStatus =
    (raw.status as BannerStatus) || (raw.isPublished === false ? 'draft' : 'published');

  return {
    ...defaults,
    id: raw.id ? String(raw.id) : raw._id ? String(raw._id) : undefined,
    name: String(raw.name || title),
    slug: String(raw.slug || ''),
    title,
    highlightedTitle: String(raw.highlightedTitle ?? ''),
    eyebrow: String(raw.eyebrow ?? ''),
    promoLabel: String(raw.promoLabel ?? ''),
    subtitle: String(raw.subtitle ?? ''),
    description: String(raw.description ?? ''),
    caption: String(raw.caption ?? ''),
    desktopImageUrl: String(raw.desktopImageUrl ?? ''),
    mobileImageUrl: String(raw.mobileImageUrl ?? ''),
    cloudinaryPublicId: String(raw.cloudinaryPublicId ?? ''),
    backgroundType: bgType,
    backgroundColor: String(raw.backgroundColor || defaults.backgroundColor),
    backgroundOpacity: Number(raw.backgroundOpacity ?? 100),
    gradientConfig: {
      ...defaults.gradientConfig,
      ...rawGradient,
      stops: Array.isArray(rawGradient.stops) && rawGradient.stops.length >= 2
        ? rawGradient.stops
        : defaults.gradientConfig.stops,
    },
    imageSettings: {
      ...defaults.imageSettings,
      ...rawImg,
      focalPoint: {
        x: Number(rawImg.focalPoint?.x ?? 50),
        y: Number(rawImg.focalPoint?.y ?? 50),
      },
    },
    overlaySettings:
      raw.overlaySettings !== undefined
        ? {
            ...defaults.overlaySettings,
            ...rawOverlay,
          }
        : bgType === 'solid' || bgType === 'gradient'
          ? {
              type: 'none',
              color: '#0A1F44',
              secondaryColor: '#FFFFFF',
              direction: 'to right',
              opacity: 0,
            }
          : defaults.overlaySettings,
    contentSettings: {
      ...defaults.contentSettings,
      ...rawContent,
      heightMode:
        (rawContent.heightMode as BannerHeightMode | undefined) ||
        (rawContent.minHeightPx !== undefined && Number(rawContent.minHeightPx) !== 260
          ? 'custom'
          : 'medium'),
      tabletMinHeightPx: Number(
        rawContent.tabletMinHeightPx ??
          Math.max(100, Math.round(Number(rawContent.minHeightPx ?? defaults.contentSettings.minHeightPx) * 0.88)),
      ),
    },
    typographySettings: {
      ...defaults.typographySettings,
      ...rawTypo,
    },
    ctaText,
    destinationUrl,
    secondaryCtaText,
    secondaryDestinationUrl,
    buttonSettings: {
      primary: {
        ...defaults.buttonSettings.primary,
        ...rawBtn.primary,
        text: ctaText,
        url: destinationUrl,
      },
      secondary: {
        ...defaults.buttonSettings.secondary,
        ...rawBtn.secondary,
        text: secondaryCtaText,
        url: secondaryDestinationUrl,
      },
    },
    styleSettings: {
      ...defaults.styleSettings,
      ...rawStyle,
    },
    placement: (raw.placement as BannerPlacement) || 'hero_bento',
    theme: legacyTheme,
    widthMode: (raw.widthMode as BannerWidthMode) || 'full',
    customWidthPercent: Number(raw.customWidthPercent ?? 100),
    layoutSettings: {
      ...defaults.layoutSettings,
      ...rawLayout,
    },
    displayOrder: Number(raw.displayOrder ?? 1),
    priority: Number(raw.priority ?? 0),
    status: statusValue,
    isPublished: raw.isPublished !== false && statusValue !== 'draft' && statusValue !== 'inactive',
    startsAt: raw.startsAt ? String(raw.startsAt) : null,
    endsAt: raw.endsAt ? String(raw.endsAt) : null,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
  };
}

export type HomepageSectionType =
  | 'hero_slider'
  | 'promo_bento'
  | 'dynamic_banner'
  | 'featured_categories'
  | 'featured_products'
  | 'best_sellers'
  | 'latest_products'
  | 'new_arrivals'
  | 'trending_products'
  | 'product_collection'
  | 'brand_showcase'
  | 'feature_banners'
  | 'promotional_ad'
  | 'custom_content'
  | 'testimonials'
  | 'newsletter';

export type ProductSourceMode =
  | 'bestsellers'
  | 'latest'
  | 'featured'
  | 'new_arrivals'
  | 'trending'
  | 'category'
  | 'brand'
  | 'manual';

export interface HomepageLayoutSectionConfig {
  sectionId: string;
  sectionType: HomepageSectionType;
  title: string;
  subtitle: string;
  enabled: boolean;
  displayOrder: number;
  widthMode: BannerWidthMode;
  customWidthPercent: number;
  layoutSettings: {
    desktopCols: number;
    tabletCols: number;
    mobileCols: number;
    paddingY: number;
    backgroundColor: string;
    backgroundGradient: string;
    contentAlign: 'left' | 'center' | 'right';
  };
  contentSettings: {
    badgeText?: string;
    bodyText?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
  sourceReferences: {
    productSourceMode: ProductSourceMode;
    productIds: string[];
    categorySlug?: string;
    brandSlug?: string;
    productCount: number;
    sortBy: 'popular' | 'newest' | 'price_asc' | 'price_desc' | 'rating';
    bannerPlacement?: BannerPlacement;
    bannerIds?: string[];
  };
  visibilitySettings: {
    desktop: boolean;
    tablet: boolean;
    mobile: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
  };
}

export const DEFAULT_HOMEPAGE_LAYOUT_SECTIONS: HomepageLayoutSectionConfig[] = [
  {
    sectionId: 'sec_hero_slider',
    sectionType: 'hero_slider',
    title: 'Hero Slider',
    subtitle: 'Primary hero campaign showcase',
    enabled: true,
    displayOrder: 0,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 1, tabletCols: 1, mobileCols: 1, paddingY: 0, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_categories',
    sectionType: 'featured_categories',
    title: 'Shop by Category',
    subtitle: 'Explore top departments',
    enabled: true,
    displayOrder: 1,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 3, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 12, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_promo_bento',
    sectionType: 'promo_bento',
    title: 'Promotional Highlights',
    subtitle: 'Curated deals and bento banners',
    enabled: true,
    displayOrder: 2,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 3, tabletCols: 2, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 3, sortBy: 'popular', bannerPlacement: 'hero_bento' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_best_sellers',
    sectionType: 'best_sellers',
    title: 'Best Sellers',
    subtitle: 'Most loved by shoppers across Bangladesh',
    enabled: true,
    displayOrder: 3,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'View All Products', ctaUrl: '/shop?sort=popular' },
    sourceReferences: { productSourceMode: 'bestsellers', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_feature_banners',
    sectionType: 'feature_banners',
    title: 'Customer Perks & Guarantees',
    subtitle: 'Gift curation and verified warranty',
    enabled: true,
    displayOrder: 4,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 2, tabletCols: 1, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 2, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_promotional_ad',
    sectionType: 'promotional_ad',
    title: 'Featured Campaign Banner',
    subtitle: 'Scheduled mid-page promotional placement',
    enabled: true,
    displayOrder: 5,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 1, tabletCols: 1, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 1, sortBy: 'popular', bannerPlacement: 'homepage_mid' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_premium_collection',
    sectionType: 'product_collection',
    title: 'Our Premium Collection',
    subtitle: 'Filterable flagship releases & exclusive editions',
    enabled: true,
    displayOrder: 6,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 10, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_featured_products',
    sectionType: 'featured_products',
    title: 'Featured Products',
    subtitle: 'Hand-picked storefront highlights',
    enabled: true,
    displayOrder: 7,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'View Featured', ctaUrl: '/shop?section=featured' },
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_new_arrivals',
    sectionType: 'new_arrivals',
    title: 'New Arrivals & Latest',
    subtitle: 'Fresh releases added to NOVARA',
    enabled: true,
    displayOrder: 8,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'Shop New Arrivals', ctaUrl: '/shop?sort=newest' },
    sourceReferences: { productSourceMode: 'new_arrivals', productIds: [], productCount: 8, sortBy: 'newest' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_trending_products',
    sectionType: 'trending_products',
    title: 'Trending Products',
    subtitle: 'High-demand picks right now',
    enabled: true,
    displayOrder: 9,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 8, tabletCols: 4, mobileCols: 2, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: { ctaLabel: 'View Trending', ctaUrl: '/shop?sort=trending' },
    sourceReferences: { productSourceMode: 'trending', productIds: [], productCount: 8, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
  {
    sectionId: 'sec_testimonials',
    sectionType: 'testimonials',
    title: 'What Our Clients Say',
    subtitle: 'Verified customer reviews across Bangladesh',
    enabled: true,
    displayOrder: 10,
    widthMode: 'full',
    customWidthPercent: 100,
    layoutSettings: { desktopCols: 3, tabletCols: 2, mobileCols: 1, paddingY: 8, backgroundColor: '', backgroundGradient: '', contentAlign: 'left' },
    contentSettings: {},
    sourceReferences: { productSourceMode: 'featured', productIds: [], productCount: 3, sortBy: 'popular' },
    visibilitySettings: { desktop: true, tablet: true, mobile: true },
  },
];

export function normalizeHomepageLayoutSections(sections: HomepageLayoutSectionConfig[]): HomepageLayoutSectionConfig[] {
  return sections
    .slice()
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0))
    .map((sec, index) => ({
      ...sec,
      displayOrder: index,
    }));
}
