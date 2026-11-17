import { z } from 'zod';

export const promoAdSchema = z.object({
  title: z.string().trim().min(2).max(140),
  altText: z.string().trim().min(2).max(200),
  imageUrl: z.string().min(1),
  mobileImageUrl: z.string().optional(),
  cloudinaryPublicId: z.string().optional(),
  destinationUrl: z
    .string()
    .trim()
    .refine(
      (url) => url.startsWith('/') || url.startsWith('https://') || url.startsWith('http://'),
      'Destination URL must be a relative path or valid HTTP/HTTPS URL.',
    ),
  placement: z.enum(['homepage_mid', 'homepage_bottom', 'category_sidebar', 'product_detail', 'promo_section']).default('homepage_mid'),
  priority: z.number().int().default(0),
  isEnabled: z.boolean().default(true),
  isPublished: z.boolean().default(false),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
});

export type PromoAdInput = z.infer<typeof promoAdSchema>;
