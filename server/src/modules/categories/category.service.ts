import { CategoryModel } from './category.model';
import { ProductModel } from '../products/product.model';
import { AppError } from '../../middleware/error.middleware';
import { deleteCloudinaryAsset } from '../../services/cloudinary.service';
import { buildCategoryAncestryPath, collectDescendantCategoryIds } from '../products/productCatalogHelpers';
import type { CategoryInput } from './category.validation';

export async function listCategoriesAdmin() {
  const [categories, productCounts] = await Promise.all([
    CategoryModel.find().sort({ sortOrder: 1, name: 1 }).lean(),
    ProductModel.aggregate([
      {
        $project: {
          catIds: {
            $filter: {
              input: { $setUnion: [['$categoryId'], ['$subCategoryId']] },
              as: 'cid',
              cond: { $ne: ['$$cid', null] },
            },
          },
        },
      },
      { $unwind: '$catIds' },
      { $group: { _id: '$catIds', count: { $sum: 1 } } },
    ]),
  ]);
  const countMap = new Map(productCounts.map((row) => [String(row._id), Number(row.count || 0)]));
  return categories.map((c) => ({
    ...c,
    id: String(c._id),
    parentId: c.parentId ? String(c.parentId) : null,
    productCount: countMap.get(String(c._id)) || 0,
  }));
}

export async function getCategoryById(id: string) {
  const category = await CategoryModel.findById(id).lean();
  if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  const linkedProducts = await ProductModel.countDocuments({
    $or: [{ categoryId: category._id }, { subCategoryId: category._id }],
  });
  return {
    ...category,
    id: String(category._id),
    parentId: category.parentId ? String(category.parentId) : null,
    productCount: linkedProducts,
  };
}

function escapeRegExp(val: string): string {
  return val.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function createCategory(input: CategoryInput) {
  const duplicate = await CategoryModel.findOne({
    $or: [
      { slug: input.slug },
      { name: new RegExp(`^${escapeRegExp(input.name.trim())}$`, 'i') },
    ],
  }).lean();
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_CATEGORY', `Category "${input.name}" or slug "${input.slug}" already exists.`);
  }
  if (input.parentId) {
    const parentExists = await CategoryModel.findById(input.parentId).select('_id').lean();
    if (!parentExists) {
      throw new AppError(400, 'INVALID_PARENT_CATEGORY', 'Selected parent category does not exist.');
    }
  }
  const cat = await CategoryModel.create({
    ...input,
    parentId: input.parentId || null,
  });
  return { ...cat.toObject(), id: String(cat._id) };
}

export async function updateCategory(id: string, input: CategoryInput) {
  const duplicate = await CategoryModel.findOne({
    _id: { $ne: id },
    $or: [
      { slug: input.slug },
      { name: new RegExp(`^${escapeRegExp(input.name.trim())}$`, 'i') },
    ],
  }).lean();
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_CATEGORY', `Category "${input.name}" or slug "${input.slug}" already exists.`);
  }

  if (input.parentId) {
    if (input.parentId === id) {
      throw new AppError(400, 'INVALID_PARENT_CATEGORY', 'A category cannot be its own parent.');
    }
    const allCats = await CategoryModel.find().select('_id parentId').lean();
    const byId = new Map(allCats.map((c) => [String(c._id), c]));
    if (!byId.has(input.parentId)) {
      throw new AppError(400, 'INVALID_PARENT_CATEGORY', 'Selected parent category does not exist.');
    }
    let cursor: string | null = input.parentId;
    let guard = 0;
    while (cursor && guard < 20) {
      guard += 1;
      if (cursor === id) {
        throw new AppError(400, 'CIRCULAR_CATEGORY_PARENT', 'Cannot assign a descendant subcategory as the parent category.');
      }
      const node = byId.get(cursor);
      cursor = node?.parentId ? String(node.parentId) : null;
    }
  }

  const updated = await CategoryModel.findByIdAndUpdate(
    id,
    { $set: { ...input, parentId: input.parentId || null } },
    { new: true },
  );
  if (!updated) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');

  // Refresh categoryPath on products linked to this category or its descendants
  const allCats = await CategoryModel.find().select('_id slug parentId').lean();
  if (allCats.length > 0) {
    const impactedCatIds = collectDescendantCategoryIds(String(updated._id), allCats);
    const impactedProducts = await ProductModel.find({
      $or: [{ categoryId: { $in: impactedCatIds } }, { subCategoryId: { $in: impactedCatIds } }],
    })
      .select('_id categoryId subCategoryId')
      .lean();
    for (const prod of impactedProducts) {
      const nextPath = buildCategoryAncestryPath({
        categoryId: String(prod.categoryId),
        subCategoryId: prod.subCategoryId ? String(prod.subCategoryId) : null,
        allCategories: allCats,
      });
      await ProductModel.updateOne({ _id: prod._id }, { $set: { categoryPath: nextPath } });
    }
  }

  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteCategory(id: string) {
  const cat = await CategoryModel.findById(id);
  if (!cat) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Category not found.');
  const linkedProducts = await ProductModel.countDocuments({
    $or: [{ categoryId: cat._id }, { subCategoryId: cat._id }],
  });
  if (linkedProducts > 0) {
    throw new AppError(
      409,
      'CATEGORY_IN_USE',
      `Cannot delete category used by ${linkedProducts} products. Archive or reassign them first.`,
    );
  }
  const childCount = await CategoryModel.countDocuments({ parentId: cat._id });
  if (childCount > 0) {
    throw new AppError(409, 'CATEGORY_HAS_CHILDREN', 'Reassign or delete child subcategories first.');
  }
  if (cat.cloudinaryPublicId) {
    await deleteCloudinaryAsset(cat.cloudinaryPublicId);
  }
  const name = cat.name;
  await cat.deleteOne();
  return { id, name };
}
