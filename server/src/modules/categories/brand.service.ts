import { BrandModel } from './category.model';
import { ProductModel } from '../products/product.model';
import { AppError } from '../../middleware/error.middleware';
import { deleteCloudinaryAsset } from '../../services/cloudinary.service';
import type { BrandInput } from './brand.validation';

export async function listBrandsAdmin() {
  const [brands, productCounts] = await Promise.all([
    BrandModel.find().sort({ name: 1 }).lean(),
    ProductModel.aggregate([{ $match: { brandId: { $ne: null } } }, { $group: { _id: '$brandId', count: { $sum: 1 } } }]),
  ]);
  const countMap = new Map(productCounts.map((row) => [String(row._id), Number(row.count || 0)]));
  return brands.map((b) => ({
    ...b,
    id: String(b._id),
    productCount: countMap.get(String(b._id)) || 0,
  }));
}

export async function getBrandById(id: string) {
  const brand = await BrandModel.findById(id).lean();
  if (!brand) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found.');
  const products = await ProductModel.find({ brandId: brand._id })
    .select('name sku slug basePrice salePrice stockOnHand reservedStock status images')
    .limit(20)
    .lean();
  return {
    brand: { ...brand, id: String(brand._id), productCount: products.length },
    products: products.map((p) => ({ ...p, id: String(p._id) })),
  };
}

function escapeRegExp(val: string): string {
  return val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createBrand(input: BrandInput) {
  const duplicate = await BrandModel.findOne({
    $or: [
      { slug: input.slug },
      { name: new RegExp(`^${escapeRegExp(input.name.trim())}$`, 'i') },
    ],
  }).lean();
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_BRAND', `Brand "${input.name}" or slug "${input.slug}" already exists.`);
  }
  const brand = await BrandModel.create(input);
  return { ...brand.toObject(), id: String(brand._id) };
}

export async function updateBrand(id: string, input: BrandInput) {
  const duplicate = await BrandModel.findOne({
    _id: { $ne: id },
    $or: [
      { slug: input.slug },
      { name: new RegExp(`^${escapeRegExp(input.name.trim())}$`, 'i') },
    ],
  }).lean();
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_BRAND', `Brand "${input.name}" or slug "${input.slug}" already exists.`);
  }

  const existing = await BrandModel.findById(id).lean();
  if (!existing) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found.');

  const updated = await BrandModel.findByIdAndUpdate(id, { $set: input }, { new: true });
  if (!updated) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found.');

  if (existing.name !== updated.name) {
    await ProductModel.updateMany({ brandId: updated._id }, { $set: { brandName: updated.name } });
  }

  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteBrand(id: string) {
  const brand = await BrandModel.findById(id);
  if (!brand) throw new AppError(404, 'BRAND_NOT_FOUND', 'Brand not found.');
  const linkedProducts = await ProductModel.countDocuments({ brandId: brand._id });
  if (linkedProducts > 0) {
    throw new AppError(
      409,
      'BRAND_IN_USE',
      `Cannot delete brand linked to ${linkedProducts} product${linkedProducts === 1 ? '' : 's'}. Unlink or reassign them first.`,
    );
  }
  if (brand.cloudinaryPublicId) {
    await deleteCloudinaryAsset(brand.cloudinaryPublicId);
  }
  const name = brand.name;
  await brand.deleteOne();
  return { id, name };
}
