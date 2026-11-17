import { z } from 'zod';

export const attributeInputTypeEnum = z.enum([
  'short_text',
  'long_text',
  'number',
  'decimal',
  'boolean',
  'single_select',
  'multi_select',
  'color',
  'date',
  'url',
  'measurement',
  'file',
]);

export const attributeGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(80).toLowerCase(),
  description: z.string().trim().max(300).optional().default(''),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const attributePresetSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(2).max(60).toLowerCase(),
  description: z.string().trim().max(300).optional().default(''),
  group: z.string().trim().min(1).max(80).default('general'),
  groupId: z.string().nullable().optional(),
  groupName: z.string().trim().max(80).optional(),
  inputType: attributeInputTypeEnum.default('single_select'),
  unit: z.string().trim().max(30).optional().default(''),
  scope: z.enum(['global', 'category', 'product']).default('global'),
  categoryIds: z.array(z.string().min(1)).default([]),
  values: z.array(z.string().trim().min(1)).default([]),
  options: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(120),
        value: z.string().trim().min(1).max(120),
        colorHex: z.string().trim().max(20).optional().default(''),
        sortOrder: z.number().int().default(0),
      }),
    )
    .default([]),
  defaultValue: z.unknown().nullable().optional(),
  validationRules: z
    .object({
      min: z.number().nullable().optional(),
      max: z.number().nullable().optional(),
      minLength: z.number().int().min(0).nullable().optional(),
      maxLength: z.number().int().min(0).nullable().optional(),
      pattern: z.string().max(200).optional().default(''),
    })
    .optional(),
  sortOrder: z.number().int().default(0),
  isRequired: z.boolean().default(false),
  isVisibleToCustomers: z.boolean().default(true),
  showOnProductDetails: z.boolean().default(true),
  isFilterable: z.boolean().default(false),
  isSearchable: z.boolean().default(false),
  isComparable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const productSchema = z
  .object({
    name: z.string().trim().min(2).max(180),
    nameBn: z.string().trim().max(200).optional(),
    slug: z.string().trim().min(2).max(200).toLowerCase(),
    sku: z.string().trim().min(2).max(60).toUpperCase(),
    barcode: z.string().trim().max(60).optional(),
    brandId: z.string().nullable().optional(),
    brandName: z.string().trim().optional(),
    categoryId: z.string().min(1),
    subCategoryId: z.string().nullable().optional(),
    description: z.string().min(10),
    shortDescription: z.string().max(400).optional(),
    features: z.array(z.string()).default([]),
    attributeGroup: z.string().trim().min(1).max(80).default('general'),
    attributes: z.record(z.string(), z.string()).default({}),
    attributeValues: z
      .array(
        z.object({
          attributeId: z.string().nullable().optional(),
          code: z.string().trim().min(1).max(60).toLowerCase(),
          name: z.string().trim().min(1).max(100),
          groupName: z.string().trim().max(80).optional().default('General Specifications'),
          inputType: z.string().trim().optional().default('short_text'),
          value: z.unknown(),
          unit: z.string().trim().max(30).optional().default(''),
          colorHex: z.string().trim().max(20).optional().default(''),
          sortOrder: z.number().int().default(0),
          isVisibleToCustomers: z.boolean().default(true),
          showOnProductDetails: z.boolean().default(true),
          isFilterable: z.boolean().default(false),
          isSearchable: z.boolean().default(false),
          isComparable: z.boolean().default(false),
        }),
      )
      .default([]),
    specifications: z
      .array(
        z.object({
          label: z.string().trim().min(1),
          value: z.string().trim().min(1),
          unit: z.string().trim().max(30).optional().default(''),
          groupName: z.string().trim().max(80).optional().default('Technical Specifications'),
          sortOrder: z.number().int().default(0),
        }),
      )
      .default([]),
    highlights: z
      .array(
        z.object({
          icon: z.string().trim().max(40).default('Cpu'),
          title: z.string().trim().min(1).max(80),
          subtitle: z.string().trim().max(80).optional().default(''),
          sortOrder: z.number().int().default(0),
        }),
      )
      .default([]),
    videos: z
      .array(
        z.object({
          title: z.string().trim().max(120).optional().default(''),
          url: z.string().trim().min(1).max(500),
          thumbnailUrl: z.string().trim().max(500).optional().default(''),
          sortOrder: z.number().int().default(0),
        }),
      )
      .default([]),
    contentSections: z
      .array(
        z.object({
          sectionId: z.string().trim().min(1).max(80),
          title: z.string().trim().min(1).max(120),
          sectionType: z.string().trim().max(40).default('custom'),
          body: z.string().max(6000).optional().default(''),
          mediaUrl: z.string().trim().max(500).optional().default(''),
          fields: z
            .array(
              z.object({
                label: z.string().trim().min(1).max(120),
                value: z.string().trim().min(1).max(500),
                unit: z.string().trim().max(30).optional().default(''),
              }),
            )
            .default([]),
          sortOrder: z.number().int().default(0),
          isEnabled: z.boolean().default(true),
          showToCustomer: z.boolean().default(true),
        }),
      )
      .default([]),
    bilingualKeywords: z.array(z.string()).default([]),
    basePrice: z.number().min(0),
    costPrice: z.number().min(0).nullable().optional(),
    salePrice: z.number().min(0).nullable().optional(),
    flashSalePrice: z.number().min(0).nullable().optional(),
    flashSaleStartsAt: z.string().nullable().optional(),
    flashSaleEndsAt: z.string().nullable().optional(),
    stockOnHand: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(5),
    manageInventory: z.boolean().default(true),
    allowBackorder: z.boolean().default(false),
    weight: z.number().min(0).nullable().optional(),
    dimensions: z
      .object({
        length: z.number().min(0).nullable().optional(),
        width: z.number().min(0).nullable().optional(),
        height: z.number().min(0).nullable().optional(),
      })
      .optional(),
    tags: z.array(z.string()).default([]),
    hasVariants: z.boolean().default(false),
    variantOptions: z
      .array(
        z.object({
          name: z.string().trim().min(1),
          values: z.array(z.string()).default([]),
          colors: z.record(z.string(), z.string()).optional(),
        }),
      )
      .default([]),
    variants: z
      .array(
        z.object({
          _id: z.string().optional(),
          sku: z.string().trim().min(2).toUpperCase(),
          barcode: z.string().trim().max(60).optional().default(''),
          title: z.string().trim().min(1),
          options: z.record(z.string(), z.string()).default({}),
          price: z.number().min(0).nullable().optional(),
          salePrice: z.number().min(0).nullable().optional(),
          stockOnHand: z.number().int().min(0).default(0),
          lowStockThreshold: z.number().int().min(0).default(5),
          weight: z.number().min(0).nullable().optional(),
          imageUrl: z.string().optional(),
          images: z.array(z.string()).optional().default([]),
          isActive: z.boolean().default(true),
        }),
      )
      .default([]),
    images: z
      .array(
        z.object({
          url: z.string().min(1),
          publicId: z.string().optional(),
          alt: z.string().default(''),
          sortOrder: z.number().default(0),
        }),
      )
      .default([]),
    warrantyInfo: z.string().max(300).optional(),
    returnPolicyNote: z.string().max(300).optional(),
    faqs: z
      .array(z.object({ question: z.string().trim().min(1), answer: z.string().trim().min(1) }))
      .default([]),
    status: z.enum(['draft', 'published', 'archived']).default('draft'),
    isFeatured: z.boolean().default(false),
    isNewArrival: z.boolean().default(false),
    isBestSeller: z.boolean().default(false),
    isPremiumCollection: z.boolean().default(false),
    seoTitle: z.string().max(140).optional(),
    seoDescription: z.string().max(240).optional(),
    seoKeywords: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.hasVariants && data.variants.length > 0) {
      const seenSkus = new Set<string>();
      data.variants.forEach((v, idx) => {
        const skuUpper = v.sku.trim().toUpperCase();
        if (seenSkus.has(skuUpper)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['variants', idx, 'sku'],
            message: `Duplicate variant SKU "${skuUpper}" is not allowed.`,
          });
        }
        seenSkus.add(skuUpper);
      });
    }
  });

export const productStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

export const bulkImportSchema = z.object({
  rows: z
    .array(
      z.object({
        sku: z.string().trim().min(2).toUpperCase(),
        name: z.string().trim().min(2),
        slug: z.string().trim().min(2).toLowerCase(),
        categorySlug: z.string().trim().min(1),
        brandName: z.string().optional(),
        basePrice: z.number().min(0),
        salePrice: z.number().min(0).nullable().optional(),
        stockOnHand: z.number().int().min(0),
        status: z.enum(['draft', 'published']).default('draft'),
        description: z.string().min(5),
      }),
    )
    .max(500),
});

export const bulkActionSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(['publish', 'draft', 'archive', 'delete']),
});

export const productQuestionSchema = z.object({
  question: z.string().trim().min(5).max(500),
});

export const answerQuestionSchema = z.object({
  answer: z.string().trim().min(2).max(2000),
  isPublished: z.boolean().default(true),
});
