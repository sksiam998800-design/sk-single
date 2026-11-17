import { BannerModel, type BannerStatus } from './banner.model';
import type { BannerInput, BannerReorderInput } from './banner.validation';
import { AppError } from '../../middleware/error.middleware';

function slugifyBannerTitle(raw: string): string {
  return (
    raw
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'banner'
  );
}

async function generateUniqueBannerSlug(preferred: string, excludeId?: string): Promise<string> {
  const base = slugifyBannerTitle(preferred);
  let candidate = base;
  let counter = 1;
  while (true) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    const exists = await BannerModel.exists(query);
    if (!exists) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`;
  }
}

function serializeBanner(doc: Record<string, unknown>) {
  const id = String(doc._id || doc.id || '');
  const status: BannerStatus =
    (doc.status as BannerStatus) || (doc.isPublished === false ? 'draft' : 'published');
  return {
    ...doc,
    id,
    name: doc.name || doc.title || 'Untitled Banner',
    status,
    isPublished: status === 'published' || (status === 'scheduled' && doc.isPublished !== false),
  };
}

function normalizeBannerPayload(input: BannerInput, userId?: string | null) {
  const effectiveBgType =
    input.backgroundType || (input.desktopImageUrl ? 'gradient_image' : 'gradient');
  const resolvedStatus: BannerStatus =
    input.status || (input.isPublished === false ? 'draft' : 'published');
  const resolvedIsPublished =
    resolvedStatus === 'published' || (resolvedStatus === 'scheduled' && input.isPublished !== false);

  const primaryBtn = {
    text: input.buttonSettings?.primary?.text || input.ctaText || 'Shop Now',
    url: input.buttonSettings?.primary?.url || input.destinationUrl || '/shop',
    bgColor: input.buttonSettings?.primary?.bgColor || '#145CFF',
    textColor: input.buttonSettings?.primary?.textColor || '#FFFFFF',
    borderColor: input.buttonSettings?.primary?.borderColor || '#145CFF',
    borderRadius: input.buttonSettings?.primary?.borderRadius ?? 999,
    size: input.buttonSettings?.primary?.size || 'md',
    paddingX: input.buttonSettings?.primary?.paddingX ?? 22,
    paddingY: input.buttonSettings?.primary?.paddingY ?? 10,
    fontSize: input.buttonSettings?.primary?.fontSize ?? 13,
    fontWeight: input.buttonSettings?.primary?.fontWeight ?? 600,
    hoverBgColor: input.buttonSettings?.primary?.hoverBgColor || '#0E47D9',
    hoverTextColor: input.buttonSettings?.primary?.hoverTextColor || '#FFFFFF',
    hoverAnimation: input.buttonSettings?.primary?.hoverAnimation || 'lift',
    align: input.buttonSettings?.primary?.align || 'left',
    style: input.buttonSettings?.primary?.style || 'solid',
  };

  const secondaryBtn = {
    text: input.buttonSettings?.secondary?.text ?? input.secondaryCtaText ?? '',
    url: input.buttonSettings?.secondary?.url || input.secondaryDestinationUrl || '/offers',
    bgColor: input.buttonSettings?.secondary?.bgColor || 'transparent',
    textColor: input.buttonSettings?.secondary?.textColor || '#0A1F44',
    borderColor: input.buttonSettings?.secondary?.borderColor || '#CBD5E1',
    borderRadius: input.buttonSettings?.secondary?.borderRadius ?? 999,
    size: input.buttonSettings?.secondary?.size || 'md',
    paddingX: input.buttonSettings?.secondary?.paddingX ?? 18,
    paddingY: input.buttonSettings?.secondary?.paddingY ?? 10,
    fontSize: input.buttonSettings?.secondary?.fontSize ?? 13,
    fontWeight: input.buttonSettings?.secondary?.fontWeight ?? 600,
    hoverBgColor: input.buttonSettings?.secondary?.hoverBgColor || '#F1F5F9',
    hoverTextColor: input.buttonSettings?.secondary?.hoverTextColor || '#0A1F44',
    hoverAnimation: input.buttonSettings?.secondary?.hoverAnimation || 'none',
    align: input.buttonSettings?.secondary?.align || 'left',
    style: input.buttonSettings?.secondary?.style || 'outline',
  };

  return {
    ...input,
    name: input.name?.trim() || input.title,
    backgroundType: effectiveBgType,
    ctaText: primaryBtn.text || input.ctaText || 'Shop Now',
    destinationUrl: primaryBtn.url || input.destinationUrl || '/shop',
    secondaryCtaText: secondaryBtn.text,
    secondaryDestinationUrl: secondaryBtn.url,
    buttonSettings: {
      primary: primaryBtn,
      secondary: secondaryBtn,
    },
    status: resolvedStatus,
    isPublished: resolvedIsPublished,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
    ...(userId ? { updatedBy: userId } : {}),
  };
}

export async function listBanners(params: {
  q?: string;
  placement?: string;
  status?: string;
  sort?: string;
}) {
  const filter: Record<string, unknown> = {};
  if (params.placement) filter.placement = params.placement;
  if (params.status) {
    if (params.status === 'published') {
      filter.$or = [{ status: 'published' }, { status: { $exists: false }, isPublished: true }];
    } else if (params.status === 'draft') {
      filter.$or = [{ status: 'draft' }, { status: { $exists: false }, isPublished: false }];
    } else {
      filter.status = params.status;
    }
  }
  if (params.q) {
    const regex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchClause = [
      { name: regex },
      { title: regex },
      { highlightedTitle: regex },
      { eyebrow: regex },
      { subtitle: regex },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or as unknown[] }, { $or: searchClause }];
      delete filter.$or;
    } else {
      filter.$or = searchClause;
    }
  }

  const sortSpec: Record<string, 1 | -1> =
    params.sort === 'newest'
      ? { createdAt: -1 }
      : params.sort === 'priority'
        ? { priority: -1, displayOrder: 1, updatedAt: -1 }
        : { displayOrder: 1, priority: -1, updatedAt: -1 };

  const banners = await BannerModel.find(filter).sort(sortSpec).lean();
  return banners.map((b) => serializeBanner(b as unknown as Record<string, unknown>));
}

export async function getBannerById(id: string) {
  const banner = await BannerModel.findById(id).lean();
  if (!banner) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found.');
  return serializeBanner(banner as unknown as Record<string, unknown>);
}

export async function createBanner(input: BannerInput, userId?: string | null) {
  const normalized = normalizeBannerPayload(input, userId);
  const slug = await generateUniqueBannerSlug(input.slug || input.name || input.title);
  const banner = await BannerModel.create({
    ...normalized,
    slug,
    createdBy: userId || null,
  });
  return serializeBanner(banner.toObject() as unknown as Record<string, unknown>);
}

export async function updateBanner(id: string, input: BannerInput, userId?: string | null) {
  const existing = await BannerModel.findById(id);
  if (!existing) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found.');
  const normalized = normalizeBannerPayload(input, userId);
  const slug = input.slug?.trim()
    ? await generateUniqueBannerSlug(input.slug, id)
    : existing.slug || (await generateUniqueBannerSlug(normalized.name || normalized.title, id));

  const updated = await BannerModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...normalized,
        slug,
      },
    },
    { new: true },
  );
  if (!updated) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found.');
  return serializeBanner(updated.toObject() as unknown as Record<string, unknown>);
}

export async function duplicateBanner(id: string, userId?: string | null) {
  const source = await BannerModel.findById(id).lean();
  if (!source) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found.');

  const sourceObj = { ...(source as unknown as Record<string, unknown>) };
  delete sourceObj._id;
  delete sourceObj.createdAt;
  delete sourceObj.updatedAt;
  delete sourceObj.__v;

  const copyName = `${String(sourceObj.name || sourceObj.title || 'Banner')} (Copy)`;
  const slug = await generateUniqueBannerSlug(`${copyName}-${Date.now().toString(36).slice(-4)}`);
  const maxOrderDoc = await BannerModel.findOne().sort({ displayOrder: -1 }).select('displayOrder').lean();
  const nextOrder = Number((maxOrderDoc as { displayOrder?: number } | null)?.displayOrder ?? 0) + 1;

  const created = await BannerModel.create({
    ...sourceObj,
    name: copyName,
    slug,
    status: 'draft',
    isPublished: false,
    displayOrder: nextOrder,
    createdBy: userId || null,
    updatedBy: userId || null,
  });
  return serializeBanner(created.toObject() as unknown as Record<string, unknown>);
}

export async function updateBannerStatus(id: string, status: BannerStatus, userId?: string | null) {
  const isPublished = status === 'published' || status === 'scheduled';
  const updated = await BannerModel.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        isPublished,
        ...(userId ? { updatedBy: userId } : {}),
      },
    },
    { new: true },
  );
  if (!updated) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found.');
  return serializeBanner(updated.toObject() as unknown as Record<string, unknown>);
}

export async function reorderBanners(input: BannerReorderInput, userId?: string | null) {
  const ops = input.items.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: {
        $set: {
          displayOrder: item.displayOrder,
          ...(userId ? { updatedBy: userId } : {}),
        },
      },
    },
  }));
  await BannerModel.bulkWrite(ops);
  const updated = await BannerModel.find({}).sort({ displayOrder: 1, priority: -1, updatedAt: -1 }).lean();
  return updated.map((b) => serializeBanner(b as unknown as Record<string, unknown>));
}

export async function deleteBanner(id: string) {
  const banner = await BannerModel.findById(id);
  if (!banner) throw new AppError(404, 'BANNER_NOT_FOUND', 'Banner not found.');
  await banner.deleteOne();
  return { id };
}
