import { z } from 'zod';

const isSafeUrl = (url: string) =>
  url === '' ||
  url.startsWith('/') ||
  url.startsWith('https://') ||
  url.startsWith('http://');

const safeUrlSchema = z
  .string()
  .trim()
  .max(400)
  .refine(isSafeUrl, 'URL must start with /, https://, or http://');

const colorString = z.string().trim().max(40);

export const BANNER_PLACEMENTS_ENUM = z.enum([
  'hero_bento',
  'homepage_hero',
  'above_hero',
  'below_hero',
  'above_categories',
  'below_categories',
  'above_featured',
  'below_featured',
  'above_bestsellers',
  'below_bestsellers',
  'between_sections',
  'homepage_mid',
  'homepage_bottom',
  'category_top',
  'promo_strip',
  'promotional_section',
  'wishlist_bottom',
  'custom',
]);

const buttonConfigSchema = z.object({
  text: z.string().trim().max(60).optional().default(''),
  url: safeUrlSchema.optional().default('/shop'),
  bgColor: colorString.optional().default('#145CFF'),
  textColor: colorString.optional().default('#FFFFFF'),
  borderColor: colorString.optional().default('#145CFF'),
  borderRadius: z.number().min(0).max(999).optional().default(999),
  size: z.enum(['sm', 'md', 'lg']).optional().default('md'),
  paddingX: z.number().min(6).max(64).optional().default(22),
  paddingY: z.number().min(4).max(32).optional().default(10),
  fontSize: z.number().min(10).max(28).optional().default(13),
  fontWeight: z.number().min(400).max(900).optional().default(600),
  hoverBgColor: colorString.optional().default('#0E47D9'),
  hoverTextColor: colorString.optional().default('#FFFFFF'),
  hoverAnimation: z.enum(['none', 'lift', 'scale', 'slide']).optional().default('lift'),
  align: z.enum(['left', 'center', 'right']).optional().default('left'),
  style: z.enum(['solid', 'outline', 'ghost']).optional().default('solid'),
});

