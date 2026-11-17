import mongoose from 'mongoose';
import type { z } from 'zod';
import { AppError } from '../../middleware/error.middleware';
import { HomepageConfigModel } from '../cms/cms.model';
import { NavigationMenuModel, type INavigationMenu } from './navigation.model';
import {
  computeNavigationOverviewStats,
  filterStorefrontMenus,
  normalizeNavigationMenu,
  slugifyNavigationSegment,
  type NavigationMenuConfig,
} from '../../../../src/lib/navigationEngine';
import type {
  navigationGroupSchema,
  navigationItemSchema,
  navigationMenuReorderSchema,
  navigationMenuSchema,
  navigationSlideSchema,
  navigationSliderSettingsSchema,
} from './navigation.validation';

function serializeMenu(doc: Record<string, unknown> & { _id?: unknown }): NavigationMenuConfig {
  return normalizeNavigationMenu({
    ...(doc as unknown as Partial<NavigationMenuConfig>),
    id: String(doc._id || doc.id || ''),
    startsAt: doc.startsAt ? new Date(doc.startsAt as string | Date).toISOString() : null,
    endsAt: doc.endsAt ? new Date(doc.endsAt as string | Date).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt as string | Date).toISOString() : undefined,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt as string | Date).toISOString() : undefined,
  });
}

async function ensureUniqueMenuSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const cleanBase = slugifyNavigationSegment(baseSlug);
  let candidate = cleanBase;
  let counter = 1;
  while (true) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId && mongoose.isValidObjectId(excludeId)) {
      query._id = { $ne: excludeId };
    }
    const exists = await NavigationMenuModel.exists(query);
    if (!exists) return candidate;
    counter += 1;
    candidate = `${cleanBase}-${counter}`;
  }
}

/**
 * Keeps legacy HomepageConfigModel.navigationMenu synchronized with top-level published active menus
 * so any legacy storefront consumer stays consistent without duplicate configuration.
 */
async function syncLegacyHomepageNavigation(): Promise<void> {
  try {
    const now = new Date();
    const allDocs = await NavigationMenuModel.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
    const serialized = allDocs.map((d) => serializeMenu(d as unknown as Record<string, unknown>));
    const activeTopLevel = filterStorefrontMenus(serialized, { now, viewport: 'desktop' }).map((m, idx) => ({
      label: m.label,
      url: m.url,
      icon: m.icon || '',
      openInNewTab: m.openInNewTab,
      sortOrder: idx,
      isActive: true,
    }));
    await HomepageConfigModel.updateOne(
      { key: 'main' },
      { $set: { navigationMenu: activeTopLevel } },
    );
  } catch (err) {
    console.warn('[NOVARA NAV] Legacy HomepageConfig sync warning:', err);
  }
}

export async function listNavigationMenusAdmin() {
  const docs = await NavigationMenuModel.find().sort({ displayOrder: 1, createdAt: 1 }).lean();
  const menus = docs.map((d) => serializeMenu(d as unknown as Record<string, unknown>));
  const stats = computeNavigationOverviewStats(menus);
  return { menus, stats };
}

export async function getNavigationMenuByIdAdmin(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const doc = await NavigationMenuModel.findById(id).lean();
  if (!doc) {
    throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  }
  return serializeMenu(doc as unknown as Record<string, unknown>);
}

