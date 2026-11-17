export type NavigationMenuType = 'link' | 'dropdown' | 'mega_menu';
export type NavigationAlignment = 'left' | 'center' | 'right' | 'full_width';
export type NavigationWidthMode = 'auto' | 'md' | 'lg' | 'xl' | 'full';
export type NavigationImageFit = 'cover' | 'contain';
export type NavigationFocalPoint = 'center' | 'top' | 'bottom' | 'left' | 'right';

export interface NavigationItemVisibility {
  showIcon: boolean;
  showDescription: boolean;
  desktopVisible: boolean;
  mobileVisible: boolean;
}

export interface NavigationItemConfig {
  id: string;
  label: string;
  slug: string;
  url: string;
  icon?: string;
  description?: string;
  target: '_self' | '_blank';
  badgeText?: string;
  isActive: boolean;
  displayOrder: number;
  visibilitySettings: NavigationItemVisibility;
}

export interface NavigationGroupConfig {
  id: string;
  title: string;
  slug: string;
  url?: string;
  icon?: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  items: NavigationItemConfig[];
}

export interface NavigationPromotionConfig {
  id: string;
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

export interface NavigationSlideConfig {
  id: string;
  imageUrl: string;
  cloudinaryPublicId?: string;
  altText: string;
  title?: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonUrl?: string;
  target: '_self' | '_blank';
  focalPoint: NavigationFocalPoint;
  objectFit: NavigationImageFit;
  isActive: boolean;
  displayOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NavigationSliderSettings {
  autoplay: boolean;
  intervalMs: number;
  pauseOnHover: boolean;
  showIndicators: boolean;
  showArrows: boolean;
  transitionDurationMs: number;
  aspectRatio: '16/10' | '4/3' | '16/9' | 'square';
}

export interface NavigationMenuSettings {
  desktopVisible: boolean;
  mobileVisible: boolean;
  alignment: NavigationAlignment;
  menuWidth: NavigationWidthMode;
  maxHeightPx: number;
  columns: number; // 0 = auto
  showIcons: boolean;
  showDescriptions: boolean;
  showPromotions: boolean;
  showSlider: boolean;
  sliderSettings: NavigationSliderSettings;
}

export interface NavigationMenuConfig {
  id: string;
  name: string;
  slug: string;
  label: string;
  type: NavigationMenuType;
  url: string;
  openInNewTab: boolean;
  icon?: string;
  badgeText?: string;
  isActive: boolean;
  isPublished: boolean;
  displayOrder: number;
  startsAt?: string | null;
  endsAt?: string | null;
  groups: NavigationGroupConfig[];
  promotions: NavigationPromotionConfig[];
  slides: NavigationSlideConfig[];
  settings: NavigationMenuSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface NavigationOverviewStats {
  totalMenus: number;
  activeMenus: number;
  inactiveMenus: number;
  publishedMenus: number;
  totalDropdownLinks: number;
  totalSlides: number;
  activeSlides: number;
  publishedPromoContent: number;
}

export interface MegaMenuGeometryInput {
  triggerRect: { left: number; right: number; top: number; bottom: number; width: number };
  viewportWidth: number;
  viewportHeight: number;
  menuWidth: NavigationWidthMode;
  alignment: NavigationAlignment;
  adminMaxHeightPx: number;
  configuredColumns: number;
  groupCount: number;
  hasPromoSidebar: boolean;
}

export interface MegaMenuGeometryResult {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
  effectiveColumns: number;
}

export const DEFAULT_SLIDER_SETTINGS: NavigationSliderSettings = {
  autoplay: true,
  intervalMs: 4500,
  pauseOnHover: true,
  showIndicators: true,
  showArrows: true,
  transitionDurationMs: 420,
  aspectRatio: '4/3',
};

export const DEFAULT_NAVIGATION_MENU_SETTINGS: NavigationMenuSettings = {
  desktopVisible: true,
  mobileVisible: true,
  alignment: 'left',
  menuWidth: 'xl',
  maxHeightPx: 540,
  columns: 0,
  showIcons: true,
  showDescriptions: true,
  showPromotions: true,
  showSlider: true,
  sliderSettings: { ...DEFAULT_SLIDER_SETTINGS },
};

export function slugifyNavigationSegment(input: string): string {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'menu-item';
}

export function isSafeNavigationUrl(url: string | undefined | null): boolean {
  const raw = String(url ?? '').trim();
  if (!raw) return false;
  if (raw === '#') return true;
  if (raw.startsWith('/') && !raw.startsWith('//')) return true;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeNavigationUrl(url: string | undefined | null, fallback = '/'): string {
  const raw = String(url ?? '').trim();
  return isSafeNavigationUrl(raw) ? raw : fallback;
}

export function stripUnsafeText(value: string | undefined | null, maxLen = 200): string {
  return String(value ?? '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function isNavigationWithinSchedule(
  startsAt?: string | Date | null,
  endsAt?: string | Date | null,
  now = new Date(),
): boolean {
  const nowMs = now.getTime();
  if (startsAt) {
    const startMs = new Date(startsAt).getTime();
    if (!Number.isNaN(startMs) && startMs > nowMs) return false;
  }
  if (endsAt) {
    const endMs = new Date(endsAt).getTime();
    if (!Number.isNaN(endMs) && endMs < nowMs) return false;
  }
  return true;
}

export function normalizeNavigationMenu(raw: Partial<NavigationMenuConfig> & { _id?: unknown }): NavigationMenuConfig {
  const s = raw.settings || ({} as Partial<NavigationMenuSettings>);
  const ss = s.sliderSettings || ({} as Partial<NavigationSliderSettings>);

  const groups: NavigationGroupConfig[] = Array.isArray(raw.groups)
    ? raw.groups
        .map((g, gIdx) => ({
          id: String(g.id || (g as { _id?: unknown })._id || `grp-${gIdx}`),
          title: stripUnsafeText(g.title, 80) || 'Group',
          slug: slugifyNavigationSegment(g.slug || g.title || `group-${gIdx}`),
          url: g.url ? sanitizeNavigationUrl(g.url, '') : '',
          icon: stripUnsafeText(g.icon, 50),
          description: stripUnsafeText(g.description, 160),
          isActive: g.isActive !== false,
          displayOrder: Number.isFinite(Number(g.displayOrder)) ? Number(g.displayOrder) : gIdx,
          items: Array.isArray(g.items)
            ? g.items
                .map((it, iIdx) => ({
                  id: String(it.id || (it as { _id?: unknown })._id || `item-${gIdx}-${iIdx}`),
                  label: stripUnsafeText(it.label, 80) || 'Link',
                  slug: slugifyNavigationSegment(it.slug || it.label || `link-${iIdx}`),
                  url: sanitizeNavigationUrl(it.url, '/shop'),
                  icon: stripUnsafeText(it.icon, 50),
                  description: stripUnsafeText(it.description, 160),
                  target: (it.target === '_blank' ? '_blank' : '_self') as '_self' | '_blank',
                  badgeText: stripUnsafeText(it.badgeText, 24),
                  isActive: it.isActive !== false,
                  displayOrder: Number.isFinite(Number(it.displayOrder)) ? Number(it.displayOrder) : iIdx,
                  visibilitySettings: {
                    showIcon: it.visibilitySettings?.showIcon !== false,
                    showDescription: it.visibilitySettings?.showDescription !== false,
                    desktopVisible: it.visibilitySettings?.desktopVisible !== false,
                    mobileVisible: it.visibilitySettings?.mobileVisible !== false,
                  },
                }))
                .sort((a, b) => a.displayOrder - b.displayOrder)
            : [],
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  const promotions: NavigationPromotionConfig[] = Array.isArray(raw.promotions)
    ? raw.promotions
        .map((p, pIdx) => ({
          id: String(p.id || (p as { _id?: unknown })._id || `promo-${pIdx}`),
          title: stripUnsafeText(p.title, 100),
          subtitle: stripUnsafeText(p.subtitle, 180),
          badgeText: stripUnsafeText(p.badgeText, 30),
          imageUrl: p.imageUrl ? sanitizeNavigationUrl(p.imageUrl, '') : '',
          cloudinaryPublicId: p.cloudinaryPublicId || '',
          altText: stripUnsafeText(p.altText || p.title, 140),
          ctaText: stripUnsafeText(p.ctaText, 40),
          ctaUrl: p.ctaUrl ? sanitizeNavigationUrl(p.ctaUrl, '/shop') : '/shop',
          theme: (['royal-blue', 'ice-blue', 'midnight-navy'].includes(String(p.theme))
            ? p.theme
            : 'royal-blue') as NavigationPromotionConfig['theme'],
          isActive: p.isActive !== false,
          displayOrder: Number.isFinite(Number(p.displayOrder)) ? Number(p.displayOrder) : pIdx,
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  const slides: NavigationSlideConfig[] = Array.isArray(raw.slides)
    ? raw.slides
        .map((sl, sIdx) => ({
          id: String(sl.id || (sl as { _id?: unknown })._id || `slide-${sIdx}`),
          imageUrl: sanitizeNavigationUrl(sl.imageUrl, ''),
          cloudinaryPublicId: sl.cloudinaryPublicId || '',
          altText: stripUnsafeText(sl.altText || sl.title || 'Promotional slide', 160),
          title: stripUnsafeText(sl.title, 120),
          subtitle: stripUnsafeText(sl.subtitle, 120),
          description: stripUnsafeText(sl.description, 240),
          buttonText: stripUnsafeText(sl.buttonText, 40),
          buttonUrl: sl.buttonUrl ? sanitizeNavigationUrl(sl.buttonUrl, '') : '',
          target: (sl.target === '_blank' ? '_blank' : '_self') as '_self' | '_blank',
          focalPoint: (['center', 'top', 'bottom', 'left', 'right'].includes(String(sl.focalPoint))
            ? sl.focalPoint
            : 'center') as NavigationFocalPoint,
          objectFit: (sl.objectFit === 'contain' ? 'contain' : 'cover') as NavigationImageFit,
          isActive: sl.isActive !== false,
          displayOrder: Number.isFinite(Number(sl.displayOrder)) ? Number(sl.displayOrder) : sIdx,
          createdAt: sl.createdAt,
          updatedAt: sl.updatedAt,
        }))
        .sort((a, b) => a.displayOrder - b.displayOrder)
    : [];

  return {
    id: String(raw.id || raw._id || ''),
    name: stripUnsafeText(raw.name || raw.label, 80) || 'Untitled Menu',
    slug: slugifyNavigationSegment(raw.slug || raw.label || raw.name || 'menu'),
    label: stripUnsafeText(raw.label || raw.name, 60) || 'Menu',
    type: (['link', 'dropdown', 'mega_menu'].includes(String(raw.type))
      ? raw.type
      : groups.length > 0 || slides.length > 0 || promotions.length > 0
        ? 'mega_menu'
        : 'link') as NavigationMenuType,
    url: sanitizeNavigationUrl(raw.url, '/shop'),
    openInNewTab: Boolean(raw.openInNewTab),
    icon: stripUnsafeText(raw.icon, 50),
    badgeText: stripUnsafeText(raw.badgeText, 24),
    isActive: raw.isActive !== false,
    isPublished: raw.isPublished !== false,
    displayOrder: Number.isFinite(Number(raw.displayOrder)) ? Number(raw.displayOrder) : 0,
    startsAt: raw.startsAt ?? null,
    endsAt: raw.endsAt ?? null,
    groups,
    promotions,
    slides,
    settings: {
      desktopVisible: s.desktopVisible !== false,
      mobileVisible: s.mobileVisible !== false,
      alignment: (['left', 'center', 'right', 'full_width'].includes(String(s.alignment))
        ? s.alignment
        : 'left') as NavigationAlignment,
      menuWidth: (['auto', 'md', 'lg', 'xl', 'full'].includes(String(s.menuWidth))
        ? s.menuWidth
        : 'xl') as NavigationWidthMode,
      maxHeightPx: Math.min(760, Math.max(240, Number(s.maxHeightPx || 540))),
      columns: Math.min(5, Math.max(0, Number(s.columns ?? 0))),
      showIcons: s.showIcons !== false,
      showDescriptions: s.showDescriptions !== false,
      showPromotions: s.showPromotions !== false,
      showSlider: s.showSlider !== false,
      sliderSettings: {
        autoplay: ss.autoplay !== false,
        intervalMs: Math.min(20000, Math.max(1500, Number(ss.intervalMs || 4500))),
        pauseOnHover: ss.pauseOnHover !== false,
        showIndicators: ss.showIndicators !== false,
        showArrows: ss.showArrows !== false,
        transitionDurationMs: Math.min(1000, Math.max(150, Number(ss.transitionDurationMs || 420))),
        aspectRatio: (['16/10', '4/3', '16/9', 'square'].includes(String(ss.aspectRatio))
          ? ss.aspectRatio
          : '4/3') as NavigationSliderSettings['aspectRatio'],
      },
    },
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

/**
 * Filters a list of menus for public storefront consumption:
 * - Only active, published, within schedule window
 * - Filters groups, items, promotions, slides to active-only
 * - Respects desktop vs mobile visibility flags
 */
export function filterStorefrontMenus(
  menus: NavigationMenuConfig[],
  options: { now?: Date; viewport?: 'desktop' | 'mobile' } = {},
): NavigationMenuConfig[] {
  const now = options.now ?? new Date();
  const viewport = options.viewport;

  return menus
    .map((m) => normalizeNavigationMenu(m))
    .filter((m) => m.isActive && m.isPublished && isNavigationWithinSchedule(m.startsAt, m.endsAt, now))
    .filter((m) => {
      if (viewport === 'desktop') return m.settings.desktopVisible;
      if (viewport === 'mobile') return m.settings.mobileVisible;
      return true;
    })
    .map((m) => {
      const activeGroups = m.groups
        .filter((g) => g.isActive)
        .map((g) => ({
          ...g,
          items: g.items
            .filter((it) => it.isActive)
            .filter((it) => {
              if (viewport === 'desktop') return it.visibilitySettings.desktopVisible;
              if (viewport === 'mobile') return it.visibilitySettings.mobileVisible;
              return true;
            })
            .sort((a, b) => a.displayOrder - b.displayOrder),
        }))
        .filter((g) => g.items.length > 0 || Boolean(g.url))
        .sort((a, b) => a.displayOrder - b.displayOrder);

      const activePromotions = m.settings.showPromotions
        ? m.promotions.filter((p) => p.isActive && (p.title || p.imageUrl)).sort((a, b) => a.displayOrder - b.displayOrder)
        : [];

      const activeSlides = m.settings.showSlider
        ? m.slides.filter((sl) => sl.isActive && Boolean(sl.imageUrl)).sort((a, b) => a.displayOrder - b.displayOrder)
        : [];

      return {
        ...m,
        groups: activeGroups,
        promotions: activePromotions,
        slides: activeSlides,
      };
    })
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * Calculates optimal Mega Menu position, width, clamped max-height, and column count
 * so dropdowns never clip or overflow the viewport regardless of item count (e.g. 50+ items).
 */
export function computeMegaMenuGeometry(input: MegaMenuGeometryInput): MegaMenuGeometryResult {
  const edgePadding = 16;
  const maxContainerWidth = Math.max(320, input.viewportWidth - edgePadding * 2);

  const widthPresets: Record<NavigationWidthMode, number> = {
    auto: input.hasPromoSidebar ? 780 : 520,
    md: 680,
    lg: 920,
    xl: 1160,
    full: 1348,
  };

  let desiredWidth =
    input.alignment === 'full_width'
      ? maxContainerWidth
      : Math.min(widthPresets[input.menuWidth] ?? 1160, maxContainerWidth);

  if (input.menuWidth === 'auto' && input.groupCount <= 1 && !input.hasPromoSidebar) {
    desiredWidth = Math.min(340, maxContainerWidth);
  }

  let left = edgePadding;
  if (input.alignment === 'full_width' || desiredWidth >= maxContainerWidth) {
    left = edgePadding;
    desiredWidth = Math.min(desiredWidth, maxContainerWidth);
  } else if (input.alignment === 'center') {
    const triggerCenter = input.triggerRect.left + input.triggerRect.width / 2;
    left = triggerCenter - desiredWidth / 2;
  } else if (input.alignment === 'right') {
    left = input.triggerRect.right - desiredWidth;
  } else {
    left = input.triggerRect.left;
  }

  // Clamp horizontal edges so the menu never bleeds off left or right viewport boundaries
  if (left + desiredWidth > input.viewportWidth - edgePadding) {
    left = input.viewportWidth - edgePadding - desiredWidth;
  }
  if (left < edgePadding) {
    left = edgePadding;
  }

  const top = Math.max(8, Math.round(input.triggerRect.bottom + 4));
  const availableBelow = Math.max(220, input.viewportHeight - top - 20);
  const maxHeight = Math.max(220, Math.min(input.adminMaxHeightPx || 540, availableBelow));

  // Auto-adapt columns based on active groups & width
  let effectiveColumns = input.configuredColumns;
  if (!effectiveColumns || effectiveColumns <= 0) {
    const safeGroups = Math.max(1, input.groupCount);
    if (desiredWidth >= 960) {
      effectiveColumns = Math.min(4, safeGroups);
    } else if (desiredWidth >= 680) {
      effectiveColumns = Math.min(3, safeGroups);
    } else {
      effectiveColumns = Math.min(2, safeGroups);
    }
  } else {
    effectiveColumns = Math.min(effectiveColumns, Math.max(1, input.groupCount));
  }

  return {
    top,
    left: Math.round(left),
    width: Math.round(desiredWidth),
    maxHeight: Math.round(maxHeight),
    effectiveColumns,
  };
}

export function computeNextSlideIndex(
  currentIndex: number,
  totalSlides: number,
  direction: 'next' | 'prev',
): number {
  if (totalSlides <= 0) return 0;
  const normalized = ((currentIndex % totalSlides) + totalSlides) % totalSlides;
  if (direction === 'next') {
    return (normalized + 1) % totalSlides;
  }
  return (normalized - 1 + totalSlides) % totalSlides;
}

export function computeNavigationOverviewStats(menus: NavigationMenuConfig[]): NavigationOverviewStats {
  let activeMenus = 0;
  let inactiveMenus = 0;
  let publishedMenus = 0;
  let totalDropdownLinks = 0;
  let totalSlides = 0;
  let activeSlides = 0;
  let publishedPromoContent = 0;

  for (const menu of menus) {
    if (menu.isActive) activeMenus += 1;
    else inactiveMenus += 1;
    if (menu.isPublished && menu.isActive) publishedMenus += 1;

    for (const grp of menu.groups || []) {
      totalDropdownLinks += (grp.items || []).length;
    }

    const slides = menu.slides || [];
    totalSlides += slides.length;
    const enabledSlides = slides.filter((s) => s.isActive).length;
    activeSlides += enabledSlides;

    const enabledPromos = (menu.promotions || []).filter((p) => p.isActive).length;
    if (menu.isActive && menu.isPublished) {
      publishedPromoContent += enabledSlides + enabledPromos;
    }
  }

  return {
    totalMenus: menus.length,
    activeMenus,
    inactiveMenus,
    publishedMenus,
    totalDropdownLinks,
    totalSlides,
    activeSlides,
    publishedPromoContent,
  };
}
