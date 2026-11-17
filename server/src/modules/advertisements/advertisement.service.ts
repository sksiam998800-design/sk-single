import { PromotionalAdModel } from '../cms/cms.model';
import type { PromoAdInput } from './advertisement.validation';
import { AppError } from '../../middleware/error.middleware';

export async function listAdvertisements(params: { q?: string; placement?: string; status?: string }) {
  const filter: Record<string, unknown> = {};
  if (params.placement) filter.placement = params.placement;
  if (params.status === 'published') filter.isPublished = true;
  if (params.status === 'draft') filter.isPublished = false;
  if (params.q) {
    const regex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: regex }, { altText: regex }, { destinationUrl: regex }];
  }
  const ads = await PromotionalAdModel.find(filter).sort({ priority: -1, updatedAt: -1 }).lean();
  return ads.map((a) => ({ ...a, id: String(a._id) }));
}

export async function getAdvertisementById(id: string) {
  const ad = await PromotionalAdModel.findById(id).lean();
  if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Promotional placement not found.');
  return { ...ad, id: String(ad._id) };
}

export async function createAdvertisement(input: PromoAdInput) {
  const ad = await PromotionalAdModel.create({
    ...input,
    startsAt: input.startsAt ? new Date(input.startsAt) : null,
    endsAt: input.endsAt ? new Date(input.endsAt) : null,
  });
  return { ...ad.toObject(), id: String(ad._id) };
}

export async function updateAdvertisement(id: string, input: PromoAdInput) {
  const updated = await PromotionalAdModel.findByIdAndUpdate(
    id,
    {
      $set: {
        ...input,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      },
    },
    { new: true },
  );
  if (!updated) throw new AppError(404, 'AD_NOT_FOUND', 'Promotional placement not found.');
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteAdvertisement(id: string) {
  const ad = await PromotionalAdModel.findById(id);
  if (!ad) throw new AppError(404, 'AD_NOT_FOUND', 'Promotional placement not found.');
  await ad.deleteOne();
  return { id };
}