function mapMenuPayloadForDb(
  input: z.infer<typeof navigationMenuSchema>,
  resolvedSlug: string,
): Record<string, unknown> {
  return {
    name: input.name || input.label,
    slug: resolvedSlug,
    label: input.label,
    type: input.type,
    url: input.url,
    openInNewTab: Boolean(input.openInNewTab),
    icon: input.icon || '',
    badgeText: input.badgeText || '',
    isActive: input.isActive !== false,
    isPublished: input.isPublished !== false,
    displayOrder: input.displayOrder ?? 0,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    groups: (input.groups || []).map((g, gIdx) => ({
      ...(g.id && mongoose.isValidObjectId(g.id) ? { _id: new mongoose.Types.ObjectId(g.id) } : {}),
      title: g.title,
      slug: slugifyNavigationSegment(g.slug || g.title),
      url: g.url || '',
      icon: g.icon || '',
      description: g.description || '',
      isActive: g.isActive !== false,
      displayOrder: gIdx,
      items: (g.items || []).map((it, iIdx) => ({
        ...(it.id && mongoose.isValidObjectId(it.id) ? { _id: new mongoose.Types.ObjectId(it.id) } : {}),
        label: it.label,
        slug: slugifyNavigationSegment(it.slug || it.label),
        url: it.url,
        icon: it.icon || '',
        description: it.description || '',
        target: it.target === '_blank' ? '_blank' : '_self',
        badgeText: it.badgeText || '',
        isActive: it.isActive !== false,
        displayOrder: iIdx,
        visibilitySettings: {
          showIcon: it.visibilitySettings?.showIcon !== false,
          showDescription: it.visibilitySettings?.showDescription !== false,
          desktopVisible: it.visibilitySettings?.desktopVisible !== false,
          mobileVisible: it.visibilitySettings?.mobileVisible !== false,
        },
      })),
    })),
    promotions: (input.promotions || []).map((p, pIdx) => ({
      ...(p.id && mongoose.isValidObjectId(p.id) ? { _id: new mongoose.Types.ObjectId(p.id) } : {}),
      title: p.title,
      subtitle: p.subtitle || '',
      badgeText: p.badgeText || '',
      imageUrl: p.imageUrl || '',
      cloudinaryPublicId: p.cloudinaryPublicId || '',
      altText: p.altText || p.title,
      ctaText: p.ctaText || '',
      ctaUrl: p.ctaUrl || '/shop',
      theme: p.theme || 'royal-blue',
      isActive: p.isActive !== false,
      displayOrder: pIdx,
    })),
    slides: (input.slides || []).map((s, sIdx) => ({
      ...(s.id && mongoose.isValidObjectId(s.id) ? { _id: new mongoose.Types.ObjectId(s.id) } : {}),
      imageUrl: s.imageUrl,
      cloudinaryPublicId: s.cloudinaryPublicId || '',
      altText: s.altText,
      title: s.title || '',
      subtitle: s.subtitle || '',
      description: s.description || '',
      buttonText: s.buttonText || '',
      buttonUrl: s.buttonUrl || '',
      target: s.target === '_blank' ? '_blank' : '_self',
      focalPoint: s.focalPoint || 'center',
      objectFit: s.objectFit || 'cover',
      isActive: s.isActive !== false,
      displayOrder: sIdx,
    })),
    settings: input.settings,
  };
}

export async function createNavigationMenuAdmin(input: z.infer<typeof navigationMenuSchema>) {
  const count = await NavigationMenuModel.countDocuments();
  const slug = await ensureUniqueMenuSlug(input.slug || input.label || input.name);
  const payload = mapMenuPayloadForDb(
    { ...input, displayOrder: input.displayOrder ?? count },
    slug,
  );
  const created = await NavigationMenuModel.create(payload);
  await syncLegacyHomepageNavigation();
  return serializeMenu(created.toObject() as unknown as Record<string, unknown>);
}

export async function updateNavigationMenuAdmin(id: string, input: z.infer<typeof navigationMenuSchema>) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const existing = await NavigationMenuModel.findById(id);
  if (!existing) {
    throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  }
  const slug = await ensureUniqueMenuSlug(input.slug || existing.slug || input.label, id);
  const payload = mapMenuPayloadForDb(input, slug);
  const updated = await NavigationMenuModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
  await syncLegacyHomepageNavigation();
  return serializeMenu((updated as INavigationMenu).toObject() as unknown as Record<string, unknown>);
}

export async function updateNavigationMenuPublishStateAdmin(
  id: string,
  patch: { isPublished?: boolean; isActive?: boolean },
) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const updates: Record<string, unknown> = {};
  if (typeof patch.isPublished === 'boolean') updates.isPublished = patch.isPublished;
  if (typeof patch.isActive === 'boolean') updates.isActive = patch.isActive;
  const updated = await NavigationMenuModel.findByIdAndUpdate(id, { $set: updates }, { new: true });
  if (!updated) {
    throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  }
  await syncLegacyHomepageNavigation();
  return serializeMenu((updated as INavigationMenu).toObject() as unknown as Record<string, unknown>);
}

