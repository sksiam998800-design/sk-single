import mongoose from 'mongoose';
import { ProductModel } from './product.model';
import { CategoryModel, BrandModel } from '../categories/category.model';
import { AttributeGroupModel, ProductAttributePresetModel } from '../cms/cms.model';
import { InventoryMovementModel } from '../inventory/inventoryMovement.model';
import { OrderModel } from '../orders/order.model';
import { AppError } from '../../middleware/error.middleware';
import { buildCategoryAncestryPath, enrichProductPricing } from './productCatalogHelpers';
import {
  normalizeAttributeOptions,
  resolveAttributesForCategories,
  slugifyAttributeCode,
  syncLegacyAttributesMap,
  validateAttributeValue,
  type ProductAttributeDefinition,
} from '../../../../src/lib/productAttributes';
import { inferColorHex } from '../../../../src/lib/variantEngine';
import type { z } from 'zod';
import type {
  answerQuestionSchema,
  attributeGroupSchema,
  attributePresetSchema,
  bulkActionSchema,
  bulkImportSchema,
  productSchema,
} from './product.validation';

function mapAttributeDoc(doc: Record<string, unknown>, usageCount = 0): ProductAttributeDefinition & {
  id: string;
  _id?: string;
  usageCount: number;
} {
  const options = normalizeAttributeOptions(
    Array.isArray(doc.options) ? (doc.options as Array<Record<string, unknown>>) : [],
    Array.isArray(doc.values) ? (doc.values as string[]) : [],
  );
  return {
    id: String(doc._id),
    _id: String(doc._id),
    name: String(doc.name || ''),
    code: String(doc.code || ''),
    description: doc.description ? String(doc.description) : '',
    group: String(doc.group || 'general'),
    groupId: doc.groupId ? String(doc.groupId) : null,
    groupName: doc.groupName ? String(doc.groupName) : undefined,
    inputType: (doc.inputType as ProductAttributeDefinition['inputType']) || 'single_select',
    unit: doc.unit ? String(doc.unit) : '',
    scope: (doc.scope as ProductAttributeDefinition['scope']) || 'global',
    categoryIds: Array.isArray(doc.categoryIds) ? doc.categoryIds.map(String) : [],
    values: options.map((o) => o.label),
    options,
    defaultValue: doc.defaultValue ?? null,
    validationRules: (doc.validationRules as ProductAttributeDefinition['validationRules']) || {},
    sortOrder: Number(doc.sortOrder || 0),
    isRequired: Boolean(doc.isRequired),
    isVisibleToCustomers: doc.isVisibleToCustomers !== false,
    showOnProductDetails: doc.showOnProductDetails !== false,
    isFilterable: Boolean(doc.isFilterable),
    isSearchable: doc.isSearchable !== false,
    isComparable: Boolean(doc.isComparable),
    isActive: doc.isActive !== false,
    usageCount,
  };
}