export const bannerSchema = z
  .object({
    name: z.string().trim().max(160).optional().default(''),
    slug: z.string().trim().max(160).optional().default(''),
    title: z.string().trim().min(2, 'Banner title must be at least 2 characters.').max(160),
    highlightedTitle: z.string().trim().max(120).optional().default(''),
    eyebrow: z.string().trim().max(80).optional().default(''),
    promoLabel: z.string().trim().max(80).optional().default(''),
    subtitle: z.string().trim().max(300).optional().default(''),
    description: z.string().trim().max(600).optional().default(''),
    caption: z.string().trim().max(160).optional().default(''),
    desktopImageUrl: safeUrlSchema.optional().default(''),
    mobileImageUrl: safeUrlSchema.optional().default(''),
    cloudinaryPublicId: z.string().trim().max(240).optional().default(''),
    backgroundType: z
      .enum(['solid', 'gradient', 'image', 'gradient_image', 'image_overlay'])
      .optional(),
    backgroundColor: colorString.optional().default('#EAF1FF'),
    backgroundOpacity: z.number().min(0).max(100).optional().default(100),
    gradientConfig: z
      .object({
        type: z.enum(['linear', 'radial']).default('linear'),
        angle: z.number().min(0).max(360).default(135),
        stops: z
          .array(
            z.object({
              color: colorString.min(1),
              position: z.number().min(0).max(100),
            }),
          )
          .min(2)
          .max(6)
          .default([
            { color: '#E8F0FF', position: 0 },
            { color: '#CFE0FF', position: 100 },
          ]),
        opacity: z.number().min(0).max(100).default(100),
      })
      .optional(),
    imageSettings: z
      .object({
        objectFit: z.enum(['cover', 'contain', 'fill', 'auto']).default('cover'),
        position: z.string().trim().max(60).default('center center'),
        focalPoint: z
          .object({
            x: z.number().min(0).max(100).default(50),
            y: z.number().min(0).max(100).default(50),
          })
          .default({ x: 50, y: 50 }),
        repeat: z.enum(['no-repeat', 'repeat', 'repeat-x', 'repeat-y']).default('no-repeat'),
        opacity: z.number().min(0).max(100).default(85),
      })
      .optional(),
    overlaySettings: z
      .object({
        type: z.enum(['none', 'solid', 'gradient']).default('gradient'),
        color: colorString.default('#EAF1FF'),
        secondaryColor: colorString.default('#FFFFFF'),
        direction: z.string().trim().max(40).default('to right'),
        opacity: z.number().min(0).max(100).default(35),
      })
      .optional(),
    contentSettings: z
      .object({
        horizontalAlign: z.enum(['left', 'center', 'right']).default('left'),
        verticalAlign: z.enum(['top', 'middle', 'bottom']).default('middle'),
        tabletHorizontalAlign: z.enum(['left', 'center', 'right']).default('left'),
        mobileHorizontalAlign: z.enum(['left', 'center', 'right']).default('left'),
        contentWidth: z.string().trim().max(24).default('58%'),
        maxWidthPx: z.number().min(200).max(1280).default(540),
        paddingX: z.number().min(0).max(120).default(32),
        paddingY: z.number().min(0).max(120).default(32),
        elementSpacing: z.number().min(0).max(48).default(12),
        heightMode: z.enum(['auto', 'small', 'medium', 'large', 'custom']).default('medium'),
        minHeightPx: z.number().min(100).max(900).default(260),
        tabletMinHeightPx: z.number().min(100).max(900).default(230),
        mobileMinHeightPx: z.number().min(100).max(800).default(200),
      })
      .optional(),
    typographySettings: z
      .object({
        titleFontFamily: z.string().trim().max(80).default('Outfit'),
        subtitleFontFamily: z.string().trim().max(80).default('Plus Jakarta Sans'),
        titleFontSize: z.number().min(14).max(96).default(36),
        subtitleFontSize: z.number().min(11).max(40).default(15),
        descriptionFontSize: z.number().min(10).max(32).default(13),
        titleFontWeight: z.number().min(300).max(900).default(800),
        subtitleFontWeight: z.number().min(300).max(900).default(500),
        lineHeight: z.number().min(0.9).max(2.5).default(1.15),
        letterSpacing: z.number().min(-0.1).max(0.5).default(-0.02),
        textAlign: z.enum(['left', 'center', 'right']).default('left'),
        textTransform: z.enum(['none', 'uppercase', 'capitalize']).default('none'),
        titleColor: colorString.default('#0A1F44'),
        highlightColor: colorString.default('#145CFF'),
        subtitleColor: colorString.default('#475569'),
        descriptionColor: colorString.default('#64748B'),
        textShadow: z.string().trim().max(120).default('none'),
      })
      .optional(),
    ctaText: z.string().trim().max(60).default('Shop Now'),
    destinationUrl: safeUrlSchema.default('/shop'),
    secondaryCtaText: z.string().trim().max(60).optional().default(''),
    secondaryDestinationUrl: safeUrlSchema.optional().default('/offers'),
    buttonSettings: z
      .object({
        primary: buttonConfigSchema.optional(),
        secondary: buttonConfigSchema.optional(),
      })
      .optional(),
    styleSettings: z
      .object({
        presetKey: z.string().trim().max(60).default('modern_blue'),
        borderRadius: z.number().min(0).max(64).default(16),
        borderWidth: z.number().min(0).max(12).default(1),
        borderStyle: z.enum(['none', 'solid', 'dashed']).default('solid'),
        borderColor: colorString.default('#DCE6F7'),
        boxShadow: z.enum(['none', 'sm', 'md', 'lg', 'xl']).default('sm'),
        animation: z.enum(['none', 'fade_in', 'slide_up', 'zoom_subtle']).default('none'),
        hoverEffect: z.enum(['none', 'lift', 'zoom_image', 'glow']).default('lift'),
        decorativeBadge: z.boolean().default(true),
        decorativeGlow: z.boolean().default(false),
      })
      .optional(),
    placement: BANNER_PLACEMENTS_ENUM.default('hero_bento'),
    theme: z.enum(['royal-blue', 'ice-blue', 'midnight-navy']).default('royal-blue'),
    widthMode: z.enum(['full', 'half', 'one_third', 'two_thirds', 'custom']).default('full'),
    customWidthPercent: z.number().min(10).max(100).default(100),
    layoutSettings: z
      .object({
        desktopCols: z.number().int().min(1).max(6).default(1),
        tabletCols: z.number().int().min(1).max(4).default(1),
        mobileCols: z.number().int().min(1).max(2).default(1),
        columnGap: z.number().int().min(0).max(64).default(16),
        rowGap: z.number().int().min(0).max(64).default(16),
        customSlotKey: z.string().trim().max(80).default(''),
        visibleOnDesktop: z.boolean().default(true),
        visibleOnTablet: z.boolean().default(true),
        visibleOnMobile: z.boolean().default(true),
      })
      .optional(),
    displayOrder: z.number().int().min(0).max(10000).default(1),
    priority: z.number().int().min(-1000).max(10000).default(0),
    status: z.enum(['draft', 'published', 'scheduled', 'inactive']).optional(),
    startsAt: z.string().nullable().optional(),
    endsAt: z.string().nullable().optional(),
    isPublished: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    const effectiveBgType = data.backgroundType || (data.desktopImageUrl ? 'image_overlay' : 'gradient');
    if ((effectiveBgType === 'image' || effectiveBgType === 'image_overlay') && !data.desktopImageUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['desktopImageUrl'],
        message: 'A background image is required when Image or Image Overlay background type is selected.',
      });
    }
    if (data.startsAt && data.endsAt) {
      const start = new Date(data.startsAt).getTime();
      const end = new Date(data.endsAt).getTime();
      if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['endsAt'],
          message: 'End date must be after start date.',
        });
      }
    }
  });

export const bannerStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'scheduled', 'inactive']),
});

export const bannerReorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        displayOrder: z.number().int().min(0).max(10000),
      }),
    )
    .min(1)
    .max(200),
});

export type BannerInput = z.infer<typeof bannerSchema>;
export type BannerStatusInput = z.infer<typeof bannerStatusSchema>;
export type BannerReorderInput = z.infer<typeof bannerReorderSchema>;