export async function duplicateNavigationMenuAdmin(id: string) {
  const source = await getNavigationMenuByIdAdmin(id);
  const count = await NavigationMenuModel.countDocuments();
  const slug = await ensureUniqueMenuSlug(`${source.slug}-copy`);
  const created = await NavigationMenuModel.create({
    ...source,
    id: undefined,
    _id: undefined,
    name: `${source.name} (Copy)`,
    label: `${source.label} Copy`,
    slug,
    isPublished: false,
    displayOrder: count,
    groups: source.groups.map((g) => ({
      ...g,
      id: undefined,
      items: g.items.map((it) => ({ ...it, id: undefined })),
    })),
    promotions: source.promotions.map((p) => ({ ...p, id: undefined })),
    slides: source.slides.map((s) => ({ ...s, id: undefined })),
  });
  return serializeMenu(created.toObject() as unknown as Record<string, unknown>);
}

export async function deleteNavigationMenuAdmin(id: string) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const deleted = await NavigationMenuModel.findByIdAndDelete(id);
  if (!deleted) {
    throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  }
  await syncLegacyHomepageNavigation();
  return { deleted: true, id };
}

export async function reorderNavigationMenusAdmin(input: z.infer<typeof navigationMenuReorderSchema>) {
  const ops = input.items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { displayOrder: item.displayOrder } },
    },
  }));
  if (ops.length > 0) {
    await NavigationMenuModel.bulkWrite(ops);
  }
  await syncLegacyHomepageNavigation();
  return listNavigationMenusAdmin();
}