export async function listProductsAdmin(params: {
  page: number;
  limit: number;
  q: string;
  status: string;
  categoryId: string;
}) {
  const { page, limit, q, status, categoryId } = params;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (categoryId) {
    filter.$or = [{ categoryId }, { subCategoryId: categoryId }];
  }
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const searchCond = [{ name: regex }, { sku: regex }, { brandName: regex }, { slug: regex }];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or as unknown[] }, { $or: searchCond }];
      delete filter.$or;
    } else {
      filter.$or = searchCond;
    }
  }

  const [total, products] = await Promise.all([
    ProductModel.countDocuments(filter),
    ProductModel.find(filter)
      .populate('categoryId', 'name slug')
      .populate('subCategoryId', 'name slug')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  return {
    products: products.map((p) => enrichProductPricing(p as unknown as Record<string, unknown>)),
    pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function getProductByIdAdmin(id: string) {
  const product = await ProductModel.findById(id)
    .populate('categoryId', 'name nameBn slug')
    .populate('subCategoryId', 'name nameBn slug')
    .populate('brandId', 'name slug logoUrl')
    .lean();
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  const recentMovements = await InventoryMovementModel.find({ productId: product._id })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean();

  return {
    product: enrichProductPricing(product as unknown as Record<string, unknown>),
    movements: recentMovements.map((m) => ({ ...m, id: String(m._id) })),
  };
}

async function normalizeAndValidateProductPayload(
  parsed: z.infer<typeof productSchema>,
  existingProductId?: string,
) {
  const allCategories = await CategoryModel.find().lean();
  const category = allCategories.find((c) => String(c._id) === parsed.categoryId);
  if (!category) throw new AppError(400, 'INVALID_CATEGORY', 'Selected category does not exist.');

  if (parsed.subCategoryId) {
    const subCat = allCategories.find((c) => String(c._id) === parsed.subCategoryId);
    if (!subCat) throw new AppError(400, 'INVALID_SUBCATEGORY', 'Selected subcategory does not exist.');
  }

  let brandName = parsed.brandName || '';
  if (parsed.brandId) {
    const brand = await BrandModel.findById(parsed.brandId).lean();
    if (brand) brandName = brand.name;
  }

  const categoryPath = buildCategoryAncestryPath({
    categoryId: String(category._id),
    subCategoryId: parsed.subCategoryId || null,
    allCategories,
  });

  // Check product SKU uniqueness cleanly
  const dupSkuFilter: Record<string, unknown> = { sku: parsed.sku };
  if (existingProductId) dupSkuFilter._id = { $ne: existingProductId };
  const skuTaken = await ProductModel.findOne(dupSkuFilter).select('_id name').lean();
  if (skuTaken) {
    throw new AppError(409, 'DUPLICATE_SKU', `Product SKU "${parsed.sku}" is already used by "${skuTaken.name}".`);
  }

  // Normalize variants and check variant SKU uniqueness across catalog
  const sanitizedVariants = parsed.hasVariants ? parsed.variants : [];
  if (sanitizedVariants.length > 0) {
    const variantSkus = sanitizedVariants.map((v) => v.sku.trim());
    const dupQuery: Record<string, unknown> = { 'variants.sku': { $in: variantSkus } };
    if (existingProductId) dupQuery._id = { $ne: existingProductId };
    const conflictProduct = await ProductModel.findOne(dupQuery).select('_id name variants.sku').lean();
    if (conflictProduct) {
      const takenSet = new Set((conflictProduct.variants || []).map((v: { sku: string }) => v.sku));
      const matchedSku = variantSkus.find((s) => takenSet.has(s)) || variantSkus[0];
      throw new AppError(
        409,
        'DUPLICATE_VARIANT_SKU',
        `Variant SKU "${matchedSku}" already exists on product "${conflictProduct.name}".`,
      );
    }
  }

  // Validate against applicable active category/global attribute definitions
  const rawPresets = await ProductAttributePresetModel.find({ isActive: true }).lean();
  const mappedPresets = rawPresets.map((d) => mapAttributeDoc(d as unknown as Record<string, unknown>));
  const applicableAttributes = resolveAttributesForCategories(
    mappedPresets,
    parsed.categoryId,
    parsed.subCategoryId || null,
  );
  const presetByCode = new Map(mappedPresets.map((p) => [p.code.toLowerCase(), p]));

  const normalizedAttributeValues = (parsed.attributeValues || []).map((entry) => {
    const def = entry.attributeId
      ? mappedPresets.find((p) => p.id === entry.attributeId)
      : presetByCode.get(entry.code.toLowerCase());
    const resolvedType = (entry.inputType as ProductAttributeDefinition['inputType']) || def?.inputType || 'short_text';
    let resolvedColorHex = entry.colorHex || '';
    if (!resolvedColorHex && resolvedType === 'color') {
      const valStr = String(entry.value ?? '').trim();
      const matchedOpt = (def?.options || []).find(
        (o) =>
          o.label.toLowerCase() === valStr.toLowerCase() ||
          o.value.toLowerCase() === valStr.toLowerCase(),
      );
      resolvedColorHex = matchedOpt?.colorHex || inferColorHex(valStr) || '';
    }
    return {
      attributeId: entry.attributeId || def?.id || null,
      code: slugifyAttributeCode(entry.code),
      name: entry.name || def?.name || entry.code,
      groupName: entry.groupName || def?.groupName || def?.group || 'General',
      inputType: resolvedType,
      value: entry.value ?? '',
      unit: entry.unit || def?.unit || '',
      colorHex: resolvedColorHex,
      sortOrder: entry.sortOrder ?? def?.sortOrder ?? 0,
      isVisibleToCustomers:
        entry.isVisibleToCustomers !== undefined
          ? entry.isVisibleToCustomers
          : def?.isVisibleToCustomers !== false,
      showOnProductDetails:
        entry.showOnProductDetails !== undefined
          ? entry.showOnProductDetails
          : def?.showOnProductDetails !== false,
      isFilterable: entry.isFilterable ?? def?.isFilterable ?? false,
      isSearchable: entry.isSearchable ?? def?.isSearchable ?? false,
      isComparable: entry.isComparable ?? def?.isComparable ?? false,
    };
  });

  // Validate values + enforce required fields when publishing
  const entryMap = new Map(normalizedAttributeValues.map((e) => [e.code.toLowerCase(), e]));
  for (const def of applicableAttributes) {
    const submitted = entryMap.get(def.code.toLowerCase());
    const val = submitted ? submitted.value : undefined;
    if (def.isRequired && parsed.status === 'published') {
      const check = validateAttributeValue(def, val);
      if (!check.valid) {
        throw new AppError(400, 'ATTRIBUTE_VALIDATION_ERROR', check.error || `${def.name} is required.`);
      }
    } else if (submitted && val !== undefined && val !== '' && val !== null) {
      const check = validateAttributeValue({ ...def, isRequired: false }, val);
      if (!check.valid) {
        throw new AppError(400, 'ATTRIBUTE_VALIDATION_ERROR', check.error || `Invalid value for ${def.name}.`);
      }
    }
  }

  const mergedLegacyAttributes = syncLegacyAttributesMap(
    normalizedAttributeValues,
    parsed.attributes || {},
  );

  return {
    ...parsed,
    brandId: parsed.brandId || null,
    subCategoryId: parsed.subCategoryId || null,
    brandName,
    categoryPath,
    variants: sanitizedVariants,
    attributeValues: normalizedAttributeValues,
    attributes: mergedLegacyAttributes,
  };
}

export async function createProductAdmin(parsed: z.infer<typeof productSchema>) {
  const payload = await normalizeAndValidateProductPayload(parsed);
  const created = await ProductModel.create(payload);
  const populated = await ProductModel.findById(created._id)
    .populate('categoryId', 'name nameBn slug')
    .populate('subCategoryId', 'name nameBn slug')
    .populate('brandId', 'name slug logoUrl')
    .lean();

  return enrichProductPricing(
    (populated || created.toObject({ flattenMaps: true })) as unknown as Record<string, unknown>,
  );
}

export async function updateProductAdmin(id: string, parsed: z.infer<typeof productSchema>) {
  const existing = await ProductModel.findById(id);
  if (!existing) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  const payload = await normalizeAndValidateProductPayload(parsed, id);
  const priceChanged = existing.basePrice !== parsed.basePrice || existing.salePrice !== parsed.salePrice;

  Object.assign(existing, payload);
  await existing.save();

  const populated = await ProductModel.findById(existing._id)
    .populate('categoryId', 'name nameBn slug')
    .populate('subCategoryId', 'name nameBn slug')
    .populate('brandId', 'name slug logoUrl')
    .lean();

  return {
    product: enrichProductPricing(
      (populated || existing.toObject({ flattenMaps: true })) as unknown as Record<string, unknown>,
    ),
    priceChanged,
    sku: existing.sku,
    name: existing.name,
    id: String(existing._id),
  };
}

export async function updateProductStatusAdmin(id: string, status: 'draft' | 'published' | 'archived') {
  const product = await ProductModel.findById(id);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  if (status === 'published') {
    const rawPresets = await ProductAttributePresetModel.find({ isActive: true, isRequired: true }).lean();
    const mappedRequired = rawPresets.map((d) => mapAttributeDoc(d as unknown as Record<string, unknown>));
    const applicableRequired = resolveAttributesForCategories(
      mappedRequired,
      product.categoryId ? String(product.categoryId) : '',
      product.subCategoryId ? String(product.subCategoryId) : null,
    );
    const entryMap = new Map(
      (product.attributeValues || []).map((e: { code?: string; value?: unknown }) => [
        String(e.code || '').toLowerCase(),
        e.value,
      ]),
    );
    for (const def of applicableRequired) {
      const check = validateAttributeValue(def, entryMap.get(def.code.toLowerCase()));
      if (!check.valid) {
        throw new AppError(400, 'ATTRIBUTE_VALIDATION_ERROR', check.error || `${def.name} is required.`);
      }
    }
  }

  const prevStatus = product.status;
  product.status = status;
  await product.save();

  return {
    product: enrichProductPricing(product.toObject({ flattenMaps: true }) as unknown as Record<string, unknown>),
    prevStatus,
    sku: product.sku,
    name: product.name,
    id: String(product._id),
  };
}

export async function deleteProductAdmin(id: string, permanent: boolean) {
  const product = await ProductModel.findById(id);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  if (permanent) {
    const referencedOrders = await OrderModel.countDocuments({ 'items.productId': product._id });
    if (referencedOrders > 0) {
      throw new AppError(
        409,
        'PRODUCT_HAS_ORDERS',
        `Cannot permanently delete product linked to ${referencedOrders} historical orders. Archive it instead.`,
      );
    }
    const summary = { id: String(product._id), name: product.name, sku: product.sku };
    await product.deleteOne();
    return { deleted: true, archived: false, ...summary };
  }

  product.status = 'archived';
  await product.save();
  return { deleted: false, archived: true, id: String(product._id), name: product.name, sku: product.sku };
}

export async function duplicateProductAdmin(id: string) {
  const src = await ProductModel.findById(id).lean();
  if (!src) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  const suffix = Date.now().toString(36).slice(-4).toUpperCase();
  const { _id, createdAt, updatedAt, soldCount, ratingAverage, reviewCount, questions, ...rest } =
    src as unknown as Record<string, unknown>;
  void _id;
  void createdAt;
  void updatedAt;
  void soldCount;
  void ratingAverage;
  void reviewCount;
  void questions;

  const duplicated = await ProductModel.create({
    ...rest,
    name: `${src.name} (Copy)`,
    slug: `${src.slug}-copy-${suffix.toLowerCase()}`,
    sku: `${src.sku}-${suffix}`,
    status: 'draft',
    reservedStock: 0,
    questions: [],
    variants: (src.variants || []).map((v: { sku: string; _id?: unknown; [k: string]: unknown }, idx: number) => ({
      ...v,
      _id: undefined,
      sku: `${v.sku}-${suffix}-${idx + 1}`,
      reservedStock: 0,
    })),
  });

  return {
    product: enrichProductPricing(duplicated.toObject({ flattenMaps: true }) as unknown as Record<string, unknown>),
    sourceName: src.name,
    sku: duplicated.sku,
    id: String(duplicated._id),
  };
}

export async function exportProductsCsv() {
  const products = await ProductModel.find({ status: { $ne: 'archived' } }).populate('categoryId', 'slug').lean();
  const header = 'sku,name,slug,categorySlug,brandName,basePrice,salePrice,stockOnHand,status,description';
  const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = products.map((p) =>
    [
      escapeCsv(p.sku),
      escapeCsv(p.name),
      escapeCsv(p.slug),
      escapeCsv((p.categoryId as unknown as { slug?: string })?.slug || 'general'),
      escapeCsv(p.brandName || ''),
      p.basePrice,
      p.salePrice ?? '',
      p.stockOnHand,
      p.status,
      escapeCsv(p.description),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export async function bulkImportProductsAdmin(input: z.infer<typeof bulkImportSchema>) {
  const categories = await CategoryModel.find().lean();
  const catSlugMap = new Map(categories.map((c) => [c.slug, c]));

  const errors: Array<{ row: number; sku: string; error: string }> = [];
  const seenSkus = new Set<string>();
  const validOps = [];

  for (let i = 0; i < input.rows.length; i += 1) {
    const row = input.rows[i];
    if (seenSkus.has(row.sku)) {
      errors.push({ row: i + 1, sku: row.sku, error: 'Duplicate SKU inside CSV file.' });
      continue;
    }
    seenSkus.add(row.sku);

    const cat = catSlugMap.get(row.categorySlug.toLowerCase());
    if (!cat) {
      errors.push({ row: i + 1, sku: row.sku, error: `Category slug "${row.categorySlug}" not found.` });
      continue;
    }

    const existingSku = await ProductModel.findOne({ sku: row.sku }).select('_id').lean();
    if (existingSku) {
      errors.push({ row: i + 1, sku: row.sku, error: `SKU "${row.sku}" already exists in catalog.` });
      continue;
    }

    validOps.push({
      name: row.name,
      slug: row.slug,
      sku: row.sku,
      categoryId: cat._id,
      categoryPath: buildCategoryAncestryPath({
        categoryId: String(cat._id),
        allCategories: categories,
      }),
      brandName: row.brandName || '',
      basePrice: row.basePrice,
      salePrice: row.salePrice ?? null,
      stockOnHand: row.stockOnHand,
      status: row.status,
      description: row.description,
    });
  }

  let insertedCount = 0;
  if (validOps.length > 0) {
    const inserted = await ProductModel.insertMany(validOps, { ordered: false });
    insertedCount = inserted.length;
  }

  return { importedCount: insertedCount, errors };
}

export async function bulkProductActionAdmin(parsed: z.infer<typeof bulkActionSchema>) {
  let modifiedCount = 0;
  if (parsed.action === 'delete') {
    const linked = await OrderModel.distinct('items.productId', { 'items.productId': { $in: parsed.ids } });
    const linkedSet = new Set(linked.map(String));
    const deletableIds = parsed.ids.filter((id) => !linkedSet.has(id));
    const archiveIds = parsed.ids.filter((id) => linkedSet.has(id));
    if (deletableIds.length > 0) {
      const delRes = await ProductModel.deleteMany({ _id: { $in: deletableIds } });
      modifiedCount += delRes.deletedCount || 0;
    }
    if (archiveIds.length > 0) {
      const arcRes = await ProductModel.updateMany({ _id: { $in: archiveIds } }, { $set: { status: 'archived' } });
      modifiedCount += arcRes.modifiedCount || 0;
    }
  } else if (parsed.action === 'publish') {
    const rawPresets = await ProductAttributePresetModel.find({ isActive: true, isRequired: true }).lean();
    const mappedRequired = rawPresets.map((d) => mapAttributeDoc(d as unknown as Record<string, unknown>));
    if (mappedRequired.length > 0) {
      const products = await ProductModel.find({ _id: { $in: parsed.ids } })
        .select('name categoryId subCategoryId attributeValues')
        .lean();
      for (const product of products) {
        const applicableRequired = resolveAttributesForCategories(
          mappedRequired,
          product.categoryId ? String(product.categoryId) : '',
          product.subCategoryId ? String(product.subCategoryId) : null,
        );
        const entryMap = new Map(
          (product.attributeValues || []).map((e: { code?: string; value?: unknown }) => [
            String(e.code || '').toLowerCase(),
            e.value,
          ]),
        );
        for (const def of applicableRequired) {
          const check = validateAttributeValue(def, entryMap.get(def.code.toLowerCase()));
          if (!check.valid) {
            throw new AppError(
              400,
              'ATTRIBUTE_VALIDATION_ERROR',
              `Cannot bulk-publish "${product.name}": ${check.error || `${def.name} is required.`}`,
            );
          }
        }
      }
    }
    const resUpdate = await ProductModel.updateMany(
      { _id: { $in: parsed.ids } },
      { $set: { status: 'published' } },
    );
    modifiedCount = resUpdate.modifiedCount || 0;
  } else {
    const statusMap: Record<string, 'published' | 'draft' | 'archived'> = {
      publish: 'published',
      draft: 'draft',
      archive: 'archived',
    };
    const resUpdate = await ProductModel.updateMany(
      { _id: { $in: parsed.ids } },
      { $set: { status: statusMap[parsed.action] } },
    );
    modifiedCount = resUpdate.modifiedCount || 0;
  }
  return { modifiedCount };
}

// ============================================================
// Attribute Groups CRUD
// ============================================================

export async function listAttributeGroupsAdmin() {
  const [groups, attrs] = await Promise.all([
    AttributeGroupModel.find().sort({ sortOrder: 1, name: 1 }).lean(),
    ProductAttributePresetModel.find().select('groupId group').lean(),
  ]);
  const countsByGroupId = new Map<string, number>();
  for (const a of attrs) {
    if (a.groupId) {
      const key = String(a.groupId);
      countsByGroupId.set(key, (countsByGroupId.get(key) || 0) + 1);
    }
  }
  return groups.map((g) => ({
    ...g,
    id: String(g._id),
    attributeCount: countsByGroupId.get(String(g._id)) || 0,
  }));
}

export async function createAttributeGroupAdmin(parsed: z.infer<typeof attributeGroupSchema>) {
  const slug = slugifyAttributeCode(parsed.slug || parsed.name);
  const exists = await AttributeGroupModel.findOne({ $or: [{ slug }, { name: parsed.name }] }).lean();
  if (exists) {
    throw new AppError(409, 'DUPLICATE_ATTRIBUTE_GROUP', `Attribute group "${parsed.name}" already exists.`);
  }
  const group = await AttributeGroupModel.create({
    ...parsed,
    slug,
  });
  return { ...group.toObject(), id: String(group._id), attributeCount: 0 };
}

export async function updateAttributeGroupAdmin(id: string, parsed: z.infer<typeof attributeGroupSchema>) {
  const slug = slugifyAttributeCode(parsed.slug || parsed.name);
  const updated = await AttributeGroupModel.findByIdAndUpdate(
    id,
    { $set: { ...parsed, slug } },
    { new: true },
  );
  if (!updated) throw new AppError(404, 'ATTRIBUTE_GROUP_NOT_FOUND', 'Attribute group not found.');
  await ProductAttributePresetModel.updateMany(
    { groupId: updated._id },
    { $set: { groupName: updated.name, group: updated.slug } },
  );
  const groupAttrs = await ProductAttributePresetModel.find({ groupId: updated._id })
    .select('_id code')
    .lean();
  if (groupAttrs.length > 0) {
    const attrIds = groupAttrs.map((a) => a._id);
    const attrCodes = groupAttrs.map((a) => String(a.code || '').toLowerCase()).filter(Boolean);
    await ProductModel.updateMany(
      {
        $or: [
          { 'attributeValues.attributeId': { $in: attrIds } },
          { 'attributeValues.code': { $in: attrCodes } },
        ],
      },
      { $set: { 'attributeValues.$[elem].groupName': updated.name } },
      {
        arrayFilters: [
          {
            $or: [
              { 'elem.attributeId': { $in: attrIds } },
              { 'elem.code': { $in: attrCodes } },
            ],
          },
        ],
      },
    );
  }
  return { ...updated.toObject(), id: String(updated._id) };
}

export async function deleteAttributeGroupAdmin(id: string) {
  const group = await AttributeGroupModel.findById(id);
  if (!group) throw new AppError(404, 'ATTRIBUTE_GROUP_NOT_FOUND', 'Attribute group not found.');
  await ProductAttributePresetModel.updateMany(
    { groupId: group._id },
    { $set: { groupId: null, groupName: 'General', group: 'general' } },
  );
  await group.deleteOne();
  return { deleted: true };
}

// ============================================================
// Dynamic Attributes CRUD
// ============================================================

async function buildAttributeUsageCountMap(): Promise<Map<string, number>> {
  const counts = await ProductModel.aggregate([
    { $unwind: '$attributeValues' },
    { $group: { _id: { $toLower: '$attributeValues.code' }, count: { $sum: 1 } } },
  ]);
  const map = new Map<string, number>();
  for (const row of counts) {
    if (row._id) map.set(String(row._id), Number(row.count || 0));
  }
  return map;
}

async function normalizeAttributeWritePayload(parsed: z.infer<typeof attributePresetSchema>) {
  const code = slugifyAttributeCode(parsed.code || parsed.name);
  if (!code) {
    throw new AppError(400, 'INVALID_ATTRIBUTE_CODE', 'Attribute code must contain letters or numbers.');
  }

  let resolvedGroupId: mongoose.Types.ObjectId | null = null;
  let resolvedGroupSlug = parsed.group || 'general';
  let resolvedGroupName = parsed.groupName || '';

  if (parsed.groupId && mongoose.Types.ObjectId.isValid(parsed.groupId)) {
    const grp = await AttributeGroupModel.findById(parsed.groupId).lean();
    if (grp) {
      resolvedGroupId = grp._id as mongoose.Types.ObjectId;
      resolvedGroupSlug = grp.slug;
      resolvedGroupName = grp.name;
    }
  }

  const options = normalizeAttributeOptions(parsed.options || [], parsed.values || []);
  const values = options.map((o) => o.label);
  const categoryIds = (parsed.scope === 'category' ? parsed.categoryIds || [] : []).filter((cid) =>
    mongoose.Types.ObjectId.isValid(cid),
  );

  return {
    name: parsed.name.trim(),
    code,
    description: parsed.description || '',
    group: resolvedGroupSlug,
    groupId: resolvedGroupId,
    groupName: resolvedGroupName || resolvedGroupSlug,
    inputType: parsed.inputType,
    unit: parsed.unit || '',
    scope: parsed.scope,
    categoryIds,
    options,
    values,
    defaultValue: parsed.defaultValue ?? null,
    validationRules: parsed.validationRules || {},
    sortOrder: parsed.sortOrder ?? 0,
    isRequired: Boolean(parsed.isRequired),
    isVisibleToCustomers: parsed.isVisibleToCustomers !== false,
    showOnProductDetails: parsed.showOnProductDetails !== false,
    isFilterable: Boolean(parsed.isFilterable),
    isSearchable: parsed.isSearchable !== false,
    isComparable: Boolean(parsed.isComparable),
    isActive: parsed.isActive !== false,
  };
}

export async function listAttributesAdmin() {
  const [attributes, usageMap] = await Promise.all([
    ProductAttributePresetModel.find().sort({ sortOrder: 1, group: 1, name: 1 }).lean(),
    buildAttributeUsageCountMap(),
  ]);
  return attributes.map((a) =>
    mapAttributeDoc(
      a as unknown as Record<string, unknown>,
      usageMap.get(String(a.code || '').toLowerCase()) || 0,
    ),
  );
}

export async function getAttributesByCategoryAdmin(categoryId?: string, subCategoryId?: string) {
  const raw = await ProductAttributePresetModel.find({ isActive: true })
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  const mapped = raw.map((d) => mapAttributeDoc(d as unknown as Record<string, unknown>));
  return resolveAttributesForCategories(mapped, categoryId, subCategoryId);
}

export async function createAttributeAdmin(parsed: z.infer<typeof attributePresetSchema>) {
  const payload = await normalizeAttributeWritePayload(parsed);
  const existing = await ProductAttributePresetModel.findOne({ code: payload.code }).lean();
  if (existing) {
    throw new AppError(409, 'DUPLICATE_ATTRIBUTE_CODE', `Attribute code "${payload.code}" already exists.`);
  }
  const attr = await ProductAttributePresetModel.create(payload);
  return mapAttributeDoc(attr.toObject() as unknown as Record<string, unknown>, 0);
}

export async function updateAttributeAdmin(id: string, parsed: z.infer<typeof attributePresetSchema>) {
  const existingAttr = await ProductAttributePresetModel.findById(id).lean();
  if (!existingAttr) throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute preset not found.');

  const payload = await normalizeAttributeWritePayload(parsed);
  const duplicate = await ProductAttributePresetModel.findOne({
    code: payload.code,
    _id: { $ne: id },
  }).lean();
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_ATTRIBUTE_CODE', `Attribute code "${payload.code}" already exists.`);
  }
  const updated = await ProductAttributePresetModel.findByIdAndUpdate(id, { $set: payload }, { new: true });
  if (!updated) throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute preset not found.');

  const oldCode = String(existingAttr.code || '').toLowerCase();
  const matchOr: Record<string, unknown>[] = [{ attributeId: updated._id }];
  const filterOr: Record<string, unknown>[] = [{ 'elem.attributeId': updated._id }];
  if (oldCode) {
    matchOr.push({ code: oldCode });
    filterOr.push({ 'elem.code': oldCode });
  }
  await ProductModel.updateMany(
    {
      $or: matchOr.map((cond) =>
        Object.fromEntries(Object.entries(cond).map(([k, v]) => [`attributeValues.${k}`, v])),
      ),
    },
    {
      $set: {
        'attributeValues.$[elem].attributeId': updated._id,
        'attributeValues.$[elem].code': updated.code,
        'attributeValues.$[elem].name': updated.name,
        'attributeValues.$[elem].groupName': updated.groupName || updated.group || 'General',
        'attributeValues.$[elem].unit': updated.unit || '',
        'attributeValues.$[elem].sortOrder': updated.sortOrder ?? 0,
        'attributeValues.$[elem].isVisibleToCustomers':
          updated.isActive === false ? false : updated.isVisibleToCustomers !== false,
        'attributeValues.$[elem].showOnProductDetails':
          updated.isActive === false ? false : updated.showOnProductDetails !== false,
        'attributeValues.$[elem].isFilterable': Boolean(updated.isFilterable),
        'attributeValues.$[elem].isSearchable': updated.isSearchable !== false,
        'attributeValues.$[elem].isComparable': Boolean(updated.isComparable),
      },
    },
    { arrayFilters: [{ $or: filterOr }] },
  );

  return mapAttributeDoc(updated.toObject() as unknown as Record<string, unknown>);
}

export async function deleteAttributeAdmin(id: string) {
  const deleted = await ProductAttributePresetModel.findByIdAndDelete(id);
  if (!deleted) throw new AppError(404, 'ATTRIBUTE_NOT_FOUND', 'Attribute preset not found.');
  await ProductModel.updateMany(
    { 'attributeValues.attributeId': deleted._id },
    { $set: { 'attributeValues.$[elem].attributeId': null } },
    { arrayFilters: [{ 'elem.attributeId': deleted._id }] },
  );
  return { deleted: true };
}

// ============================================================
// Product Q&A Moderation
// ============================================================

export async function answerProductQuestionAdmin(
  productId: string,
  questionId: string,
  parsed: z.infer<typeof answerQuestionSchema>,
  actorName: string,
) {
  const product = await ProductModel.findById(productId);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  const q = (product.questions || []).find((item: { _id?: unknown }) => String(item._id) === questionId);
  if (!q) throw new AppError(404, 'QUESTION_NOT_FOUND', 'Customer question not found.');

  q.answer = parsed.answer;
  q.answeredBy = actorName || 'Store Support';
  q.answeredAt = new Date();
  q.isPublished = parsed.isPublished;
  await product.save();

  return {
    question: {
      id: String(q._id),
      question: q.question,
      answer: q.answer,
      askedBy: q.userName,
      answeredBy: q.answeredBy,
      answeredAt: q.answeredAt,
      isPublished: q.isPublished,
      createdAt: q.createdAt,
    },
  };
}

export async function deleteProductQuestionAdmin(productId: string, questionId: string) {
  const product = await ProductModel.findById(productId);
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Product not found.');

  product.questions = (product.questions || []).filter((item: { _id?: unknown }) => String(item._id) !== questionId);
  await product.save();
  return { deleted: true };
}
