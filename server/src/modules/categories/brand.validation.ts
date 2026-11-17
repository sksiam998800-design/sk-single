import { z } from 'zod';

export const brandSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(100).toLowerCase(),
  logoUrl: z.string().optional(),
  cloudinaryPublicId: z.string().optional(),
  description: z.string().max(500).optional(),
  websiteUrl: z.string().max(300).optional(),
  seoTitle: z.string().max(120).optional(),
  seoDescription: z.string().max(220).optional(),
  isActive: z.boolean().default(true),
});

export type BrandInput = z.infer<typeof brandSchema>;