export async function addMenuGroupAdmin(menuId: string, groupInput: z.infer<typeof navigationGroupSchema>) {
  if (!mongoose.isValidObjectId(menuId)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const menu = await NavigationMenuModel.findById(menuId);
  if (!menu) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  menu.groups.push({
    title: groupInput.title,
    slug: slugifyNavigationSegment(groupInput.slug || groupInput.title),
    url: groupInput.url || '',
    icon: groupInput.icon || '',
    description: groupInput.description || '',
    isActive: groupInput.isActive !== false,
    displayOrder: menu.groups.length,
    items: [],
  });
  await menu.save();
  return serializeMenu(menu.toObject() as unknown as Record<string, unknown>);
}

export async function addDropdownItemAdmin(
  menuId: string,
  groupId: string,
  itemInput: z.infer<typeof navigationItemSchema>,
) {
  if (!mongoose.isValidObjectId(menuId)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const menu = await NavigationMenuModel.findById(menuId);
  if (!menu) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  const grp = menu.groups.find((g: { _id?: unknown }) => String(g._id) === groupId);
  if (!grp) throw new AppError(404, 'GROUP_NOT_FOUND', 'Navigation group not found.');
  grp.items.push({
    label: itemInput.label,
    slug: slugifyNavigationSegment(itemInput.slug || itemInput.label),
    url: itemInput.url,
    icon: itemInput.icon || '',
    description: itemInput.description || '',
    target: itemInput.target === '_blank' ? '_blank' : '_self',
    badgeText: itemInput.badgeText || '',
    isActive: itemInput.isActive !== false,
    displayOrder: grp.items.length,
    visibilitySettings: itemInput.visibilitySettings,
  });
  await menu.save();
  return serializeMenu(menu.toObject() as unknown as Record<string, unknown>);
}

export async function deleteDropdownItemAdmin(menuId: string, groupId: string, itemId: string) {
  if (!mongoose.isValidObjectId(menuId)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const menu = await NavigationMenuModel.findById(menuId);
  if (!menu) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  const grp = menu.groups.find((g: { _id?: unknown }) => String(g._id) === groupId);
  if (!grp) throw new AppError(404, 'GROUP_NOT_FOUND', 'Navigation group not found.');
  grp.items = grp.items.filter((it: { _id?: unknown }) => String(it._id) !== itemId);
  await menu.save();
  return serializeMenu(menu.toObject() as unknown as Record<string, unknown>);
}

export async function addMenuSlideAdmin(menuId: string, slideInput: z.infer<typeof navigationSlideSchema>) {
  if (!mongoose.isValidObjectId(menuId)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const menu = await NavigationMenuModel.findById(menuId);
  if (!menu) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  menu.slides.push({
    ...slideInput,
    displayOrder: menu.slides.length,
  });
  await menu.save();
  return serializeMenu(menu.toObject() as unknown as Record<string, unknown>);
}

export async function updateMenuSlideAdmin(
  menuId: string,
  slideId: string,
  slideInput: z.infer<typeof navigationSlideSchema>,
) {
  if (!mongoose.isValidObjectId(menuId)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const menu = await NavigationMenuModel.findById(menuId);
  if (!menu) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  const slide = menu.slides.find((s: { _id?: unknown }) => String(s._id) === slideId);
  if (!slide) throw new AppError(404, 'SLIDE_NOT_FOUND', 'Promotional slide not found.');
  Object.assign(slide, slideInput);
  await menu.save();
  return serializeMenu(menu.toObject() as unknown as Record<string, unknown>);
}

export async function deleteMenuSlideAdmin(menuId: string, slideId: string) {
  if (!mongoose.isValidObjectId(menuId)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const menu = await NavigationMenuModel.findById(menuId);
  if (!menu) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  menu.slides = menu.slides
    .filter((s: { _id?: unknown }) => String(s._id) !== slideId)
    .map((s: { displayOrder: number }, idx: number) => ({ ...s, displayOrder: idx }));
  await menu.save();
  return serializeMenu(menu.toObject() as unknown as Record<string, unknown>);
}

export async function updateMenuSliderSettingsAdmin(
  menuId: string,
  sliderSettings: z.infer<typeof navigationSliderSettingsSchema>,
) {
  if (!mongoose.isValidObjectId(menuId)) {
    throw new AppError(400, 'INVALID_MENU_ID', 'Invalid navigation menu ID.');
  }
  const updated = await NavigationMenuModel.findByIdAndUpdate(
    menuId,
    { $set: { 'settings.sliderSettings': sliderSettings } },
    { new: true },
  );
  if (!updated) throw new AppError(404, 'MENU_NOT_FOUND', 'Navigation menu not found.');
  return serializeMenu((updated as INavigationMenu).toObject() as unknown as Record<string, unknown>);
}

export async function getPublicStorefrontMegaMenus(): Promise<NavigationMenuConfig[]> {
  const docs = await NavigationMenuModel.find({ isActive: true, isPublished: true })
    .sort({ displayOrder: 1, createdAt: 1 })
    .lean();
  const serialized = docs.map((d) => serializeMenu(d as unknown as Record<string, unknown>));
  return filterStorefrontMenus(serialized);
}

export const DEFAULT_SEED_NAVIGATION_MENUS: Array<Record<string, unknown>> = [
  {
    name: 'Home',
    slug: 'home',
    label: 'Home',
    type: 'link',
    url: '/',
    icon: 'Home',
    isActive: true,
    isPublished: true,
    displayOrder: 0,
    groups: [],
    promotions: [],
    slides: [],
    settings: {
      desktopVisible: true,
      mobileVisible: true,
      alignment: 'left',
      menuWidth: 'auto',
      maxHeightPx: 520,
      columns: 0,
      showIcons: true,
      showDescriptions: false,
      showPromotions: false,
      showSlider: false,
      sliderSettings: {
        autoplay: true,
        intervalMs: 4500,
        pauseOnHover: true,
        showIndicators: true,
        showArrows: true,
        transitionDurationMs: 420,
        aspectRatio: '4/3',
      },
    },
  },
  {
    name: 'Shop',
    slug: 'shop',
    label: 'Shop',
    type: 'mega_menu',
    url: '/shop',
    icon: 'Store',
    isActive: true,
    isPublished: true,
    displayOrder: 1,
    groups: [
      {
        title: 'Storefront Collections',
        slug: 'storefront-collections',
        icon: 'Sparkles',
        isActive: true,
        displayOrder: 0,
        items: [
          { label: 'All Products', slug: 'all-products', url: '/shop', icon: 'ShoppingBag', description: 'Browse full verified catalog', target: '_self', isActive: true, displayOrder: 0 },
          { label: 'Best Sellers', slug: 'best-sellers', url: '/shop?sort=popular', icon: 'Flame', description: 'Most ordered items across BD', target: '_self', badgeText: 'HOT', isActive: true, displayOrder: 1 },
          { label: 'New Arrivals', slug: 'new-arrivals', url: '/shop?sort=newest', icon: 'Zap', description: 'Latest releases and drops', target: '_self', badgeText: 'NEW', isActive: true, displayOrder: 2 },
          { label: 'Discounted Deals', slug: 'discounted-deals', url: '/shop?discount=true', icon: 'Tag', description: 'Verified savings & markdowns', target: '_self', isActive: true, displayOrder: 3 },
        ],
      },
      {
        title: 'Top Departments',
        slug: 'top-departments',
        icon: 'LayoutGrid',
        isActive: true,
        displayOrder: 1,
        items: [
          { label: 'Mobiles & Tablets', slug: 'mobiles-tablets', url: '/category/mobiles-tablets', icon: 'Smartphone', description: '5G smartphones & tablets', target: '_self', isActive: true, displayOrder: 0 },
          { label: 'Laptops & Computers', slug: 'laptops-computers', url: '/category/laptops-computers', icon: 'Laptop', description: 'Ultrabooks & workstations', target: '_self', isActive: true, displayOrder: 1 },
          { label: 'Fashion & Lifestyle', slug: 'fashion-lifestyle', url: '/category/fashion-lifestyle', icon: 'Shirt', description: 'Apparel & everyday essentials', target: '_self', isActive: true, displayOrder: 2 },
          { label: 'Books & Education', slug: 'books-education', url: '/category/books-education', icon: 'BookOpen', description: 'Bestsellers & study guides', target: '_self', isActive: true, displayOrder: 3 },
        ],
      },
    ],
    promotions: [
      {
        title: 'Nationwide Free Delivery',
        subtitle: 'Complimentary courier on orders over ৳999',
        badgeText: 'FREE SHIPPING',
        ctaText: 'Explore Offers',
        ctaUrl: '/offers',
        theme: 'ice-blue',
        isActive: true,
        displayOrder: 0,
      },
    ],
    slides: [
      {
        imageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
        altText: 'Smart Technology Collection at NOVARA',
        title: 'Smart Tech Upgrade',
        subtitle: 'Flagship Series 2026',
        description: 'Official warranty electronics delivered across all 64 districts.',
        buttonText: 'Shop Catalog',
        buttonUrl: '/shop',
        target: '_self',
        focalPoint: 'center',
        objectFit: 'cover',
        isActive: true,
        displayOrder: 0,
      },
      {
        imageUrl: '/src/assets/images/promo_headphones_1794832024152.jpg',
        altText: 'Wireless Noise Cancelling Headphones Offer',
        title: 'Studio Audio Week',
        subtitle: 'Up to 30% Off',
        description: 'Reference ANC headphones and portable speakers in stock now.',
        buttonText: 'View Audio Deals',
        buttonUrl: '/category/audio-headphones',
        target: '_self',
        focalPoint: 'center',
        objectFit: 'cover',
        isActive: true,
        displayOrder: 1,
      },
    ],
    settings: {
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
      sliderSettings: {
        autoplay: true,
        intervalMs: 4500,
        pauseOnHover: true,
        showIndicators: true,
        showArrows: true,
        transitionDurationMs: 420,
        aspectRatio: '4/3',
      },
    },
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    label: 'Electronics',
    type: 'mega_menu',
    url: '/category/mobiles-tablets',
    icon: 'Cpu',
    badgeText: 'HOT',
    isActive: true,
    isPublished: true,
    displayOrder: 2,
    groups: [
      {
        title: 'Mobile & Computing',
        slug: 'mobile-computing',
        url: '/category/mobiles-tablets',
        icon: 'Smartphone',
        isActive: true,
        displayOrder: 0,
        items: [
          { label: 'Smartphones', slug: 'smartphones', url: '/category/mobiles-tablets', icon: 'Smartphone', description: 'Flagship Android & iOS devices', target: '_self', isActive: true, displayOrder: 0 },
          { label: 'Laptops', slug: 'laptops', url: '/category/laptops-computers', icon: 'Laptop', description: 'MacBook Air, ultrabooks & pro rigs', target: '_self', badgeText: 'M4', isActive: true, displayOrder: 1 },
          { label: 'Desktop Computers', slug: 'desktop-computers', url: '/category/laptops-computers', icon: 'Monitor', description: 'Creator & workstation desktops', target: '_self', isActive: true, displayOrder: 2 },
          { label: 'Tablets', slug: 'tablets', url: '/category/mobiles-tablets', icon: 'Tablet', description: 'Productivity & drawing slates', target: '_self', isActive: true, displayOrder: 3 },
        ],
      },
      {
        title: 'Wearables & Audio',
        slug: 'wearables-audio',
        url: '/category/audio-headphones',
        icon: 'Headphones',
        isActive: true,
        displayOrder: 1,
        items: [
          { label: 'Smart Watches', slug: 'smart-watches', url: '/category/smart-watches', icon: 'Watch', description: 'Fitness, ECG & AMOLED watches', target: '_self', isActive: true, displayOrder: 0 },
          { label: 'Headphones', slug: 'headphones', url: '/category/audio-headphones', icon: 'Headphones', description: 'Wireless ANC & studio gear', target: '_self', isActive: true, displayOrder: 1 },
          { label: 'Cameras & Drones', slug: 'cameras-drones', url: '/category/cameras-drones', icon: 'Camera', description: 'Mirrorless cameras & gimbals', target: '_self', isActive: true, displayOrder: 2 },
          { label: 'Gaming & Consoles', slug: 'gaming-consoles', url: '/category/gaming-consoles', icon: 'Gamepad2', description: 'Consoles, controllers & peripherals', target: '_self', isActive: true, displayOrder: 3 },
        ],
      },
      {
        title: 'Smart Accessories',
        slug: 'smart-accessories',
        url: '/shop?q=anker',
        icon: 'Zap',
        isActive: true,
        displayOrder: 2,
        items: [
          { label: 'GaN Chargers & Hubs', slug: 'gan-chargers', url: '/shop?q=charger', icon: 'Zap', description: 'Fast PD power adapters', target: '_self', isActive: true, displayOrder: 0 },
          { label: 'Power Banks', slug: 'power-banks', url: '/shop?q=power', icon: 'ShieldCheck', description: 'High-capacity travel charging', target: '_self', isActive: true, displayOrder: 1 },
          { label: 'Protective Cases', slug: 'protective-cases', url: '/shop?q=case', icon: 'Package', description: 'Sleeves, backpacks & armor', target: '_self', isActive: true, displayOrder: 2 },
        ],
      },
    ],
    promotions: [
      {
        title: '1-Year Official Warranty',
        subtitle: 'Genuine sealed devices with verified service coverage',
        badgeText: 'VERIFIED',
        ctaText: 'Shop Electronics',
        ctaUrl: '/category/mobiles-tablets',
        theme: 'royal-blue',
        isActive: true,
        displayOrder: 0,
      },
    ],
    slides: [
      {
        imageUrl: '/src/assets/images/product_laptop_1794832026646.jpg',
        altText: 'MacBook Air M4 Ultrabook Showcase',
        title: 'MacBook Air M4',
        subtitle: 'In Stock Across Bangladesh',
        description: '18-hour battery endurance with 16GB unified memory.',
        buttonText: 'Shop Laptops',
        buttonUrl: '/category/laptops-computers',
        target: '_self',
        focalPoint: 'center',
        objectFit: 'cover',
        isActive: true,
        displayOrder: 0,
      },
      {
        imageUrl: '/src/assets/images/product_smartphone_1794832025637.jpg',
        altText: 'Galaxy S25 Ultra Flagship Smartphone',
        title: 'Galaxy S25 Ultra',
        subtitle: 'Save up to ৳39,000',
        description: '200MP ProVisual camera & integrated Titanium S Pen.',
        buttonText: 'Shop Mobiles',
        buttonUrl: '/category/mobiles-tablets',
        target: '_self',
        focalPoint: 'center',
        objectFit: 'cover',
        isActive: true,
        displayOrder: 1,
      },
      {
        imageUrl: '/src/assets/images/promo_smartwatch_1794832026084.jpg',
        altText: 'Smart Watches & Fitness Wearables',
        title: 'Next-Gen Wearables',
        subtitle: 'Track Every Beat',
        description: 'Always-on OLED smart watches built for daily performance.',
        buttonText: 'Explore Watches',
        buttonUrl: '/category/smart-watches',
        target: '_self',
        focalPoint: 'center',
        objectFit: 'cover',
        isActive: true,
        displayOrder: 2,
      },
    ],
    settings: {
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
      sliderSettings: {
        autoplay: true,
        intervalMs: 4200,
        pauseOnHover: true,
        showIndicators: true,
        showArrows: true,
        transitionDurationMs: 420,
        aspectRatio: '4/3',
      },
    },
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    label: 'Fashion',
    type: 'mega_menu',
    url: '/category/fashion-lifestyle',
    icon: 'Shirt',
    isActive: true,
    isPublished: true,
    displayOrder: 3,
    groups: [
      {
        title: 'Apparel & Carry',
        slug: 'apparel-carry',
        icon: 'Shirt',
        isActive: true,
        displayOrder: 0,
        items: [
          { label: 'Apparel & Hoodies', slug: 'apparel-hoodies', url: '/category/fashion-lifestyle', icon: 'Shirt', description: 'Everyday fleece & street layers', target: '_self', isActive: true, displayOrder: 0 },
          { label: 'Bags & Wallets', slug: 'bags-wallets', url: '/category/bags-wallets', icon: 'ShoppingBag', description: 'Commuter packs & travel carry', target: '_self', isActive: true, displayOrder: 1 },
          { label: 'Shoes & Footwear', slug: 'shoes-footwear', url: '/category/shoes-footwear', icon: 'Footprints', description: 'Performance sneakers & trainers', target: '_self', isActive: true, displayOrder: 2 },
        ],
      },
      {
        title: 'Personal Care',
        slug: 'personal-care',
        icon: 'Sparkles',
        isActive: true,
        displayOrder: 1,
        items: [
          { label: 'Beauty & Skincare', slug: 'beauty-skincare', url: '/category/beauty-personal-care', icon: 'Sparkles', description: 'Curated daily grooming & care', target: '_self', isActive: true, displayOrder: 0 },
        ],
      },
    ],
    promotions: [],
    slides: [
      {
        imageUrl: '/src/assets/images/promo_sneakers_1794832025309.jpg',
        altText: 'New Season Sneakers & Streetwear',
        title: 'Lifestyle Drop',
        subtitle: 'New Season Footwear',
        description: 'Lightweight cushioned sneakers and weather-ready backpacks.',
        buttonText: 'Shop Fashion',
        buttonUrl: '/category/fashion-lifestyle',
        target: '_self',
        focalPoint: 'center',
        objectFit: 'cover',
        isActive: true,
        displayOrder: 0,
      },
    ],
    settings: {
      desktopVisible: true,
      mobileVisible: true,
      alignment: 'center',
      menuWidth: 'lg',
      maxHeightPx: 500,
      columns: 0,
      showIcons: true,
      showDescriptions: true,
      showPromotions: true,
      showSlider: true,
      sliderSettings: {
        autoplay: true,
        intervalMs: 4800,
        pauseOnHover: true,
        showIndicators: true,
        showArrows: true,
        transitionDurationMs: 420,
        aspectRatio: '4/3',
      },
    },
  },
  {
    name: 'Home & Living',
    slug: 'home-living',
    label: 'Home & Living',
    type: 'link',
    url: '/category/home-appliances',
    icon: 'Home',
    isActive: true,
    isPublished: true,
    displayOrder: 4,
    groups: [],
    promotions: [],
    slides: [],
    settings: {
      desktopVisible: true,
      mobileVisible: true,
      alignment: 'left',
      menuWidth: 'md',
      maxHeightPx: 480,
      columns: 0,
      showIcons: true,
      showDescriptions: true,
      showPromotions: false,
      showSlider: false,
      sliderSettings: {
        autoplay: true,
        intervalMs: 4500,
        pauseOnHover: true,
        showIndicators: true,
        showArrows: true,
        transitionDurationMs: 420,
        aspectRatio: '4/3',
      },
    },
  },
  {
    name: 'Books',
    slug: 'books',
    label: 'Books',
    type: 'link',
    url: '/category/books-education',
    icon: 'BookOpen',
    isActive: true,
    isPublished: true,
    displayOrder: 5,
    groups: [],
    promotions: [],
    slides: [],
    settings: {
      desktopVisible: true,
      mobileVisible: true,
      alignment: 'left',
      menuWidth: 'md',
      maxHeightPx: 480,
      columns: 0,
      showIcons: true,
      showDescriptions: true,
      showPromotions: false,
      showSlider: false,
      sliderSettings: {
        autoplay: true,
        intervalMs: 4500,
        pauseOnHover: true,
        showIndicators: true,
        showArrows: true,
        transitionDurationMs: 420,
        aspectRatio: '4/3',
      },
    },
  },
];
