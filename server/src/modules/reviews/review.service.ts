import { ReviewModel } from './review.model';
import { ProductModel } from '../products/product.model';
import { AppError } from '../../middleware/error.middleware';

export async function recomputeProductRating(productId: unknown) {
  const agg = await ReviewModel.aggregate([
    { $match: { productId, status: 'approved' } },
    { $group: { _id: '$productId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = agg[0]?.avg ? Number(agg[0].avg.toFixed(2)) : 0;
  const count = agg[0]?.count ? Number(agg[0].count) : 0;
  await ProductModel.updateOne({ _id: productId }, { $set: { ratingAverage: avg, reviewCount: count } });
}

export async function listReviewsAdmin(params: { status?: string; rating?: number; q?: string }) {
  const filter: Record<string, unknown> = {};
  if (params.status) filter.status = params.status;
  if (params.rating) filter.rating = params.rating;
  if (params.q) {
    const regex = new RegExp(params.q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ userName: regex }, { title: regex }, { comment: regex }];
  }
  const reviews = await ReviewModel.find(filter)
    .populate('productId', 'name slug sku images')
    .sort({ createdAt: -1 })
    .limit(120)
    .lean();
  return reviews.map((r) => ({ ...r, id: String(r._id) }));
}

export async function getReviewByIdAdmin(id: string) {
  const review = await ReviewModel.findById(id).populate('productId', 'name slug sku images').lean();
  if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
  return { ...review, id: String(review._id) };
}

export async function moderateReviewAdmin(params: {
  id: string;
  status: 'approved' | 'rejected';
  reason?: string;
  actorId: unknown;
}) {
  const review = await ReviewModel.findById(params.id);
  if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found.');

  review.status = params.status;
  review.moderationReason = params.reason;
  review.moderatedBy = params.actorId as typeof review.moderatedBy;
  review.moderatedAt = new Date();
  await review.save();

  await recomputeProductRating(review.productId);
  return { ...review.toObject(), id: String(review._id) };
}

export async function setReviewFeaturedAdmin(id: string, isFeatured: boolean) {
  const review = await ReviewModel.findById(id);
  if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
  review.isFeatured = isFeatured;
  await review.save();
  return { ...review.toObject(), id: String(review._id) };
}

export async function deleteReviewAdmin(id: string) {
  const review = await ReviewModel.findById(id);
  if (!review) throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review not found.');
  const productId = review.productId;
  await review.deleteOne();
  await recomputeProductRating(productId);
  return { id };
}
