import { z } from 'zod';
import { isSafeNavigationUrl, stripUnsafeText } from '../../../../src/lib/navigationEngine';

const safeUrlField = z
  .string()
  .trim()
  .max(400)
  .refine(isSafeNavigationUrl, 'URL must start with /, https://, http://, or be #');

const optionalSafeUrlField = z
  .string()
  .trim()
  .max(400)
  .refine((v) => v === '' || isSafeNavigationUrl(v), 'URL must start with /, https://, http://, or be #');

const cleanText = (maxLen: number) =>
  z
    .string()
    .transform((v) => stripUnsafeText(v, maxLen));

export const navigationItemSchema = z.object({
  id: z.string().trim().max(80).optional(),
  label: cleanText(80).refine((v) => v.length >= 1, 'Item label is required.'),
  slug: cleanText(100).optional().default(''),
  url: safeUrlField,
  icon: cleanText(50).optional().default(''),
  description: cleanText(160).optional().default(''),
  target: z.enum(['_self', '_blank']).optional().default('_self'),
  badgeText: cleanText(24).optional().default(''),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
  visibilitySettings: z
    .object({
      showIcon: z.boolean().default(true),
      showDescription: z.boolean().default(true),
      desktopVisible: z.boolean().default(true),
      mobileVisible: z.boolean().default(true),
    })
    .optional()
    .default({
      showIcon: true,
      showDescription: true,
      desktopVisible: true,
      mobileVisible: true,
    }),
});

export const navigationGroupSchema = z.object({
  id: z.string().trim().max(80).optional(),
  title: cleanText(80).refine((v) => v.length >= 1, 'Group title is required.'),
  slug: cleanText(100).optional().default(''),
  url: optionalSafeUrlField.optional().default(''),
  icon: cleanText(50).optional().default(''),
  description: cleanText(160).optional().default(''),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
  items: z.array(navigationItemSchema).max(200).optional().default([]),
});

export const navigationPromotionSchema = z.object({
  id: z.string().trim().max(80).optional(),
  title: cleanText(100).refine((v) => v.length >= 1, 'Promotion title is required.'),
  subtitle: cleanText(180).optional().default(''),
  badgeText: cleanText(30).optional().default(''),
  imageUrl: optionalSafeUrlField.optional().default(''),
  cloudinaryPublicId: z.string().trim().max(240).optional().default(''),
  altText: cleanText(140).optional().default(''),
  ctaText: cleanText(40).optional().default(''),
  ctaUrl: optionalSafeUrlField.optional().default('/shop'),
  theme: z.enum(['royal-blue', 'ice-blue', 'midnight-navy']).optional().default('royal-blue'),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const navigationSlideSchema = z.object({
  id: z.string().trim().max(80).optional(),
  imageUrl: safeUrlField.refine((v) => v !== '#', 'A valid slide image URL is required.'),
  cloudinaryPublicId: z.string().trim().max(240).optional().default(''),
  altText: cleanText(160).refine((v) => v.length >= 1, 'Slide alt text is required for accessibility.'),
  title: cleanText(120).optional().default(''),
  subtitle: cleanText(120).optional().default(''),
  description: cleanText(240).optional().default(''),
  buttonText: cleanText(40).optional().default(''),
  buttonUrl: optionalSafeUrlField.optional().default(''),
  target: z.enum(['_self', '_blank']).optional().default('_self'),
  focalPoint: z.enum(['center', 'top', 'bottom', 'left', 'right']).optional().default('center'),
  objectFit: z.enum(['cover', 'contain']).optional().default('cover'),
  isActive: z.boolean().optional().default(true),
  displayOrder: z.number().int().min(0).optional().default(0),
});

export const navigationSliderSettingsSchema = z.object({
  autoplay: z.boolean().optional().default(true),
  intervalMs: z.number().int().min(1500).max(20000).optional().default(4500),
  pauseOnHover: z.boolean().optional().default(true),
  showIndicators: z.boolean().optional().default(true),
  showArrows: z.boolean().optional().default(true),
  transitionDurationMs: z.number().int().min(150).max(1000).optional().default(420),
  aspectRatio: z.enum(['16/10', '4/3', '16/9', 'square']).optional().default('4/3'),
});

export const navigationMenuSettingsSchema = z.object({
  desktopVisible: z.boolean().optional().default(true),
  mobileVisible: z.boolean().optional().default(true),
  alignment: z.enum(['left', 'center', 'right', 'full_width']).optional().default('left'),
  menuWidth: z.enum(['auto', 'md', 'lg', 'xl', 'full']).optional().default('xl'),
  maxHeightPx: z.number().int().min(240).max(760).optional().default(540),
  columns: z.number().int().min(0).max(5).optional().default(0),
  showIcons: z.boolean().optional().default(true),
  showDescriptions: z.boolean().optional().default(true),
  showPromotions: z.boolean().optional().default(true),
  showSlider: z.boolean().optional().default(true),
  sliderSettings: navigationSliderSettingsSchema.optional().default({
    autoplay: true,
    intervalMs: 4500,
    pauseOnHover: true,
    showIndicators: true,
    showArrows: true,
    transitionDurationMs: 420,
    aspectRatio: '4/3',
  }),
});

export const navigationMenuSchema = z
  .object({
    name: cleanText(80).optional().default(''),
    slug: cleanText(100).optional().default(''),
    label: cleanText(60).refine((v) => v.length >= 1, 'Menu label is required.'),
    type: z.enum(['link', 'dropdown', 'mega_menu']).optional().default('mega_menu'),
    url: safeUrlField,
    openInNewTab: z.boolean().optional().default(false),
    icon: cleanText(50).optional().default(''),
    badgeText: cleanText(24).optional().default(''),
    isActive: z.boolean().optional().default(true),
    isPublished: z.boolean().optional().default(true),
    displayOrder: z.number().int().min(0).optional().default(0),
    startsAt: z.string().nullable().optional().default(null),
    endsAt: z.string().nullable().optional().default(null),
    groups: z.array(navigationGroupSchema).max(16).optional().default([]),
    promotions: z.array(navigationPromotionSchema).max(8).optional().default([]),
    slides: z.array(navigationSlideSchema).max(24).optional().default([]),
    settings: navigationMenuSettingsSchema.optional().default({
      desktopVisible: true,
      mobileVisible: true,
      alignment: 'left',
      menuWidth: 'xl',
      maxHeightPx: 540,
      columns: 0,
      showIcons: true,
      showDescriptions: true,
      showPromotions: true,
      showSlider: true,
      sliderSettings: {
        autoplay: true,
        intervalMs: 4500,
        pauseOnHover: true,
        showIndicators: true,
        showArrows: true,
        transitionDurationMs: 420,
        aspectRatio: '4/3',
      },
    }),
  })
  .superRefine((data, ctx) => {
    if (data.startsAt && data.endsAt) {
      const s = new Date(data.startsAt).getTime();
      const e = new Date(data.endsAt).getTime();
      if (!Number.isNaN(s) && !Number.isNaN(e) && e < s) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: 'End date/time must be after start date/time.',
        });
      }
    }
  });

export const navigationMenuReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        displayOrder: z.number().int().min(0),
      }),
    )
    .min(1),
});

export const navigationMenuPublishSchema = z.object({
  isPublished: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const navigationSlidesReorderSchema = z.object({
  slideIds: z.array(z.string().trim().min(1)).min(1),
});
