import { z } from 'zod';

export const heroSlideSchema = z.object({
  placement: z.enum(['home', 'cart', 'checkout', 'wishlist']).optional().default('home'),
  badgeText: z.string().trim().max(60).default('Featured'),
  heading: z.string().trim().min(2).max(140),
  headlineLine2: z.string().trim().max(140).optional().default(''),
  subtitle: z.string().trim().max(300).optional().default(''),
  desktopImageUrl: z.string().trim().min(1),
  mobileImageUrl: z.string().trim().optional().default(''),
  cloudinaryPublicId: z.string().optional(),
  ctaText: z.string().trim().max(60).optional().default(''),
  ctaUrl: z
    .string()
    .trim()
    .refine(
      (url) => url.startsWith('/') || url.startsWith('https://') || url.startsWith('http://'),
      'CTA URL must be a relative path or valid HTTP/HTTPS URL.',
    )
    .default('/shop'),
  textAlignment: z.enum(['left', 'center', 'right']).optional().default('left'),
  overlayOpacity: z.number().min(0).max(85).optional().default(0),
  sortOrder: z.number().int().default(0),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export const heroSlideStatusSchema = z.object({
  isActive: z.boolean(),
});

export const heroSlideReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

export type HeroSlideInput = z.infer<typeof heroSlideSchema>;

