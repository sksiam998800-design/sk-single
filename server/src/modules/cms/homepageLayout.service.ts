import { AppError } from '../../middleware/error.middleware';
import { HomepageConfigModel } from './cms.model';
import {
  DEFAULT_SERVER_HOMEPAGE_SECTIONS,
  HomepageLayoutModel,
  type IHomepageLayoutSection,
} from './homepageLayout.model';
import type {
  HomepageLayoutSectionInput,
  HomepageLayoutUpdateInput,
  HomepageSectionReorderInput,
} from './homepageLayout.validation';

function normalizeSections(sections: IHomepageLayoutSection[]): IHomepageLayoutSection[] {
  return sections
    .slice()
    .sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0))
    .map((sec, idx) => ({
      ...sec,
      displayOrder: idx,
    }));
}

async function getOrCreateMainHomepageLayout() {
  let layout = await HomepageLayoutModel.findOne({ key: 'main' });
  if (!layout) {
    layout = await HomepageLayoutModel.create({
      key: 'main',
      name: 'Main Storefront Homepage',
      pageType: 'homepage',
      layoutVersion: 1,
      status: 'published',
      publishedAt: new Date(),
      draftSections: DEFAULT_SERVER_HOMEPAGE_SECTIONS,
      publishedSections: DEFAULT_SERVER_HOMEPAGE_SECTIONS,
    });
  }
  return layout;
}

function serializeLayout(doc: ReturnType<typeof HomepageLayoutModel.hydrate> | Record<string, unknown>) {
  const plain =
    typeof (doc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
      ? (doc as { toObject: () => Record<string, unknown> }).toObject()
      : (doc as Record<string, unknown>);
  return {
    ...plain,
    id: String(plain._id || plain.id || ''),
    draftSections: normalizeSections((plain.draftSections as IHomepageLayoutSection[]) || []),
    publishedSections: normalizeSections((plain.publishedSections as IHomepageLayoutSection[]) || []),
  };
}

export async function getAdminHomepageLayout() {
  const layout = await getOrCreateMainHomepageLayout();
  return serializeLayout(layout);
}

export async function updateAdminHomepageLayoutDraft(
  input: HomepageLayoutUpdateInput,
  userId?: string | null,
) {
  const layout = await getOrCreateMainHomepageLayout();
  if (input.name) layout.name = input.name;
  layout.draftSections = normalizeSections(input.sections as unknown as IHomepageLayoutSection[]);
  layout.status = 'draft';
  if (userId) layout.updatedBy = userId;
  await layout.save();
  return serializeLayout(layout);
}

export async function addHomepageLayoutSection(
  input: HomepageLayoutSectionInput,
  userId?: string | null,
) {
  const layout = await getOrCreateMainHomepageLayout();
  const exists = layout.draftSections.some((s: IHomepageLayoutSection) => s.sectionId === input.sectionId);
  if (exists) {
    throw new AppError(409, 'DUPLICATE_SECTION_ID', `Section ID "${input.sectionId}" already exists.`);
  }
  const nextSections = normalizeSections([
    ...(layout.toObject().draftSections as IHomepageLayoutSection[]),
    {
      ...(input as unknown as IHomepageLayoutSection),
      displayOrder: layout.draftSections.length,
    },
  ]);
  layout.draftSections = nextSections;
  layout.status = 'draft';
  if (userId) layout.updatedBy = userId;
  await layout.save();
  return serializeLayout(layout);
}

export async function reorderHomepageLayoutSections(
  input: HomepageSectionReorderInput,
  userId?: string | null,
) {
  const layout = await getOrCreateMainHomepageLayout();
  const orderMap = new Map(input.order.map((item) => [item.sectionId, item.displayOrder]));
  const plainDraft = (layout.toObject().draftSections as IHomepageLayoutSection[]) || [];
  const updated = plainDraft.map((sec) => ({
    ...sec,
    displayOrder: orderMap.has(sec.sectionId) ? Number(orderMap.get(sec.sectionId)) : sec.displayOrder,
  }));
  layout.draftSections = normalizeSections(updated);
  layout.status = 'draft';
  if (userId) layout.updatedBy = userId;
  await layout.save();
  return serializeLayout(layout);
}

export async function deleteHomepageLayoutSection(sectionId: string, userId?: string | null) {
  const layout = await getOrCreateMainHomepageLayout();
  const plainDraft = (layout.toObject().draftSections as IHomepageLayoutSection[]) || [];
  const next = plainDraft.filter((sec) => sec.sectionId !== sectionId);
  if (next.length === plainDraft.length) {
    throw new AppError(404, 'SECTION_NOT_FOUND', 'Homepage section not found.');
  }
  layout.draftSections = normalizeSections(next);
  layout.status = 'draft';
  if (userId) layout.updatedBy = userId;
  await layout.save();
  return serializeLayout(layout);
}

const SECTION_TYPE_TO_LEGACY_KEY: Record<string, string> = {
  hero_slider: 'hero',
  featured_categories: 'categories',
  promo_bento: 'promoBento',
  best_sellers: 'bestSellers',
  feature_banners: 'featureBanners',
  promotional_ad: 'promotionalAd',
  product_collection: 'premiumCollection',
  featured_products: 'featuredProducts',
  new_arrivals: 'newArrivals',
  trending_products: 'trendingProducts',
  testimonials: 'testimonials',
  newsletter: 'newsletter',
};

export async function publishHomepageLayout(userId?: string | null) {
  const layout = await getOrCreateMainHomepageLayout();
  const normalizedDraft = normalizeSections(
    (layout.toObject().draftSections as IHomepageLayoutSection[]) || [],
  );
  layout.draftSections = normalizedDraft;
  layout.publishedSections = normalizedDraft;
  layout.status = 'published';
  layout.layoutVersion = Number(layout.layoutVersion || 0) + 1;
  layout.publishedAt = new Date();
  if (userId) layout.updatedBy = userId;
  await layout.save();

  // Keep HomepageConfigModel sectionOrder & enabledSections synchronized for backward compatibility
  const sectionOrder: string[] = [];
  const enabledSectionsPatch: Record<string, boolean> = {};
  for (const sec of normalizedDraft) {
    const legacyKey = SECTION_TYPE_TO_LEGACY_KEY[sec.sectionType];
    if (legacyKey) {
      if (!sectionOrder.includes(legacyKey)) sectionOrder.push(legacyKey);
      enabledSectionsPatch[legacyKey] = Boolean(sec.enabled);
      if (legacyKey === 'testimonials') enabledSectionsPatch.reviews = Boolean(sec.enabled);
    }
  }
  if (sectionOrder.length > 0) {
    await HomepageConfigModel.findOneAndUpdate(
      { key: 'main' },
      {
        $set: {
          sectionOrder,
          ...Object.fromEntries(
            Object.entries(enabledSectionsPatch).map(([k, v]) => [`enabledSections.${k}`, v]),
          ),
        },
      },
      { upsert: true },
    );
  }

  return serializeLayout(layout);
}
