import { z } from 'zod';

export const cmsPageSchema = z.object({
  slug: z.string().trim().min(2).max(100).toLowerCase(),
  title: z.string().trim().min(2).max(160),
  content: z.string().min(5),
  isPublished: z.boolean().default(true),
  seoTitle: z.string().max(140).optional(),
  seoDescription: z.string().max(240).optional(),
});

export const faqSchema = z.object({
  question: z.string().trim().min(4).max(300),
  answer: z.string().trim().min(4).max(3000),
  category: z.string().trim().default('General'),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(true),
});

export const blogSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(2).max(180).toLowerCase(),
  excerpt: z.string().max(400).default(''),
  content: z.string().min(10),
  coverImageUrl: z.string().optional(),
  authorName: z.string().default('NOVARA Editorial'),
  category: z.string().default('Buying Guides'),
  tags: z.array(z.string()).default([]),
  isPublished: z.boolean().default(true),
  seoTitle: z.string().max(140).optional(),
  seoDescription: z.string().max(240).optional(),
});

export const supportUpdateSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
  internalNote: z.string().trim().max(500).optional(),
});

// Explicit allowlisted schema for HomepageConfig / Store Settings mutations (prevents key overwrite or arbitrary field injection)
export const homepageConfigPatchSchema = z
  .object({
    storeInfo: z
      .object({
        storeName: z.string().trim().min(1).max(120),
        tagline: z.string().trim().max(200).optional().default(''),
        description: z.string().max(500).optional().default(''),
        logoUrl: z.string().max(400).optional().default(''),
        faviconUrl: z.string().max(400).optional().default(''),
        supportPhone: z.string().max(40).optional().default(''),
        supportEmail: z.string().max(120).optional().default(''),
      })
      .optional(),
    currencySettings: z
      .object({
        code: z.string().trim().min(2).max(10),
        symbol: z.string().trim().min(1).max(6),
        position: z.enum(['prefix', 'suffix']),
      })
      .optional(),
    announcementBar: z
      .object({
        enabled: z.boolean(),
        text: z.string().max(300),
        linkText: z.string().max(80).optional(),
        linkUrl: z.string().max(300).optional(),
      })
      .optional(),
    headerSettings: z
      .object({
        showSearch: z.boolean(),
        showWishlist: z.boolean(),
        showCategoryMenu: z.boolean(),
        stickyHeader: z.boolean(),
        specialOfferLabel: z.string().max(80),
        specialOfferUrl: z.string().max(300),
      })
      .optional(),
    footerSettings: z
      .object({
        description: z.string().max(500),
        tagline: z.string().max(200),
        copyrightText: z.string().max(200),
        storeStatus: z.enum(['live', 'maintenance']),
        columns: z
          .array(
            z.object({
              title: z.string().max(80),
              links: z.array(z.object({ label: z.string().max(80), url: z.string().max(300) })),
            }),
          )
          .default([]),
      })
      .optional(),
    navigationMenu: z
      .array(
        z.object({
          label: z.string().trim().min(1).max(80),
          url: z.string().trim().min(1).max(300),
          icon: z.string().max(60).optional(),
          openInNewTab: z.boolean().optional(),
          sortOrder: z.number().int().default(0),
          isActive: z.boolean().default(true),
        }),
      )
      .optional(),
    homepageSections: z
      .array(
        z.object({
          key: z.string().trim().min(1),
          title: z.string().trim().min(1).max(120),
          subtitle: z.string().max(240).optional(),
          enabled: z.boolean().default(true),
          sortOrder: z.number().int().default(0),
          productIds: z.array(z.string()).default([]),
        }),
      )
      .optional(),
    heroSlides: z
      .array(
        z.object({
          badgeText: z.string().max(60),
          headlineLine1: z.string().max(140),
          headlineLine2: z.string().max(140),
          subtitle: z.string().max(300),
          ctaLabel: z.string().max(60),
          ctaUrl: z.string().max(300),
          imageUrl: z.string().max(400),
          cloudinaryPublicId: z.string().optional(),
          isActive: z.boolean().default(true),
        }),
      )
      .optional(),
    promoBentoCards: z
      .array(
        z.object({
          eyebrow: z.string().max(60),
          title: z.string().max(120),
          subtitle: z.string().max(200),
          ctaLabel: z.string().max(60),
          ctaUrl: z.string().max(300),
          imageUrl: z.string().max(400),
          theme: z.enum(['royal-blue', 'ice-blue', 'midnight-navy']),
        }),
      )
      .optional(),
    featureBanners: z
      .object({
        giftBanner: z.object({
          enabled: z.boolean(),
          title: z.string().max(120),
          subtitle: z.string().max(160),
          description: z.string().max(300),
          ctaLabel: z.string().max(60),
          ctaUrl: z.string().max(300),
        }),
        trustBanner: z.object({
          enabled: z.boolean(),
          title: z.string().max(120),
          subtitle: z.string().max(160),
          bullets: z.array(z.string().max(100)),
        }),
      })
      .optional(),
    sectionOrder: z.array(z.string()).optional(),
    enabledSections: z.record(z.string(), z.boolean()).optional(),
    shippingSettings: z
      .object({
        dhakaMetroCharge: z.number().min(0),
        dhakaSuburbCharge: z.number().min(0),
        nationwideCharge: z.number().min(0),
        freeShippingThreshold: z.number().min(0),
        expressSurcharge: z.number().min(0),
      })
      .optional(),
    deliveryZones: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(80),
          divisions: z.array(z.string()),
          charge: z.number().min(0),
          freeAbove: z.number().min(0),
          estimatedDays: z.string().max(60),
          isActive: z.boolean(),
        }),
      )
      .optional(),
    deliveryOptions: z
      .array(
        z.object({
          code: z.string().trim().min(1).max(40),
          name: z.string().trim().min(1).max(80),
          description: z.string().max(160).optional().default(''),
          estimatedTime: z.string().max(80).default('Within 2–5 Business Days'),
          methodType: z.enum(['standard', 'express']).default('standard'),
          surcharge: z.number().min(0).default(0),
          freeShippingEligible: z.boolean().default(true),
          isActive: z.boolean().default(true),
          sortOrder: z.number().int().default(0),
          divisions: z.array(z.string()).optional().default(['All']),
        }),
      )
      .optional(),
    paymentMethods: z
      .object({
        codEnabled: z.boolean(),
        sslcommerzEnabled: z.boolean(),
        bkashEnabled: z.boolean(),
        nagadEnabled: z.boolean().optional().default(true),
        cardEnabled: z.boolean(),
        codMaxAmount: z.number().min(0),
        codInstructions: z.string().max(400),
      })
      .optional(),
    taxSettings: z
      .object({
        enabled: z.boolean(),
        label: z.string().max(40),
        ratePercent: z.number().min(0).max(50),
        inclusive: z.boolean(),
      })
      .optional(),
    emailSettings: z
      .object({
        senderName: z.string().max(120),
        senderEmail: z.string().max(140),
        replyTo: z.string().max(140),
        orderConfirmationSubject: z.string().max(200),
        shippingUpdateSubject: z.string().max(200),
      })
      .optional(),
    notificationSettings: z
      .object({
        lowStockAlert: z.boolean(),
        newOrderAlert: z.boolean(),
        newReviewAlert: z.boolean(),
        newEnquiryAlert: z.boolean(),
        lowStockThresholdDefault: z.number().int().min(0),
      })
      .optional(),
    securitySettings: z
      .object({
        requireEmailVerification: z.boolean(),
        sessionTimeoutHours: z.number().int().min(1).max(720),
        maxLoginAttempts: z.number().int().min(3).max(100),
        maintenanceBypassAdmin: z.boolean(),
      })
      .optional(),
    maintenanceMode: z
      .object({
        enabled: z.boolean(),
        title: z.string().max(160),
        message: z.string().max(500),
      })
      .optional(),
    promotionalPopups: z
      .array(
        z.object({
          title: z.string().max(140),
          subtitle: z.string().max(300).optional().default(''),
          imageUrl: z.string().max(400).optional(),
          ctaLabel: z.string().max(60),
          ctaUrl: z.string().max(300),
          couponCode: z.string().max(40).optional(),
          delaySeconds: z.number().int().min(0).max(120),
          isActive: z.boolean(),
          startsAt: z.string().nullable().optional(),
          endsAt: z.string().nullable().optional(),
        }),
      )
      .optional(),
    contactInfo: z
      .object({
        phone: z.string().max(60).optional(),
        email: z.string().max(140).optional(),
        address: z.string().max(300).optional(),
        whatsappUrl: z.string().max(300).optional(),
        messengerUrl: z.string().max(300).optional(),
        instagramUrl: z.string().max(300).optional(),
        linkedinUrl: z.string().max(300).optional(),
        facebookUrl: z.string().max(300).optional(),
        youtubeUrl: z.string().max(300).optional(),
        xUrl: z.string().max(300).optional(),
        tiktokUrl: z.string().max(300).optional(),
      })
      .optional(),
    seoDefaults: z
      .object({
        siteName: z.string().max(120),
        defaultTitle: z.string().max(180),
        defaultDescription: z.string().max(300),
      })
      .optional(),
    productTrustHighlights: z
      .array(
        z.object({
          icon: z.string().max(40).default('ShieldCheck'),
          title: z.string().trim().min(1).max(80),
          subtitle: z.string().max(100).optional().default(''),
          isActive: z.boolean().default(true),
        }),
      )
      .max(8)
      .optional(),
    cartHeroSettings: z
      .object({
        enabled: z.boolean().default(true),
        autoplay: z.boolean().default(true),
        autoplayIntervalMs: z.number().int().min(1500).max(30000).default(5000),
        showDots: z.boolean().default(true),
        showArrows: z.boolean().default(true),
        transitionEffect: z.enum(['fade', 'slide']).default('fade'),
        confidenceBanner: z
          .object({
            enabled: z.boolean().default(true),
            title: z.string().trim().max(120).default('Shop with Confidence'),
            subtitle: z.string().trim().max(200).default('Safe Payment  |  Secure Checkout  |  7-Day Return Policy'),
          })
          .optional(),
      })
      .optional(),
    checkoutHeroSettings: z
      .object({
        enabled: z.boolean().default(true),
        autoplay: z.boolean().default(true),
        autoplayIntervalMs: z.number().int().min(1500).max(30000).default(5500),
        showDots: z.boolean().default(true),
        showArrows: z.boolean().default(false),
        transitionEffect: z.enum(['fade', 'slide']).default('fade'),
        confidenceBanner: z
          .object({
            enabled: z.boolean().default(true),
            title: z.string().trim().max(120).default('Shop with Confidence'),
            subtitle: z.string().trim().max(200).default('7-Day Return Policy • Secure Payment • 100% Genuine Products'),
          })
          .optional(),
      })
      .optional(),
    wishlistHeroSettings: z
      .object({
        enabled: z.boolean().default(true),
        autoplay: z.boolean().default(true),
        autoplayIntervalMs: z.number().int().min(1500).max(30000).default(5000),
        showDots: z.boolean().default(true),
        showArrows: z.boolean().default(false),
        transitionEffect: z.enum(['fade', 'slide']).default('fade'),
      })
      .optional(),
  })
  .strict();

