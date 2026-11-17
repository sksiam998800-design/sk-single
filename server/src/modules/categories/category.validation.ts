import { z } from 'zod';

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  nameBn: z.string().trim().max(100).optional(),
  slug: z.string().trim().min(2).max(100).toLowerCase(),
  parentId: z.string().nullable().optional(),
  iconName: z.string().trim().max(40).optional(),
  imageUrl: z.string().optional(),
  cloudinaryPublicId: z.string().optional(),
  description: z.string().max(500).optional(),
  attributeSchemaType: z.enum(['general', 'electronics', 'beauty', 'books', 'home']).default('general'),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  showInHeader: z.boolean().default(true),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(220).optional(),
});

export type CategoryInput = z.infer<typeof categorySchema>;
