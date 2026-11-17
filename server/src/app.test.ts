import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createExpressApp } from './app';
import {
  buildCategoryAncestryPath,
  buildProductCatalogFilter,
  collectDescendantCategoryIds,
  enrichProductPricing,
  getCatalogSortSpec,
  resolveVariantImageUrl,
} from './modules/products/productCatalogHelpers';
import { BrandModel, CategoryModel } from './modules/categories/category.model';
import { ProductModel } from './modules/products/product.model';
import { brandSchema } from './modules/categories/brand.validation';
import { categorySchema } from './modules/categories/category.validation';
import { createBrand, updateBrand, deleteBrand } from './modules/categories/brand.service';
import { createCategory, updateCategory, deleteCategory } from './modules/categories/category.service';
import { updateProductStatusAdmin, updateAttributeAdmin, deleteAttributeAdmin } from './modules/products/product.service';
import { ProductAttributePresetModel } from './modules/cms/cms.model';
import {
  heroSlideSchema,
  heroSlideStatusSchema,
  heroSlideReorderSchema,
} from './modules/hero-slides/heroSlide.validation';
import { bannerSchema, bannerStatusSchema, bannerReorderSchema } from './modules/banners/banner.validation';
import { homepageConfigPatchSchema } from './modules/cms/cmsSettings.validation';
import {
  homepageLayoutSectionSchema,
  homepageLayoutUpdateSchema,
  homepageSectionReorderSchema,
} from './modules/cms/homepageLayout.validation';
import { getAuthCookieOptions, setAuthCookie, logoutController } from './modules/auth/auth.controller';
import { registerSchema, resetPasswordSchema } from './modules/auth/auth.validation';
import { registerCustomerAccount, findOrLinkOAuthUser } from './modules/auth/auth.service';
import { authenticateRequired, requirePermission, signAuthToken, type AuthenticatedRequest } from './middleware/auth.middleware';
import { UserModel } from './modules/users/user.model';
import { OrderModel, PaymentTransactionModel } from './modules/orders/order.model';
import { InventoryMovementModel } from './modules/inventory/inventoryMovement.model';
import { reviewCancellationRequestAdmin } from './modules/orders/order.admin.service';
import { cancellationRequestReviewSchema } from './modules/orders/order.admin.validation';
import { NavigationMenuModel } from './modules/navigation/navigation.model';
import { HomepageConfigModel } from './modules/cms/cms.model';
import {
  navigationMenuSchema,
  navigationSlideSchema,
  navigationSliderSettingsSchema,
} from './modules/navigation/navigation.validation';
import {
  addMenuSlideAdmin,
  createNavigationMenuAdmin,
  deleteMenuSlideAdmin,
  duplicateNavigationMenuAdmin,
  listNavigationMenusAdmin,
  reorderNavigationMenusAdmin,
  updateMenuSlideAdmin,
} from './modules/navigation/navigation.service';

import {
  answerQuestionSchema,
  attributeGroupSchema,
  attributePresetSchema,
  productQuestionSchema,
  productSchema,
} from './modules/products/product.validation';
import { getAdminOverviewData } from './modules/analytics/analytics.service';
import { listStockLevels } from './modules/inventory/inventory.service';
import {
  transitionOrderStatusAdmin,
  updateOrderPaymentStatusAdmin,
  updateReturnAdmin,
} from './modules/orders/order.admin.service';
import { orderPaymentStatusUpdateSchema } from './modules/orders/order.admin.validation';
import { listCategoriesAdmin } from './modules/categories/category.service';
import { bulkProductActionAdmin } from './modules/products/product.service';
import { couponSchema, discountRuleSchema } from './modules/coupons/coupon.validation';
import { deleteCouponAdmin } from './modules/coupons/coupon.service';
import { deleteCmsPageAdmin } from './modules/cms/cmsSettings.service';
import { updateCustomerStatusAdmin, deleteCustomerGroupAdmin } from './modules/users/customer.service';
import { updateStaffAdmin } from './modules/support/system.service';
import { CouponModel } from './modules/coupons/coupon.model';
import { CmsPageModel } from './modules/cms/cms.model';
import { CustomerGroupModel } from './modules/users/user.model';
import { ReturnRequestModel, ReviewModel } from './modules/reviews/review.model';
import { AuditLogModel, SiteVisitModel, SupportEnquiryModel } from './modules/support/support.model';

async function withTestServer(fn: (baseUrl: string) => Promise<void>) {
  const app = createExpressApp();
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  try {
    await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test('API health reports database disconnected honestly when Atlas is not configured', async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    const body = (await res.json()) as { ok: boolean; database: string; integrations: Record<string, boolean> };
    assert.equal(res.status, 503);
    assert.equal(body.ok, false);
    assert.equal(body.database, 'disconnected');
    assert.equal(typeof body.integrations.cloudinary, 'boolean');

    // When proxied behind container nginx (with X-Forwarded-Host), status maps to proxy-passthrough 424 JSON
    const prevNginxPort = process.env.NGINX_PORT;
    process.env.NGINX_PORT = '8080';
    try {
      const proxiedRes = await fetch(`${baseUrl}/api/health`, {
        headers: { 'X-Forwarded-Host': 'ais-dev-example.run.app' },
      });
      const proxiedBody = (await proxiedRes.json()) as { ok: boolean; database: string };
      assert.equal(proxiedRes.status, 424);
      assert.equal(proxiedRes.headers.get('x-origin-status'), '503');
      assert.equal(proxiedRes.headers.get('content-type')?.includes('application/json'), true);
      assert.equal(proxiedBody.ok, false);
      assert.equal(proxiedBody.database, 'disconnected');
    } finally {
      if (prevNginxPort === undefined) {
        delete process.env.NGINX_PORT;
      } else {
        process.env.NGINX_PORT = prevNginxPort;
      }
    }
  });
});

test('Unknown /api and /api/* routes plus malformed JSON return structured JSON rather than HTML', async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/does-not-exist`);
    const body = (await res.json()) as { ok: boolean; code: string };
    assert.equal(res.status, 404);
    assert.equal(res.headers.get('content-type')?.includes('application/json'), true);
    assert.equal(body.ok, false);
    assert.equal(body.code, 'API_NOT_FOUND');

    const rootApiRes = await fetch(`${baseUrl}/api`);
    const rootBody = (await rootApiRes.json()) as { ok: boolean; code: string };
    assert.equal(rootApiRes.status, 404);
    assert.equal(rootApiRes.headers.get('content-type')?.includes('application/json'), true);
    assert.equal(rootBody.ok, false);
    assert.equal(rootBody.code, 'API_NOT_FOUND');

    const badJsonRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"email":',
    });
    const badJsonBody = (await badJsonRes.json()) as { ok: boolean; code: string };
    assert.equal(badJsonRes.status, 400);
    assert.equal(badJsonRes.headers.get('content-type')?.includes('application/json'), true);
    assert.equal(badJsonBody.ok, false);
    assert.equal(badJsonBody.code, 'INVALID_JSON_BODY');
  });
});

test('Catalog and storefront API routes return JSON with no-store Cache-Control and never hijack SPA /pages/:slug', async () => {
  await withTestServer(async (baseUrl) => {
    const prodRes = await fetch(`${baseUrl}/api/products`);
    assert.equal(prodRes.status, 503);
    assert.ok(prodRes.headers.get('content-type')?.includes('application/json'));
    assert.ok(prodRes.headers.get('cache-control')?.includes('no-store'));

    const homeRes = await fetch(`${baseUrl}/api/storefront/homepage`);
    assert.equal(homeRes.status, 503);
    assert.ok(homeRes.headers.get('content-type')?.includes('application/json'));
    assert.ok(homeRes.headers.get('cache-control')?.includes('no-store'));

    // /pages/about-us must NOT be intercepted by Express JSON storefrontRoutes at root
    const spaPageRes = await fetch(`${baseUrl}/pages/about-us`);
    assert.equal(spaPageRes.status, 404);

    // /api/storefront/pages/about-us hits the API route
    const apiPageRes = await fetch(`${baseUrl}/api/storefront/pages/about-us`);
    assert.equal(apiPageRes.status, 503);
    assert.ok(apiPageRes.headers.get('content-type')?.includes('application/json'));
  });
});

test('Protected checkout and admin endpoints fail closed when DB/auth is unavailable', async () => {
  await withTestServer(async (baseUrl) => {
    const checkoutRes = await fetch(`${baseUrl}/api/orders/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    assert.ok(checkoutRes.status === 401 || checkoutRes.status === 503);

    const adminRes = await fetch(`${baseUrl}/api/admin/overview`);
    assert.ok(adminRes.status === 401 || adminRes.status === 503);
  });
});

test('SEO robots.txt and sitemap.xml return expected content types', async () => {
  await withTestServer(async (baseUrl) => {
    const robots = await fetch(`${baseUrl}/robots.txt`);
    const robotsText = await robots.text();
    assert.equal(robots.status, 200);
    assert.ok(robotsText.includes('Disallow: /admin'));
    assert.ok(robotsText.includes('Sitemap:'));

    const sitemap = await fetch(`${baseUrl}/sitemap.xml`);
    const xml = await sitemap.text();
    assert.equal(sitemap.status, 200);
    assert.ok(xml.includes('<urlset'));
  });
});

test('Product catalog helpers handle category ancestry, variant stock, discount filters, and sorting', () => {
  const categories = [
    { _id: 'c1', slug: 'electronics', parentId: null },
    { _id: 'c2', slug: 'mobiles-tablets', parentId: 'c1' },
    { _id: 'c3', slug: 'android-phones', parentId: 'c2' },
  ];

  const descendants = collectDescendantCategoryIds('c1', categories);
  assert.deepEqual(descendants, ['c1', 'c2', 'c3']);

  const path = buildCategoryAncestryPath({
    categoryId: 'c2',
    subCategoryId: 'c3',
    allCategories: categories,
  });
  assert.ok(path.includes('electronics'));
  assert.ok(path.includes('mobiles-tablets'));
  assert.ok(path.includes('android-phones'));

  const filter = buildProductCatalogFilter({
    categoryIds: ['c1', 'c2'],
    inStockOnly: true,
    discountOnly: true,
    section: 'featured',
  });
  assert.equal(filter.status, 'published');
  assert.ok(Array.isArray(filter.$and) && filter.$and.length >= 4);

  const enriched = enrichProductPricing({
    _id: 'p1',
    basePrice: 1000,
    salePrice: 800,
    stockOnHand: 0,
    reservedStock: 0,
    hasVariants: true,
    variants: [
      { stockOnHand: 5, reservedStock: 2, isActive: true },
      { stockOnHand: 10, reservedStock: 0, isActive: false },
    ],
    categoryId: { _id: 'c2', name: 'Mobiles', slug: 'mobiles-tablets' },
  });
  assert.equal(enriched.id, 'p1');
  assert.equal(enriched.currentPrice, 800);
  assert.equal(enriched.originalPrice, 1000);
  assert.equal(enriched.discountPercent, 20);
  assert.equal(enriched.availableStock, 3);

  assert.deepEqual(getCatalogSortSpec('price_asc'), { _effectivePrice: 1, createdAt: -1 });
  assert.deepEqual(getCatalogSortSpec('newest'), { createdAt: -1 });
});

test('Extended admin & storefront JSON endpoints handle DB disconnection cleanly without HTML leaks', async () => {
  await withTestServer(async (baseUrl) => {
    for (const path of [
      '/api/admin/system-health',
      '/api/admin/logs',
      '/api/admin/customer-groups',
      '/api/admin/promotions/rules',
      '/api/storefront/offers',
      '/api/storefront/blogs',
      '/api/storefront/faqs',
    ]) {
      const res = await fetch(`${baseUrl}${path}`);
      assert.ok(res.status === 401 || res.status === 503, `Expected 401/503 for ${path}, got ${res.status}`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'), `Expected JSON for ${path}`);
    }

    const visitRes = await fetch(`${baseUrl}/api/storefront/analytics/visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionKey: 'test-session-1234', path: '/' }),
    });
    assert.equal(visitRes.status, 200);
    const visitBody = (await visitRes.json()) as { ok: boolean; recorded: boolean };
    assert.equal(visitBody.ok, true);
    assert.equal(visitBody.recorded, false);
  });
});

test('Dedicated /api/auth/admin/login and modular admin endpoints fail closed as structured JSON', async () => {
  await withTestServer(async (baseUrl) => {
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cm@gmail.com', password: 'demo-check-password' }),
    });
    assert.equal(adminLoginRes.status, 503);
    assert.ok(adminLoginRes.headers.get('content-type')?.includes('application/json'));
    const adminLoginBody = (await adminLoginRes.json()) as { ok: boolean; code: string };
    assert.equal(adminLoginBody.ok, false);
    assert.equal(adminLoginBody.code, 'DATABASE_UNAVAILABLE');

    for (const endpoint of [
      '/api/admin/hero-slides',
      '/api/admin/banners',
      '/api/admin/products/507f1f77bcf86cd799439011',
      '/api/admin/reviews/507f1f77bcf86cd799439011',
      '/api/admin/orders/507f1f77bcf86cd799439011',
      '/api/admin/customers/507f1f77bcf86cd799439011',
      '/api/admin/staff',
      '/api/admin/roles',
      '/api/admin/audit-logs',
    ]) {
      const res = await fetch(`${baseUrl}${endpoint}`);
      assert.ok(res.status === 401 || res.status === 503, `Expected 401/503 for ${endpoint}, got ${res.status}`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'), `Expected JSON for ${endpoint}`);
    }
  });
});

test('Zod validation schemas enforce strict allowlists for hero slides, banners, and CMS settings', () => {
  const validSlide = heroSlideSchema.safeParse({
    badgeText: 'New Launch',
    heading: 'Smart Technology',
    headlineLine2: 'Better Life',
    subtitle: 'Curated tech for Dhaka and nationwide',
    desktopImageUrl: 'https://cdn.example.com/hero.jpg',
    mobileImageUrl: '/assets/hero-mobile.jpg',
    ctaText: 'Shop Now',
    ctaUrl: '/shop',
    sortOrder: 1,
    isActive: true,
  });
  assert.equal(validSlide.success, true);

  const invalidSlideUrl = heroSlideSchema.safeParse({
    heading: 'Test Slide',
    desktopImageUrl: 'https://cdn.example.com/hero.jpg',
    ctaUrl: 'javascript:alert(1)',
  });
  assert.equal(invalidSlideUrl.success, false);

  const validBanner = bannerSchema.safeParse({
    title: 'Big Winter Sale',
    desktopImageUrl: 'https://cdn.example.com/banner.jpg',
    placement: 'hero_bento',
    theme: 'royal-blue',
    ctaText: 'Explore',
    destinationUrl: '/shop?discount=true',
    priority: 10,
    isPublished: true,
  });
  assert.equal(validBanner.success, true);

  const validSettingsPatch = homepageConfigPatchSchema.safeParse({
    storeInfo: {
      storeName: 'NOVARA COMMERCE',
      tagline: 'Smart Tech Store',
      description: 'Premium store',
      supportPhone: '+8801700000000',
      supportEmail: 'support@novara.com',
    },
  });
  assert.equal(validSettingsPatch.success, true);

  const strictRejected = homepageConfigPatchSchema.safeParse({
    _id: '507f1f77bcf86cd799439011',
    __v: 0,
    storeInfo: { storeName: 'NOVARA' },
  });
  assert.equal(strictRejected.success, false);
});

test('Auth cookies use SameSite=None; Secure behind HTTPS proxy and SameSite=Lax on plain HTTP', () => {
  const httpsReq = {
    secure: false,
    get: (name: string) => (name.toLowerCase() === 'x-forwarded-proto' ? 'https' : undefined),
  } as unknown as Parameters<typeof getAuthCookieOptions>[0];
  const httpsOpts = getAuthCookieOptions(httpsReq);
  assert.equal(httpsOpts.httpOnly, true);
  assert.equal(httpsOpts.sameSite, 'none');
  assert.equal(httpsOpts.secure, true);

  const httpReq = {
    secure: false,
    get: () => undefined,
  } as unknown as Parameters<typeof getAuthCookieOptions>[0];
  const httpOpts = getAuthCookieOptions(httpReq);
  assert.equal(httpOpts.httpOnly, true);
  assert.equal(httpOpts.sameSite, 'lax');
  assert.equal(httpOpts.secure, false);

  const captured: Array<{ name: string; val?: string; opts: Record<string, unknown> }> = [];
  const mockRes = {
    cookie: (name: string, val: string, opts: Record<string, unknown>) => captured.push({ name, val, opts }),
    clearCookie: (name: string, opts: Record<string, unknown>) => captured.push({ name, opts }),
    json: () => undefined,
  } as unknown as Parameters<typeof setAuthCookie>[1];

  setAuthCookie(httpsReq, mockRes, 'jwt-sample');
  assert.equal(captured[0].name, 'novara_token');
  assert.equal(captured[0].opts.sameSite, 'none');
  assert.equal(captured[0].opts.secure, true);

  logoutController(httpsReq, mockRes);
  assert.equal(captured[1].name, 'novara_token');
  assert.equal(captured[1].opts.sameSite, 'none');
  assert.equal(captured[1].opts.secure, true);
});

test('Helmet permits embedded iframe preview and cross-origin asset loading', async () => {
  await withTestServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.headers.get('x-frame-options'), null);
    assert.equal(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
  });
});

test('authenticateRequired and requirePermission enforce JWT Bearer authentication and role RBAC', async () => {
  const originalFindById = UserModel.findById;
  try {
    // 1. Missing token -> 401 UNAUTHENTICATED
    let statusCode = 0;
    let payload: Record<string, unknown> = {};
    const makeRes = () =>
      ({
        status(code: number) {
          statusCode = code;
          return this;
        },
        json(body: Record<string, unknown>) {
          payload = body;
          return this;
        },
      }) as unknown as Parameters<typeof authenticateRequired>[1];

    await authenticateRequired(
      { cookies: {}, headers: {} } as unknown as AuthenticatedRequest,
      makeRes(),
      () => undefined,
    );
    assert.equal(statusCode, 401);
    assert.equal(payload.code, 'UNAUTHENTICATED');

    // 2. Valid Bearer token -> resolves user; RBAC differentiates super_admin vs customer
    const adminUser = {
      _id: '507f1f77bcf86cd799439011',
      role: 'super_admin' as const,
      email: 'admin@novara.test',
      status: 'active',
      customPermissions: [],
    };
    const customerUser = {
      _id: '507f1f77bcf86cd799439012',
      role: 'customer' as const,
      email: 'customer@novara.test',
      status: 'active',
      customPermissions: [],
    };
    UserModel.findById = (async (id: unknown) =>
      String(id) === adminUser._id ? adminUser : String(id) === customerUser._id ? customerUser : null) as never;

    const adminReq = {
      cookies: {},
      headers: { authorization: `Bearer ${signAuthToken(adminUser)}` },
    } as unknown as AuthenticatedRequest;
    let nextCalled = false;
    await authenticateRequired(adminReq, makeRes(), () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true);
    assert.equal(adminReq.user?.role, 'super_admin');

    let adminPermGranted = false;
    requirePermission('catalog.manage')(adminReq, makeRes(), () => {
      adminPermGranted = true;
    });
    assert.equal(adminPermGranted, true);

    const custReq = {
      cookies: {},
      headers: { authorization: `Bearer ${signAuthToken(customerUser)}` },
    } as unknown as AuthenticatedRequest;
    await authenticateRequired(custReq, makeRes(), () => undefined);

    statusCode = 0;
    payload = {};
    let custPermGranted = false;
    requirePermission('catalog.manage')(custReq, makeRes(), () => {
      custPermGranted = true;
    });
    assert.equal(custPermGranted, false);
    assert.equal(statusCode, 403);
    assert.equal(payload.code, 'FORBIDDEN');

    // 3. cms.manage permission check differentiates super_admin vs customer
    let cmsAdminGranted = false;
    requirePermission('cms.manage')(adminReq, makeRes(), () => {
      cmsAdminGranted = true;
    });
    assert.equal(cmsAdminGranted, true);

    statusCode = 0;
    payload = {};
    let cmsCustGranted = false;
    requirePermission('cms.manage')(custReq, makeRes(), () => {
      cmsCustGranted = true;
    });
    assert.equal(cmsCustGranted, false);
    assert.equal(statusCode, 403);
    assert.equal(payload.code, 'FORBIDDEN');
  } finally {
    UserModel.findById = originalFindById;
  }
});

test('Dynamic Banner Builder schemas allow solid/gradient without images and enforce conditional rules', () => {
  const solidBanner = bannerSchema.safeParse({
    title: 'Flash Tech Deals',
    subtitle: 'Up to 30% off audio',
    backgroundType: 'solid',
    backgroundColor: '#145CFF',
    backgroundOpacity: 95,
    placement: 'above_featured',
    widthMode: 'half',
    displayOrder: 2,
    status: 'draft',
    isPublished: false,
  });
  assert.equal(solidBanner.success, true);

  const gradientBanner = bannerSchema.safeParse({
    title: 'Weekend Gradient Showcase',
    backgroundType: 'gradient',
    gradientConfig: {
      type: 'linear',
      angle: 135,
      stops: [
        { color: '#145CFF', position: 0 },
        { color: '#0A2DFF', position: 100 },
      ],
      opacity: 90,
    },
    placement: 'below_categories',
    ctaText: 'Explore',
    destinationUrl: '/shop',
  });
  assert.equal(gradientBanner.success, true);

  const imageMissingUrl = bannerSchema.safeParse({
    title: 'Missing Image Banner',
    backgroundType: 'image_overlay',
    desktopImageUrl: '',
    placement: 'hero_bento',
  });
  assert.equal(imageMissingUrl.success, false);

  const badDestination = bannerSchema.safeParse({
    title: 'Unsafe Banner',
    backgroundType: 'solid',
    destinationUrl: 'javascript:alert(1)',
  });
  assert.equal(badDestination.success, false);

  const invertedDates = bannerSchema.safeParse({
    title: 'Bad Schedule',
    backgroundType: 'solid',
    startsAt: '2026-12-10T00:00:00.000Z',
    endsAt: '2026-12-01T00:00:00.000Z',
  });
  assert.equal(invertedDates.success, false);

  assert.equal(bannerStatusSchema.safeParse({ status: 'published' }).success, true);
  assert.equal(bannerStatusSchema.safeParse({ status: 'archived' }).success, false);

  assert.equal(
    bannerReorderSchema.safeParse({
      items: [
        { id: 'b1', displayOrder: 1 },
        { id: 'b2', displayOrder: 2 },
      ],
    }).success,
    true,
  );
  assert.equal(bannerReorderSchema.safeParse({ items: [] }).success, false);
});

test('Homepage Layout schemas validate sections, URLs, product sources, and reorder payloads', () => {
  const validSection = homepageLayoutSectionSchema.safeParse({
    sectionId: 'dynamic_banner_mid',
    sectionType: 'dynamic_banner',
    title: 'Mid-Page Feature Banner',
    enabled: true,
    displayOrder: 4,
    widthMode: 'full',
    sourceReferences: {
      productSourceMode: 'featured',
      productIds: [],
      productCount: 8,
      sortBy: 'popular',
      bannerPlacement: 'above_featured',
      bannerIds: ['507f1f77bcf86cd799439011'],
    },
  });
  assert.equal(validSection.success, true);

  const invalidType = homepageLayoutSectionSchema.safeParse({
    sectionId: 'bad_sec',
    sectionType: 'unknown_widget',
    title: 'Bad Section',
  });
  assert.equal(invalidType.success, false);

  const invalidCtaUrl = homepageLayoutSectionSchema.safeParse({
    sectionId: 'bad_url',
    sectionType: 'custom_content',
    title: 'Custom Content',
    contentSettings: {
      ctaUrl: 'javascript:void(0)',
    },
  });
  assert.equal(invalidCtaUrl.success, false);

  assert.equal(
    homepageLayoutUpdateSchema.safeParse({
      name: 'Default Homepage',
      sections: [
        {
          sectionId: 'hero_slider',
          sectionType: 'hero_slider',
          title: 'Hero Slider',
          displayOrder: 0,
        },
      ],
    }).success,
    true,
  );

  assert.equal(
    homepageSectionReorderSchema.safeParse({
      order: [
        { sectionId: 'hero_slider', displayOrder: 0 },
        { sectionId: 'featured_products', displayOrder: 1 },
      ],
    }).success,
    true,
  );
});

test('Public /api/homepage/* and admin banner/layout endpoints enforce JSON + no-store and fail closed', async () => {
  await withTestServer(async (baseUrl) => {
    for (const publicPath of ['/api/homepage/layout', '/api/homepage/banners']) {
      const res = await fetch(`${baseUrl}${publicPath}`);
      assert.equal(res.status, 503, `Expected 503 for ${publicPath} when DB offline`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'), `Expected JSON for ${publicPath}`);
      assert.ok(res.headers.get('cache-control')?.includes('no-store'), `Expected no-store for ${publicPath}`);
    }

    const adminEndpoints = [
      { method: 'PATCH', path: '/api/admin/banners/reorder', body: { items: [{ id: 'b1', displayOrder: 1 }] } },
      { method: 'PATCH', path: '/api/admin/banners/507f1f77bcf86cd799439011/status', body: { status: 'published' } },
      { method: 'POST', path: '/api/admin/banners/507f1f77bcf86cd799439011/duplicate' },
      { method: 'POST', path: '/api/admin/banners/media/upload' },
      { method: 'GET', path: '/api/admin/homepage-layout' },
      { method: 'POST', path: '/api/admin/homepage-layout/publish' },
    ];

    for (const ep of adminEndpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.ok(res.status === 401 || res.status === 503, `Expected 401/503 for ${ep.method} ${ep.path}, got ${res.status}`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'));
    }
  });
});

test('Dynamic Attribute Group, Attribute Preset, Product Variant SKU, and Q&A validation schemas', () => {
  assert.equal(
    attributeGroupSchema.safeParse({
      name: 'Performance & Hardware',
      slug: 'performance-hardware',
      sortOrder: 1,
      isActive: true,
    }).success,
    true,
  );

  assert.equal(
    attributePresetSchema.safeParse({
      name: 'Storage Capacity',
      code: 'storage_capacity',
      inputType: 'single_select',
      scope: 'category',
      categoryIds: ['507f1f77bcf86cd799439011'],
      options: [
        { label: '256GB', value: '256gb', sortOrder: 0 },
        { label: '512GB', value: '512gb', sortOrder: 1 },
      ],
      isFilterable: true,
      showOnProductDetails: true,
    }).success,
    true,
  );

  const validDynamicProduct = productSchema.safeParse({
    name: 'MacBook Air M4 13-inch',
    slug: 'macbook-air-m4-13',
    sku: 'MBA-M4-13',
    categoryId: '507f1f77bcf86cd799439011',
    description: 'Supercharged Apple M4 laptop built for portability and battery efficiency.',
    basePrice: 149999,
    salePrice: 119999,
    manageInventory: false,
    allowBackorder: true,
    attributeValues: [
      {
        code: 'processor',
        name: 'Processor',
        groupName: 'Performance',
        inputType: 'short_text',
        value: 'Apple M4 (10-Core CPU)',
        isFilterable: true,
      },
    ],
    highlights: [
      { icon: 'cpu', title: 'M4 Chip', subtitle: '10-Core CPU', sortOrder: 0 },
    ],
    contentSections: [
      {
        sectionId: 'whats_in_box',
        title: "What's in the Box",
        sectionType: 'whats_in_box',
        fields: [{ label: 'Adapter', value: '35W Dual USB-C', unit: '' }],
        sortOrder: 0,
        isEnabled: true,
        showToCustomer: true,
      },
    ],
    hasVariants: true,
    variantOptions: [
      { name: 'Storage Capacity', values: ['256GB', '512GB'] },
      { name: 'Color', values: ['Midnight', 'Silver'], colors: { Midnight: '#0B1730', Silver: '#CBD5E1' } },
    ],
    variants: [
      {
        sku: 'MBA-M4-256-MID',
        title: '256GB / Midnight',
        options: { 'Storage Capacity': '256GB', Color: 'Midnight' },
        stockOnHand: 10,
      },
      {
        sku: 'MBA-M4-512-SLV',
        title: '512GB / Silver',
        options: { 'Storage Capacity': '512GB', Color: 'Silver' },
        stockOnHand: 6,
      },
    ],
  });
  assert.equal(validDynamicProduct.success, true);

  const duplicateSkuProduct = productSchema.safeParse({
    name: 'Duplicate Variant SKU Product',
    slug: 'dup-sku-product',
    sku: 'DUP-BASE',
    categoryId: '507f1f77bcf86cd799439011',
    description: 'Testing duplicate variant SKU rejection inside productSchema.',
    basePrice: 1000,
    hasVariants: true,
    variants: [
      { sku: 'SAME-SKU', title: 'Opt 1', options: { Size: 'M' }, stockOnHand: 5 },
      { sku: 'same-sku', title: 'Opt 2', options: { Size: 'L' }, stockOnHand: 5 },
    ],
  });
  assert.equal(duplicateSkuProduct.success, false);

  assert.equal(productQuestionSchema.safeParse({ question: 'Does this include official warranty?' }).success, true);
  assert.equal(productQuestionSchema.safeParse({ question: 'Hi' }).success, false);
  assert.equal(answerQuestionSchema.safeParse({ answer: 'Yes, 1 year official warranty.', isPublished: true }).success, true);

  const trustPatch = homepageConfigPatchSchema.safeParse({
    productTrustHighlights: [
      { icon: 'shield-check', title: '100% Original', subtitle: 'Products' },
      { icon: 'truck', title: 'Fast Delivery', subtitle: 'Across Bangladesh' },
    ],
  });
  assert.equal(trustPatch.success, true);
});

test('Product catalog helper supports attributeFilters and untracked/backorder stock bypass', () => {
  const filter = buildProductCatalogFilter({
    inStockOnly: true,
    attributeFilters: {
      color: ['Midnight', 'Silver'],
      storage_capacity: ['256GB'],
      wireless: ['true'],
    },
  });
  assert.equal(filter.status, 'published');
  assert.ok(Array.isArray(filter.$and) && filter.$and.length >= 4);

  // Ensure untracked inventory flag is preserved on enrichProductPricing
  const untracked = enrichProductPricing({
    _id: 'p-untracked',
    basePrice: 2500,
    stockOnHand: 0,
    reservedStock: 0,
    manageInventory: false,
    allowBackorder: true,
    subCategoryId: { _id: 'sub1', name: 'Laptops', slug: 'laptops' },
  });
  assert.equal(untracked.manageInventory, false);
  assert.equal(untracked.allowBackorder, true);
  assert.equal((untracked.subCategoryId as { id: string }).id, 'sub1');
});

test('Dynamic attribute filter & admin group endpoints fail closed as structured JSON', async () => {
  await withTestServer(async (baseUrl) => {
    const filterRes = await fetch(`${baseUrl}/api/products/attributes/filters?category=electronics`);
    assert.equal(filterRes.status, 503);
    assert.ok(filterRes.headers.get('content-type')?.includes('application/json'));

    for (const ep of [
      { method: 'GET', path: '/api/admin/attribute-groups' },
      { method: 'GET', path: '/api/admin/attributes/by-category?categoryId=c1' },
      { method: 'POST', path: '/api/products/macbook-air-m4-13/questions' },
      { method: 'PATCH', path: '/api/admin/products/p1/questions/q1' },
    ]) {
      const res = await fetch(`${baseUrl}${ep.path}`, { method: ep.method });
      assert.ok(res.status === 401 || res.status === 503, `Expected 401/503 for ${ep.method} ${ep.path}, got ${res.status}`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'));
    }
  });
});

test('resolveVariantImageUrl handles variant imageUrl, string/object images[], and product fallback', () => {
  assert.equal(
    resolveVariantImageUrl(
      { imageUrl: 'https://cdn.example.com/var-direct.png', images: ['https://cdn.example.com/var-arr.png'] },
      { images: [{ url: 'https://cdn.example.com/prod-main.png' }] },
    ),
    'https://cdn.example.com/var-direct.png',
  );
  assert.equal(
    resolveVariantImageUrl(
      { images: ['https://cdn.example.com/var-str.png'] },
      { images: [{ url: 'https://cdn.example.com/prod-main.png' }] },
    ),
    'https://cdn.example.com/var-str.png',
  );
  assert.equal(
    resolveVariantImageUrl(
      { images: [{ url: 'https://cdn.example.com/var-obj.png' }] },
      { images: [{ url: 'https://cdn.example.com/prod-main.png' }] },
    ),
    'https://cdn.example.com/var-obj.png',
  );
  assert.equal(
    resolveVariantImageUrl(
      { images: [] },
      { images: [{ url: 'https://cdn.example.com/prod-main.png' }] },
    ),
    'https://cdn.example.com/prod-main.png',
  );
});

test('buildProductCatalogFilter supports multi-word attributeAliases and boolean true/Yes matching', () => {
  const filter = buildProductCatalogFilter({
    attributeFilters: {
      storage_capacity: ['256GB'],
      wireless_charging: ['true'],
    },
    attributeAliases: {
      storage_capacity: ['Storage Size'],
    },
  });
  const clauses = filter.$and as Array<{ $or?: Array<Record<string, unknown>> }>;
  assert.ok(Array.isArray(clauses) && clauses.length === 2);

  const storageJson = JSON.stringify(clauses[0]);
  assert.equal(storageJson.includes('Storage Capacity'), true);
  assert.equal(storageJson.includes('Storage Size'), true);

  const boolJson = JSON.stringify(clauses[1]);
  assert.equal(boolJson.includes('true'), true);
});

test('Brand, Category, and Product Mongoose schemas and Zod validators enforce constraints without leaving invalid docs', () => {
  assert.equal(brandSchema.safeParse({ name: 'Apple', slug: 'apple', isActive: true }).success, true);
  assert.equal(brandSchema.safeParse({ name: 'A', slug: 'a' }).success, false);

  assert.equal(
    categorySchema.safeParse({ name: 'Smartphones', slug: 'smartphones', attributeSchemaType: 'electronics' }).success,
    true,
  );
  assert.equal(
    categorySchema.safeParse({ name: 'Invalid Type', slug: 'invalid', attributeSchemaType: 'automotive' }).success,
    false,
  );

  const brandDoc = new BrandModel({ name: 'Samsung', slug: 'samsung' });
  assert.equal(brandDoc.validateSync(), undefined);

  const catDoc = new CategoryModel({ name: 'Laptops', slug: 'laptops', attributeSchemaType: 'electronics' });
  assert.equal(catDoc.validateSync(), undefined);

  const prodDoc = new ProductModel({
    name: 'Galaxy Book4 Pro',
    slug: 'galaxy-book4-pro',
    sku: 'GBP-14',
    categoryId: catDoc._id,
    brandId: brandDoc._id,
    brandName: 'Samsung',
    description: 'Dynamic OLED laptop with Intel Core Ultra.',
    basePrice: 155000,
    status: 'published',
    attributeValues: [
      { code: 'ram', name: 'RAM', groupName: 'Memory', inputType: 'single_select', value: '16GB' },
      { code: 'color', name: 'Color', groupName: 'Design', inputType: 'color', value: 'Moonstone Gray', colorHex: '#64748B' },
    ],
  });
  assert.equal(prodDoc.validateSync(), undefined);
});

test('Brand & Category service integrity: duplicate check, product rename sync, delete protection, circular parent guard', async () => {
  const origBrandFindOne = BrandModel.findOne;
  const origBrandFindById = BrandModel.findById;
  const origBrandFindByIdAndUpdate = BrandModel.findByIdAndUpdate;
  const origProdCount = ProductModel.countDocuments;
  const origProdUpdateMany = ProductModel.updateMany;
  const origCatFindOne = CategoryModel.findOne;
  const origCatFind = CategoryModel.find;

  try {
    // 1. Duplicate brand -> 409 DUPLICATE_BRAND
    BrandModel.findOne = (() => ({ lean: async () => ({ _id: 'b1', name: 'Apple' }) })) as never;
    await assert.rejects(
      () => createBrand({ name: 'apple', slug: 'apple', isActive: true }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 409 && err.code === 'DUPLICATE_BRAND',
    );

    // 2. Brand update syncs brandName across products
    let syncedBrandUpdate: unknown = null;
    BrandModel.findOne = (() => ({ lean: async () => null })) as never;
    BrandModel.findById = (() => ({ lean: async () => ({ _id: 'b1', name: 'OldBrand' }) })) as never;
    BrandModel.findByIdAndUpdate = (async () => ({
      _id: 'b1',
      name: 'NewBrand',
      toObject: () => ({ _id: 'b1', name: 'NewBrand' }),
    })) as never;
    ProductModel.updateMany = (async (filter: unknown, update: unknown) => {
      syncedBrandUpdate = { filter, update };
      return { modifiedCount: 2 };
    }) as never;
    const updatedBrand = await updateBrand('b1', { name: 'NewBrand', slug: 'newbrand', isActive: true });
    assert.equal(updatedBrand.name, 'NewBrand');
    assert.deepEqual(syncedBrandUpdate, {
      filter: { brandId: 'b1' },
      update: { $set: { brandName: 'NewBrand' } },
    });

    // 3. Deleting brand linked to products -> 409 BRAND_IN_USE
    BrandModel.findById = (async () => ({ _id: 'b1', name: 'NewBrand' })) as never;
    ProductModel.countDocuments = (async () => 3) as never;
    await assert.rejects(
      () => deleteBrand('b1'),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 409 && err.code === 'BRAND_IN_USE',
    );

    // 4. Category duplicate + self-parent + circular parent checks
    CategoryModel.findOne = (() => ({ lean: async () => ({ _id: 'c1' }) })) as never;
    await assert.rejects(
      () => createCategory({ name: 'Laptops', slug: 'laptops', attributeSchemaType: 'electronics', sortOrder: 0, isActive: true, showInHeader: true }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 409 && err.code === 'DUPLICATE_CATEGORY',
    );

    CategoryModel.findOne = (() => ({ lean: async () => null })) as never;
    await assert.rejects(
      () =>
        updateCategory('c1', {
          name: 'Laptops',
          slug: 'laptops',
          parentId: 'c1',
          attributeSchemaType: 'electronics',
          sortOrder: 0,
          isActive: true,
          showInHeader: true,
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'INVALID_PARENT_CATEGORY',
    );

    CategoryModel.find = (() => ({
      select: () => ({
        lean: async () => [
          { _id: 'c1', parentId: null },
          { _id: 'c2', parentId: 'c1' },
        ],
      }),
    })) as never;
    await assert.rejects(
      () =>
        updateCategory('c1', {
          name: 'Laptops',
          slug: 'laptops',
          parentId: 'c2',
          attributeSchemaType: 'electronics',
          sortOrder: 0,
          isActive: true,
          showInHeader: true,
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'CIRCULAR_CATEGORY_PARENT',
    );

    // Unused deleteCategory check when category has no products/children
    void deleteCategory;
  } finally {
    BrandModel.findOne = origBrandFindOne;
    BrandModel.findById = origBrandFindById;
    BrandModel.findByIdAndUpdate = origBrandFindByIdAndUpdate;
    ProductModel.countDocuments = origProdCount;
    ProductModel.updateMany = origProdUpdateMany;
    CategoryModel.findOne = origCatFindOne;
    CategoryModel.find = origCatFind;
  }
});

test('Product service enforces required attributes on draft->publish, cascades attribute edits, and nulls attributeId on delete', async () => {
  const origProdFindById = ProductModel.findById;
  const origProdUpdateMany = ProductModel.updateMany;
  const origPresetFind = ProductAttributePresetModel.find;
  const origPresetFindById = ProductAttributePresetModel.findById;
  const origPresetFindOne = ProductAttributePresetModel.findOne;
  const origPresetUpdate = ProductAttributePresetModel.findByIdAndUpdate;
  const origPresetDelete = ProductAttributePresetModel.findByIdAndDelete;

  try {
    // 1. Draft -> publish without required attribute rejects with 400 ATTRIBUTE_VALIDATION_ERROR
    ProductModel.findById = (async () => ({
      _id: 'p1',
      categoryId: 'cat-1',
      subCategoryId: null,
      status: 'draft',
      attributeValues: [],
    })) as never;
    ProductAttributePresetModel.find = (() => ({
      lean: async () => [
        {
          _id: 'a1',
          name: 'Battery Capacity',
          code: 'battery_capacity',
          inputType: 'number',
          scope: 'category',
          categoryIds: ['cat-1'],
          isRequired: true,
          isActive: true,
        },
      ],
    })) as never;

    await assert.rejects(
      () => updateProductStatusAdmin('p1', 'published'),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'ATTRIBUTE_VALIDATION_ERROR',
    );

    // 2. Attribute rename cascades to ProductModel.attributeValues
    let cascadeCall: { update: Record<string, unknown>; options: Record<string, unknown> } | null = null;
    ProductAttributePresetModel.findById = (() => ({
      lean: async () => ({ _id: 'a1', code: 'ram_old', name: 'Old RAM' }),
    })) as never;
    ProductAttributePresetModel.findOne = (() => ({ lean: async () => null })) as never;
    ProductAttributePresetModel.findByIdAndUpdate = (async () => ({
      toObject: () => ({
        _id: 'a1',
        code: 'ram',
        name: 'System Memory',
        groupName: 'Hardware',
        unit: 'GB',
        sortOrder: 2,
        isActive: true,
        isVisibleToCustomers: true,
        showOnProductDetails: true,
        isFilterable: true,
        isSearchable: true,
        isComparable: true,
      }),
      _id: 'a1',
      code: 'ram',
      name: 'System Memory',
      groupName: 'Hardware',
      unit: 'GB',
      sortOrder: 2,
      isActive: true,
      isVisibleToCustomers: true,
      showOnProductDetails: true,
      isFilterable: true,
      isSearchable: true,
      isComparable: true,
    })) as never;
    ProductModel.updateMany = (async (_f: unknown, update: Record<string, unknown>, options: Record<string, unknown>) => {
      cascadeCall = { update, options };
      return { modifiedCount: 1 };
    }) as never;

    const updatedAttr = await updateAttributeAdmin('a1', {
      name: 'System Memory',
      code: 'ram',
      description: '',
      group: 'hardware',
      groupName: 'Hardware',
      inputType: 'single_select',
      unit: 'GB',
      scope: 'global',
      categoryIds: [],
      values: [],
      options: [],
      sortOrder: 2,
      isRequired: false,
      isActive: true,
      isVisibleToCustomers: true,
      showOnProductDetails: true,
      isFilterable: true,
      isSearchable: true,
      isComparable: true,
    });
    assert.equal(updatedAttr.name, 'System Memory');
    assert.equal((cascadeCall!.update.$set as Record<string, unknown>)['attributeValues.$[elem].unit'], 'GB');

    // 3. Attribute deletion clears dangling attributeId refs while keeping values
    let deleteCleanup: Record<string, unknown> | null = null;
    ProductAttributePresetModel.findByIdAndDelete = (async () => ({ _id: 'a1' })) as never;
    ProductModel.updateMany = (async (_f: unknown, update: Record<string, unknown>) => {
      deleteCleanup = update;
      return { modifiedCount: 1 };
    }) as never;
    const delRes = await deleteAttributeAdmin('a1');
    assert.equal(delRes.deleted, true);
    assert.equal((deleteCleanup!.$set as Record<string, unknown>)['attributeValues.$[elem].attributeId'], null);
  } finally {
    ProductModel.findById = origProdFindById;
    ProductModel.updateMany = origProdUpdateMany;
    ProductAttributePresetModel.find = origPresetFind;
    ProductAttributePresetModel.findById = origPresetFindById;
    ProductAttributePresetModel.findOne = origPresetFindOne;
    ProductAttributePresetModel.findByIdAndUpdate = origPresetUpdate;
    ProductAttributePresetModel.findByIdAndDelete = origPresetDelete;
  }
});

test('Cart Hero Slider schemas, status/reorder validators, and cartHeroSettings CMS patch enforce contracts', () => {
  const validCartSlide = heroSlideSchema.safeParse({
    placement: 'cart',
    badgeText: 'Your Cart',
    heading: 'Shopping Made Easy!',
    subtitle: 'Review your items and proceed to checkout for a seamless shopping experience.',
    desktopImageUrl: '/src/assets/images/cart_hero_showcase_1794903452699.jpg',
    ctaText: 'Continue Shopping',
    ctaUrl: '/shop',
    textAlignment: 'left',
    overlayOpacity: 25,
    sortOrder: 0,
    isActive: true,
  });
  assert.equal(validCartSlide.success, true);

  assert.equal(heroSlideStatusSchema.safeParse({ isActive: false }).success, true);
  assert.equal(heroSlideStatusSchema.safeParse({ isActive: 'false' }).success, false);
  assert.equal(heroSlideReorderSchema.safeParse({ orderedIds: ['id1', 'id2'] }).success, true);
  assert.equal(heroSlideReorderSchema.safeParse({ orderedIds: [] }).success, false);

  const badOverlay = heroSlideSchema.safeParse({
    placement: 'cart',
    heading: 'Too Dark',
    desktopImageUrl: '/img.jpg',
    overlayOpacity: 95,
  });
  assert.equal(badOverlay.success, false);

  const validCartHeroSettings = homepageConfigPatchSchema.safeParse({
    cartHeroSettings: {
      enabled: true,
      autoplay: true,
      autoplayIntervalMs: 5000,
      showDots: true,
      showArrows: true,
      transitionEffect: 'fade',
      confidenceBanner: {
        enabled: true,
        title: 'Shop with Confidence',
        subtitle: 'Safe Payment | Secure Checkout | 7-Day Return Policy',
      },
    },
  });
  assert.equal(validCartHeroSettings.success, true);
});

test('Cart Hero public endpoint and new Cart/Hero Admin endpoints fail closed with structured JSON', async () => {
  await withTestServer(async (baseUrl) => {
    const publicRes = await fetch(`${baseUrl}/api/storefront/cart-hero`);
    assert.equal(publicRes.status, 503);
    assert.ok(publicRes.headers.get('content-type')?.includes('application/json'));
    assert.ok(publicRes.headers.get('cache-control')?.includes('no-store'));

    for (const ep of [
      { method: 'PATCH', path: '/api/admin/hero-slides/reorder', body: { orderedIds: ['s1', 's2'] } },
      { method: 'PATCH', path: '/api/admin/hero-slides/507f1f77bcf86cd799439011/status', body: { isActive: true } },
      { method: 'PATCH', path: '/api/account/cart/selection', body: { selectAll: true, selected: true } },
      { method: 'DELETE', path: '/api/account/cart' },
    ]) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.ok(res.status === 401 || res.status === 503, `Expected 401/503 for ${ep.method} ${ep.path}, got ${res.status}`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'));
    }
  });
});

test('Registration and Reset Password schemas normalize email/name and enforce strong password rules', () => {
  const valid = registerSchema.safeParse({
    name: '  Amina   Rahman ',
    email: '  Amina.Rahman+Test@Example.COM ',
    password: 'Password1',
  });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.name, 'Amina Rahman');
    assert.equal(valid.data.email, 'amina.rahman+test@example.com');
  }

  const weak = registerSchema.safeParse({
    name: 'Amina Rahman',
    email: 'amina@example.com',
    password: 'weak',
  });
  assert.equal(weak.success, false);

  const noUpper = registerSchema.safeParse({
    name: 'Amina Rahman',
    email: 'amina@example.com',
    password: 'password123',
  });
  assert.equal(noUpper.success, false);

  const badReset = resetPasswordSchema.safeParse({
    email: 'USER@Example.com',
    token: 'short',
    newPassword: 'Password1',
  });
  assert.equal(badReset.success, false);
});

test('registerCustomerAccount hashes password, rejects duplicate emails with 409 EMAIL_EXISTS, and handles E11000 races', async () => {
  const origFindOne = UserModel.findOne;
  const origCreate = UserModel.create;

  try {
    // 1. Existing email returns 409 EMAIL_EXISTS
    UserModel.findOne = (async () => ({ _id: 'u1', email: 'taken@example.com', isVerified: true })) as never;
    await assert.rejects(
      () =>
        registerCustomerAccount({
          name: 'Existing User',
          email: 'TAKEN@example.com',
          password: 'Password1',
        }),
      (err: unknown) => {
        const e = err as { statusCode?: number; code?: string };
        return e.statusCode === 409 && e.code === 'EMAIL_EXISTS';
      },
    );

    // 2. Concurrent Mongo E11000 race on create also converts cleanly to 409 EMAIL_EXISTS
    UserModel.findOne = (async () => null) as never;
    UserModel.create = (async () => {
      throw { code: 11000 };
    }) as never;
    await assert.rejects(
      () =>
        registerCustomerAccount({
          name: 'Race User',
          email: 'race@example.com',
          password: 'Password1',
        }),
      (err: unknown) => {
        const e = err as { statusCode?: number; code?: string };
        return e.statusCode === 409 && e.code === 'EMAIL_EXISTS';
      },
    );

    // 3. New user creation bcrypt-hashes password and never leaks passwordHash
    const captured: { doc: Record<string, unknown> | null } = { doc: null };
    UserModel.findOne = (async () => null) as never;
    UserModel.create = (async (doc: Record<string, unknown>) => {
      captured.doc = doc;
      return {
        _id: 'u_new',
        name: doc.name,
        email: doc.email,
        role: doc.role,
        customPermissions: [],
        status: doc.status,
        isVerified: doc.isVerified,
        authProvider: doc.authProvider,
        notificationPrefs: doc.notificationPrefs,
      };
    }) as never;

    const result = await registerCustomerAccount({
      name: '  Tareq  Hasan ',
      email: 'Tareq@Example.COM',
      password: 'Password1',
    });
    assert.ok(captured.doc);
    assert.equal(captured.doc.email, 'tareq@example.com');
    assert.equal(captured.doc.name, 'Tareq Hasan');
    assert.equal(captured.doc.role, 'customer');
    assert.equal(captured.doc.authProvider, 'local');
    assert.notEqual(captured.doc.passwordHash, 'Password1');
    assert.ok(String(captured.doc.passwordHash).startsWith('$2'));
    assert.equal(result.user.email, 'tareq@example.com');
    assert.equal((result.user as unknown as Record<string, unknown>).passwordHash, undefined);
  } finally {
    UserModel.findOne = origFindOne;
    UserModel.create = origCreate;
  }
});

test('findOrLinkOAuthUser requires verified email, safely links existing email without duplicate, and blocks suspended accounts', async () => {
  const origFindOne = UserModel.findOne;
  try {
    await assert.rejects(
      () =>
        findOrLinkOAuthUser({
          provider: 'google',
          providerId: 'g-1',
          email: 'unverified@example.com',
          name: 'Unverified',
          emailVerified: false,
        }),
      (err: unknown) => (err as { code?: string }).code === 'OAUTH_EMAIL_UNVERIFIED',
    );

    let saved = false;
    const existingDoc = {
      _id: 'u-linked',
      name: 'Customer One',
      email: 'customer@example.com',
      role: 'customer',
      status: 'active' as const,
      isVerified: false,
      authProvider: 'local' as const,
      oauthProviders: {} as { googleId?: string; facebookId?: string },
      lastLoginAt: undefined as Date | undefined,
      save: async () => {
        saved = true;
      },
    };
    UserModel.findOne = (async () => existingDoc) as never;

    const linked = await findOrLinkOAuthUser({
      provider: 'google',
      providerId: 'google-sub-99',
      email: 'CUSTOMER@example.com',
      name: 'Customer One',
      emailVerified: true,
    });
    assert.equal(saved, true);
    assert.equal(existingDoc.oauthProviders.googleId, 'google-sub-99');
    assert.equal(existingDoc.isVerified, true);
    assert.equal(linked.user.id, 'u-linked');
    assert.ok(linked.token);

    UserModel.findOne = (async () => ({ ...existingDoc, status: 'suspended' })) as never;
    await assert.rejects(
      () =>
        findOrLinkOAuthUser({
          provider: 'facebook',
          providerId: 'fb-2',
          email: 'customer@example.com',
          name: 'Customer One',
          emailVerified: true,
        }),
      (err: unknown) => (err as { code?: string; statusCode?: number }).code === 'ACCOUNT_SUSPENDED',
    );
  } finally {
    UserModel.findOne = origFindOne;
  }
});

test('OAuth URL and auth verification endpoints return honest structured JSON when unconfigured or DB offline', async () => {
  await withTestServer(async (baseUrl) => {
    const googleUrlRes = await fetch(`${baseUrl}/api/auth/oauth/google/url`);
    assert.equal(googleUrlRes.status, 503);
    const googleBody = (await googleUrlRes.json()) as { ok: boolean; code: string };
    assert.equal(googleBody.ok, false);
    assert.equal(googleBody.code, 'OAUTH_UNCONFIGURED');

    const fbUrlRes = await fetch(`${baseUrl}/api/auth/oauth/facebook/url`);
    assert.equal(fbUrlRes.status, 503);
    const fbBody = (await fbUrlRes.json()) as { ok: boolean; code: string };
    assert.equal(fbBody.ok, false);
    assert.equal(fbBody.code, 'OAUTH_UNCONFIGURED');

    for (const ep of ['/api/auth/verify-email', '/api/auth/resend-verification', '/api/auth/register']) {
      const res = await fetch(`${baseUrl}${ep}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@example.com', token: '0123456789abcdef', password: 'Password1', name: 'Test User' }),
      });
      assert.equal(res.status, 503);
      assert.ok(res.headers.get('content-type')?.includes('application/json'));
    }
  });
});

test('Wishlist Hero Slider, wishlist_bottom banner, and wishlistHeroSettings CMS patch enforce contracts', () => {
  const validWishlistSlide = heroSlideSchema.safeParse({
    placement: 'wishlist',
    badgeText: 'Saved Favorites',
    heading: 'My Wishlist',
    subtitle: 'Save your favorite products for later.',
    desktopImageUrl: '/src/assets/images/wishlist_hero_showcase_1794919699999.jpg',
    ctaText: 'Continue Shopping',
    ctaUrl: '/shop',
    sortOrder: 0,
    isActive: true,
  });
  assert.equal(validWishlistSlide.success, true);

  const validWishlistBanner = bannerSchema.safeParse({
    title: "Don't Miss Out!",
    subtitle: 'Complete your purchase and get exclusive offers and rewards.',
    desktopImageUrl: '/src/assets/images/wishlist_gift_promo_1794919699090.jpg',
    placement: 'wishlist_bottom',
    theme: 'ice-blue',
    ctaText: 'Shop Now',
    destinationUrl: '/shop',
    status: 'published',
    isPublished: true,
  });
  assert.equal(validWishlistBanner.success, true);

  const validWishlistCmsPatch = homepageConfigPatchSchema.safeParse({
    wishlistHeroSettings: {
      enabled: true,
      autoplay: true,
      autoplayIntervalMs: 5000,
      showDots: true,
      showArrows: false,
      transitionEffect: 'fade',
    },
  });
  assert.equal(validWishlistCmsPatch.success, true);

  assert.equal(cancellationRequestReviewSchema.safeParse({ action: 'approve', adminNotes: 'Approved' }).success, true);
  assert.equal(cancellationRequestReviewSchema.safeParse({ action: 'reject', adminNotes: 'Already packed' }).success, true);
  assert.equal(cancellationRequestReviewSchema.safeParse({ action: 'invalid' }).success, false);
});

test('Wishlist, Account modules, Order Cancellation Requests, and Wishlist Analytics fail closed with structured JSON when DB offline', async () => {
  await withTestServer(async (baseUrl) => {
    const publicRes = await fetch(`${baseUrl}/api/storefront/wishlist-hero`);
    assert.equal(publicRes.status, 503);
    assert.ok(publicRes.headers.get('content-type')?.includes('application/json'));

    for (const ep of [
      { method: 'GET', path: '/api/account/wishlist' },
      { method: 'GET', path: '/api/account/wishlist/count' },
      { method: 'POST', path: '/api/account/wishlist/merge', body: { productIds: ['507f1f77bcf86cd799439011'] } },
      { method: 'DELETE', path: '/api/account/wishlist' },
      { method: 'GET', path: '/api/account/dashboard' },
      { method: 'GET', path: '/api/account/reviews' },
      { method: 'GET', path: '/api/account/coupons' },
      { method: 'GET', path: '/api/account/wallet' },
      { method: 'POST', path: '/api/orders/507f1f77bcf86cd799439011/cancellation-request', body: { reason: 'Changed mind' } },
      { method: 'GET', path: '/api/admin/cancellation-requests' },
      { method: 'PATCH', path: '/api/admin/cancellation-requests/507f1f77bcf86cd799439011', body: { action: 'approve' } },
      { method: 'GET', path: '/api/admin/analytics/wishlist' },
    ]) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: ep.body ? { 'Content-Type': 'application/json' } : undefined,
        body: ep.body ? JSON.stringify(ep.body) : undefined,
      });
      assert.ok(res.status === 401 || res.status === 503, `Expected 401/503 for ${ep.method} ${ep.path}, got ${res.status}`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'));
    }
  });
});

test('reviewCancellationRequestAdmin atomically approves (with stock release & refund_pending), rejects, and blocks post-dispatch approval', async () => {
  const origFindById = OrderModel.findById;
  const origFindOneAndUpdate = OrderModel.findOneAndUpdate;
  const origProdUpdateOne = ProductModel.updateOne;
  const origInvCreate = InventoryMovementModel.create;
  const origPayUpdateMany = PaymentTransactionModel.updateMany;

  try {
    const validOrderId = '507f1f77bcf86cd799439011';
    const baseOrder = {
      _id: validOrderId,
      orderNumber: 'NVR-261117-CANC01',
      customerName: 'Rakib Hasan',
      customerEmail: 'rakib@example.com',
      orderStatus: 'processing',
      paymentStatus: 'paid',
      items: [{ productId: '507f1f77bcf86cd799439022', variantId: null, quantity: 2, sku: 'SKU-1', name: 'Test Item' }],
      cancellationRequest: {
        status: 'pending',
        reason: 'Ordered wrong model',
        message: 'Please cancel before dispatch',
      },
    };

    // 1. Approval transitions to cancelled + refund_pending + releases reserved stock
    OrderModel.findById = (() => ({ lean: async () => baseOrder })) as never;
    let capturedSet: Record<string, unknown> | null = null;
    OrderModel.findOneAndUpdate = (async (_filter: unknown, update: Record<string, unknown>) => {
      capturedSet = update.$set as Record<string, unknown>;
      return {
        _id: validOrderId,
        toObject: () => ({
          ...baseOrder,
          ...capturedSet,
        }),
      };
    }) as never;

    let releasedQty = 0;
    ProductModel.updateOne = (async (_f: unknown, u: { $inc?: { reservedStock?: number } }) => {
      releasedQty = u.$inc?.reservedStock || 0;
      return { modifiedCount: 1 };
    }) as never;

    let movementCreated = false;
    InventoryMovementModel.create = (async () => {
      movementCreated = true;
      return {};
    }) as never;

    let paymentUpdatedToRefundPending = false;
    PaymentTransactionModel.updateMany = (async (_f: unknown, u: { $set?: { status?: string } }) => {
      if (u.$set?.status === 'refund_pending') paymentUpdatedToRefundPending = true;
      return { modifiedCount: 1 };
    }) as never;

    const approvedRes = await reviewCancellationRequestAdmin({
      orderId: validOrderId,
      action: 'approve',
      adminNotes: 'Approved before courier pickup',
      actorId: 'admin-1',
      actorName: 'Admin Ops',
    });

    assert.equal(approvedRes.action, 'approved');
    assert.equal(capturedSet!.orderStatus, 'cancelled');
    assert.equal(capturedSet!.paymentStatus, 'refund_pending');
    assert.equal(capturedSet!['cancellationRequest.status'], 'approved');
    assert.equal(releasedQty, -2);
    assert.equal(movementCreated, true);
    assert.equal(paymentUpdatedToRefundPending, true);

    // 2. Rejecting preserves orderStatus and records rejected status + adminNotes
    OrderModel.findById = (() => ({ lean: async () => baseOrder })) as never;
    OrderModel.findOneAndUpdate = (async (_filter: unknown, update: Record<string, unknown>) => {
      capturedSet = update.$set as Record<string, unknown>;
      return {
        _id: validOrderId,
        toObject: () => ({ ...baseOrder, ...capturedSet }),
      };
    }) as never;

    const rejectedRes = await reviewCancellationRequestAdmin({
      orderId: validOrderId,
      action: 'reject',
      adminNotes: 'Courier already scanned parcel',
      actorId: 'admin-1',
      actorName: 'Admin Ops',
    });
    assert.equal(rejectedRes.action, 'rejected');
    assert.equal(capturedSet!['cancellationRequest.status'], 'rejected');
    assert.equal(capturedSet!['cancellationRequest.adminNotes'], 'Courier already scanned parcel');

    // 3. Approving after shipped throws 409 CANNOT_APPROVE_AFTER_DISPATCH
    OrderModel.findById = (() => ({ lean: async () => ({ ...baseOrder, orderStatus: 'shipped' }) })) as never;
    await assert.rejects(
      () =>
        reviewCancellationRequestAdmin({
          orderId: validOrderId,
          action: 'approve',
          actorId: 'admin-1',
          actorName: 'Admin Ops',
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 409 && err.code === 'CANNOT_APPROVE_AFTER_DISPATCH',
    );
  } finally {
    OrderModel.findById = origFindById;
    OrderModel.findOneAndUpdate = origFindOneAndUpdate;
    ProductModel.updateOne = origProdUpdateOne;
    InventoryMovementModel.create = origInvCreate;
    PaymentTransactionModel.updateMany = origPayUpdateMany;
  }
});

test('Navigation Zod validation enforces safe URLs, required slide altText, valid schedules, and slider bounds', () => {
  const validMenu = navigationMenuSchema.parse({
    label: 'Electronics',
    type: 'mega_menu',
    url: '/category/mobiles-tablets',
    groups: [
      {
        title: 'Devices',
        items: [
          {
            label: 'Smartphones',
            url: '/category/mobiles-tablets',
            description: 'Flagships',
            icon: 'Smartphone',
          },
        ],
      },
    ],
    slides: [
      {
        imageUrl: '/src/assets/images/product_smartphone_1794832025637.jpg',
        altText: 'Flagship smartphone showcase',
        title: 'Galaxy S25 Ultra',
        buttonText: 'Shop Now',
        buttonUrl: '/category/mobiles-tablets',
      },
    ],
  });
  assert.equal(validMenu.label, 'Electronics');
  assert.equal(validMenu.slides[0].focalPoint, 'center');
  assert.equal(validMenu.settings.sliderSettings.aspectRatio, '4/3');

  // Reject unsafe javascript: URL
  assert.throws(() =>
    navigationMenuSchema.parse({
      label: 'Unsafe',
      url: 'javascript:alert(1)',
    }),
  );

  // Reject empty slide alt text
  assert.throws(() =>
    navigationSlideSchema.parse({
      imageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
      altText: '   ',
    }),
  );

  // Reject reversed start/end dates
  assert.throws(() =>
    navigationMenuSchema.parse({
      label: 'Campaign',
      url: '/offers',
      startsAt: '2026-12-10T00:00:00.000Z',
      endsAt: '2026-12-01T00:00:00.000Z',
    }),
  );

  // Reject out-of-range slider interval
  assert.throws(() =>
    navigationSliderSettingsSchema.parse({
      intervalMs: 200,
    }),
  );
});

test('Navigation service supports menu CRUD, duplication, reordering, and single-image slide CRUD', async () => {
  const origFind = NavigationMenuModel.find;
  const origCount = NavigationMenuModel.countDocuments;
  const origExists = NavigationMenuModel.exists;
  const origCreate = NavigationMenuModel.create;
  const origFindById = NavigationMenuModel.findById;
  const origBulkWrite = NavigationMenuModel.bulkWrite;
  const origHomepageUpdate = HomepageConfigModel.updateOne;

  try {
    const validMenuId = '507f1f77bcf86cd799439051';
    const slideId = '507f1f77bcf86cd799439052';

    const storedDoc: Record<string, unknown> = {
      _id: validMenuId,
      name: 'Electronics',
      slug: 'electronics',
      label: 'Electronics',
      type: 'mega_menu',
      url: '/category/mobiles-tablets',
      openInNewTab: false,
      icon: 'Cpu',
      badgeText: 'HOT',
      isActive: true,
      isPublished: true,
      displayOrder: 0,
      groups: [
        {
          _id: '507f1f77bcf86cd799439060',
          title: 'Devices',
          slug: 'devices',
          isActive: true,
          displayOrder: 0,
          items: [
            {
              _id: '507f1f77bcf86cd799439061',
              label: 'Smartphones',
              slug: 'smartphones',
              url: '/category/mobiles-tablets',
              target: '_self',
              isActive: true,
              displayOrder: 0,
            },
          ],
        },
      ],
      promotions: [],
      slides: [
        {
          _id: slideId,
          imageUrl: '/src/assets/images/product_laptop_1794832026646.jpg',
          altText: 'Laptop Promo',
          title: 'MacBook Air M4',
          target: '_self',
          focalPoint: 'center',
          objectFit: 'cover',
          isActive: true,
          displayOrder: 0,
        },
      ],
      settings: {
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
      },
    };

    HomepageConfigModel.updateOne = (async () => ({ modifiedCount: 1 })) as never;
    NavigationMenuModel.countDocuments = (async () => 1) as never;
    NavigationMenuModel.exists = (async () => null) as never;
    NavigationMenuModel.find = (() => ({
      sort: () => ({ lean: async () => [storedDoc] }),
    })) as never;

    const listRes = await listNavigationMenusAdmin();
    assert.equal(listRes.menus.length, 1);
    assert.equal(listRes.stats.totalMenus, 1);
    assert.equal(listRes.stats.totalDropdownLinks, 1);
    assert.equal(listRes.stats.activeSlides, 1);

    let createdPayload: Record<string, unknown> = {};
    NavigationMenuModel.create = (async (doc: Record<string, unknown>) => {
      createdPayload = doc;
      return {
        toObject: () => ({ ...doc, _id: '507f1f77bcf86cd799439099' }),
      };
    }) as never;

    const created = await createNavigationMenuAdmin(
      navigationMenuSchema.parse({ label: 'Gaming', url: '/category/gaming-consoles' }),
    );
    assert.equal(created.label, 'Gaming');
    assert.equal(createdPayload.slug, 'gaming');

    // Duplicate menu forces draft (isPublished: false)
    NavigationMenuModel.findById = (() => ({ lean: async () => storedDoc })) as never;
    const duplicated = await duplicateNavigationMenuAdmin(validMenuId);
    assert.equal(duplicated.isPublished, false);
    assert.equal(duplicated.label, 'Electronics Copy');

    // Add, update, delete slide
    const saveableDoc = {
      ...storedDoc,
      slides: [...(storedDoc.slides as Array<Record<string, unknown>>)],
      save: async () => undefined,
      toObject: () => saveableDoc,
    };
    NavigationMenuModel.findById = (async () => saveableDoc) as never;

    const withNewSlide = await addMenuSlideAdmin(
      validMenuId,
      navigationSlideSchema.parse({
        imageUrl: '/src/assets/images/promo_headphones_1794832024152.jpg',
        altText: 'Audio Deal',
        title: 'Sony XM5',
      }),
    );
    assert.equal(withNewSlide.slides.length, 2);

    const afterSlideEdit = await updateMenuSlideAdmin(
      validMenuId,
      slideId,
      navigationSlideSchema.parse({
        imageUrl: '/src/assets/images/product_laptop_1794832026646.jpg',
        altText: 'Updated Laptop Promo',
        title: 'MacBook Pro M4',
        isActive: false,
      }),
    );
    assert.equal(afterSlideEdit.slides[0].isActive, false);
    assert.equal(afterSlideEdit.slides[0].title, 'MacBook Pro M4');

    const afterSlideDelete = await deleteMenuSlideAdmin(validMenuId, slideId);
    assert.equal(afterSlideDelete.slides.length, 1);

    let bulkOpsCount = 0;
    NavigationMenuModel.bulkWrite = (async (ops: unknown[]) => {
      bulkOpsCount = ops.length;
      return {};
    }) as never;
    await reorderNavigationMenusAdmin({
      items: [{ id: validMenuId, displayOrder: 2 }],
    });
    assert.equal(bulkOpsCount, 1);
  } finally {
    NavigationMenuModel.find = origFind;
    NavigationMenuModel.countDocuments = origCount;
    NavigationMenuModel.exists = origExists;
    NavigationMenuModel.create = origCreate;
    NavigationMenuModel.findById = origFindById;
    NavigationMenuModel.bulkWrite = origBulkWrite;
    HomepageConfigModel.updateOne = origHomepageUpdate;
  }
});

test('Navigation admin & storefront endpoints fail closed cleanly as JSON without HTML leaks', async () => {
  await withTestServer(async (baseUrl) => {
    for (const [method, path] of [
      ['GET', '/api/admin/navigation'],
      ['POST', '/api/admin/navigation'],
      ['PATCH', '/api/admin/navigation/reorder'],
      ['POST', '/api/admin/navigation/media/upload'],
      ['GET', '/api/storefront/navigation/menus'],
    ] as const) {
      const res = await fetch(`${baseUrl}${path}`, { method });
      assert.ok(res.status === 401 || res.status === 503, `Expected 401/503 for ${method} ${path}, got ${res.status}`);
      assert.ok(res.headers.get('content-type')?.includes('application/json'), `Expected JSON for ${path}`);
      assert.ok(res.headers.get('cache-control')?.includes('no-store'));
    }
  });
});

test('Admin analytics overview respects 90-day buckets, excludes returned revenue, and counts variant/untracked stock accurately', async () => {
  const origOrderFind = OrderModel.find;
  const origOrderCount = OrderModel.countDocuments;
  const origOrderAgg = OrderModel.aggregate;
  const origUserCount = UserModel.countDocuments;
  const origUserFind = UserModel.find;
  const origProdCount = ProductModel.countDocuments;
  const origProdFind = ProductModel.find;
  const origRevCount = ReviewModel.countDocuments;
  const origVisitCount = SiteVisitModel.countDocuments;
  const origVisitAgg = SiteVisitModel.aggregate;
  const origAuditFind = AuditLogModel.find;
  const origCmsFindOne = HomepageConfigModel.findOne;
  const origEnqCount = SupportEnquiryModel.countDocuments;

  try {
    const now = new Date();
    const lowProductsMock = Array.from({ length: 15 }, (_, idx) => ({
      _id: `p-low-${idx}`,
      name: `Low Product ${idx}`,
      sku: `LOW-${idx}`,
      stockOnHand: 2,
      reservedStock: 0,
      lowStockThreshold: 5,
      manageInventory: true,
      hasVariants: false,
      variants: [],
      images: [],
    }));
    lowProductsMock.push({
      _id: 'p-variant-out',
      name: 'Variant Zero',
      sku: 'VAR-0',
      stockOnHand: 0,
      reservedStock: 0,
      lowStockThreshold: 3,
      manageInventory: true,
      hasVariants: true,
      variants: [{ isActive: true, stockOnHand: 2, reservedStock: 2, lowStockThreshold: 3 }] as never,
      images: [],
    });

    OrderModel.find = ((query?: Record<string, unknown>) => {
      const isRecent = !query || Object.keys(query).length === 0;
      const rows = [
        { _id: 'o1', total: 2000, orderStatus: 'delivered', paymentStatus: 'paid', paymentMethod: 'cod', createdAt: now },
        { _id: 'o2', total: 500, orderStatus: 'returned', paymentStatus: 'refunded', paymentMethod: 'bkash', createdAt: now },
        { _id: 'o3', total: 300, orderStatus: 'cancelled', paymentStatus: 'cancelled', paymentMethod: 'cod', createdAt: now },
      ];
      if (isRecent) {
        return {
          sort: () => ({ limit: () => ({ select: () => ({ lean: async () => rows }) }) }),
        };
      }
      return {
        select: () => ({ lean: async () => rows.filter((r) => (query?.orderStatus ? r.orderStatus === 'delivered' : true)) }),
      };
    }) as never;
    OrderModel.countDocuments = (async () => 3) as never;
    OrderModel.aggregate = (async (pipeline: Array<{ $group?: { _id?: unknown } }>) => {
      const groupKey = pipeline[0]?.$group?._id;
      if (groupKey === '$orderStatus') {
        return [
          { _id: 'delivered', count: 1 },
          { _id: 'returned', count: 1 },
          { _id: 'cancelled', count: 1 },
        ];
      }
      return [{ _id: null, total: 1000 }];
    }) as never;
    UserModel.countDocuments = (async () => 10) as never;
    UserModel.find = (() => ({ select: () => ({ lean: async () => [] }) })) as never;
    ProductModel.countDocuments = (async () => 16) as never;
    ProductModel.find = ((filter: Record<string, unknown>) => {
      if (filter.manageInventory) {
        return { select: () => ({ lean: async () => lowProductsMock }) };
      }
      return {
        sort: () => ({
          limit: () => ({
            select: () => ({
              lean: async () => [
                {
                  _id: 'top-var',
                  name: 'Top Variant Item',
                  slug: 'top-variant',
                  sku: 'TOP-V',
                  soldCount: 20,
                  stockOnHand: 0,
                  reservedStock: 0,
                  hasVariants: true,
                  variants: [
                    { isActive: true, stockOnHand: 8, reservedStock: 3 },
                    { isActive: false, stockOnHand: 50, reservedStock: 0 },
                  ],
                  basePrice: 1200,
                  salePrice: 990,
                  images: [],
                },
              ],
            }),
          }),
        }),
      };
    }) as never;
    ReviewModel.countDocuments = (async () => 2) as never;
    SiteVisitModel.countDocuments = (async () => 100) as never;
    SiteVisitModel.aggregate = (async () => []) as never;
    AuditLogModel.find = (() => ({ sort: () => ({ limit: () => ({ lean: async () => [] }) }) })) as never;
    HomepageConfigModel.findOne = (() => ({ select: () => ({ lean: async () => ({}) }) })) as never;
    SupportEnquiryModel.countDocuments = (async () => 1) as never;

    const overview = await getAdminOverviewData(90, 'week');
    assert.equal(overview.salesSeries.length, 90);
    assert.equal(overview.metrics.netSales, 2000);
    assert.equal(overview.metrics.activeOrderCount, 1);
    assert.equal(overview.metrics.lowStockCount, 16);
    assert.equal(overview.metrics.outOfStockCount, 1);
    assert.equal(overview.revenueOverview.total, 2000);
    assert.equal(overview.revenueOverview.trendPct, 100);
    assert.equal(overview.revenueOverview.series.length, 7);
    assert.equal(overview.topProducts[0].availableStock, 5);
  } finally {
    OrderModel.find = origOrderFind;
    OrderModel.countDocuments = origOrderCount;
    OrderModel.aggregate = origOrderAgg;
    UserModel.countDocuments = origUserCount;
    UserModel.find = origUserFind;
    ProductModel.countDocuments = origProdCount;
    ProductModel.find = origProdFind;
    ReviewModel.countDocuments = origRevCount;
    SiteVisitModel.countDocuments = origVisitCount;
    SiteVisitModel.aggregate = origVisitAgg;
    AuditLogModel.find = origAuditFind;
    HomepageConfigModel.findOne = origCmsFindOne;
    SupportEnquiryModel.countDocuments = origEnqCount;
  }
});

test('Inventory listStockLevels computes variant-aware stock and filters low/out accurately', async () => {
  const origProdFind = ProductModel.find;
  try {
    ProductModel.find = (() => ({
      populate: () => ({
        select: () => ({
          sort: () => ({
            lean: async () => [
              {
                _id: 'p-healthy-var',
                name: 'Healthy Variant',
                sku: 'HV-1',
                hasVariants: true,
                stockOnHand: 0,
                reservedStock: 0,
                lowStockThreshold: 5,
                variants: [{ isActive: true, stockOnHand: 20, reservedStock: 2, lowStockThreshold: 5 }],
              },
              {
                _id: 'p-low-var',
                name: 'Low Variant',
                sku: 'LV-1',
                hasVariants: true,
                stockOnHand: 0,
                reservedStock: 0,
                lowStockThreshold: 5,
                variants: [
                  { isActive: true, stockOnHand: 4, reservedStock: 1, lowStockThreshold: 5 },
                  { isActive: true, stockOnHand: 10, reservedStock: 0, lowStockThreshold: 5 },
                ],
              },
            ],
          }),
        }),
      }),
    })) as never;

    const res = await listStockLevels({ stockFilter: 'low', page: 1, limit: 10 });
    assert.equal(res.pagination.total, 1);
    assert.equal(res.items[0].id, 'p-low-var');
    assert.equal(res.items[0].stockOnHand, 14);
    assert.equal(res.items[0].reservedStock, 1);
    assert.equal(res.items[0].availableStock, 13);
  } finally {
    ProductModel.find = origProdFind;
  }
});

test('Order shipping, cancellation, payment refunds, and return rejection/refund lifecycles maintain DB integrity', async () => {
  const origOrderFindById = OrderModel.findById;
  const origOrderUpdateOne = OrderModel.updateOne;
  const origProdFindById = ProductModel.findById;
  const origProdUpdateOne = ProductModel.updateOne;
  const origInvCreate = InventoryMovementModel.create;
  const origPayUpdateMany = PaymentTransactionModel.updateMany;
  const origReturnFindById = ReturnRequestModel.findById;

  const validOrderId = '507f1f77bcf86cd799439021';
  const validReturnId = '507f1f77bcf86cd799439022';

  try {
    assert.equal(orderPaymentStatusUpdateSchema.safeParse({ paymentStatus: 'refund_pending' }).success, true);

    // 1. Shipping an untracked product skips stock decrement while still incrementing soldCount
    let shipProdUpdate: Record<string, unknown> | null = null;
    const packedOrderDoc = {
      _id: validOrderId,
      orderNumber: 'NOV-9001',
      orderStatus: 'packed',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      fulfillmentStatus: 'packing',
      items: [{ productId: 'prod-untracked', sku: 'UNT-1', name: 'Untracked Service', quantity: 2 }],
      statusHistory: [] as unknown[],
      save: async () => undefined,
      toObject: () => packedOrderDoc,
    };
    OrderModel.findById = (async () => packedOrderDoc) as never;
    ProductModel.findById = (() => ({ select: () => ({ lean: async () => ({ manageInventory: false }) }) })) as never;
    ProductModel.updateOne = (async (_f: unknown, update: Record<string, unknown>) => {
      shipProdUpdate = update;
      return { modifiedCount: 1 };
    }) as never;
    await transitionOrderStatusAdmin({
      id: validOrderId,
      nextStatus: 'shipped',
      actorId: 'admin-1',
      actorName: 'Ops Lead',
    });
    assert.deepEqual(shipProdUpdate, { $inc: { soldCount: 2 } });

    // 2. Cancelling a paid order with pending cancellationRequest auto-approves & moves payment to refund_pending
    let txRefundPending = false;
    const paidPendingCancelDoc = {
      _id: validOrderId,
      orderNumber: 'NOV-9002',
      orderStatus: 'confirmed',
      paymentMethod: 'bkash',
      paymentStatus: 'paid',
      fulfillmentStatus: 'unfulfilled',
      items: [{ productId: 'prod-tracked', sku: 'TRK-1', name: 'Tracked Item', quantity: 1 }],
      cancellationRequest: { status: 'pending', reason: 'Changed mind' },
      cancellationHistory: [] as unknown[],
      statusHistory: [] as unknown[],
      save: async () => undefined,
      toObject: () => paidPendingCancelDoc,
    };
    OrderModel.findById = (async () => paidPendingCancelDoc) as never;
    ProductModel.findById = (() => ({ select: () => ({ lean: async () => ({ manageInventory: true }) }) })) as never;
    ProductModel.updateOne = (async () => ({ modifiedCount: 1 })) as never;
    InventoryMovementModel.create = (async () => ({})) as never;
    PaymentTransactionModel.updateMany = (async (_f: unknown, u: { $set?: { status?: string } }) => {
      if (u.$set?.status === 'refund_pending') txRefundPending = true;
      return { modifiedCount: 1 };
    }) as never;

    const cancelledRes = await transitionOrderStatusAdmin({
      id: validOrderId,
      nextStatus: 'cancelled',
      reason: 'Staff cancelled',
      actorId: 'admin-1',
      actorName: 'Ops Lead',
    });
    assert.equal(cancelledRes.order.paymentStatus, 'refund_pending');
    assert.equal(paidPendingCancelDoc.cancellationRequest.status, 'approved');
    assert.equal(txRefundPending, true);

    // 3. Payment status guard blocks marking unpaid order as refunded
    const unpaidDoc = {
      _id: validOrderId,
      orderNumber: 'NOV-9003',
      paymentMethod: 'cod',
      paymentStatus: 'unpaid',
      total: 1500,
      staffNotes: [] as unknown[],
      save: async () => undefined,
      toObject: () => unpaidDoc,
    };
    OrderModel.findById = (async () => unpaidDoc) as never;
    await assert.rejects(
      () => updateOrderPaymentStatusAdmin({ id: validOrderId, paymentStatus: 'refunded', actorName: 'Finance' }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'REFUND_NOT_ELIGIBLE',
    );

    // 4. Return claim: invalid transition rejected, rejection restores order to delivered, refund restocks & closes
    const retDoc = {
      _id: validReturnId,
      orderId: validOrderId,
      orderNumber: 'NOV-9004',
      status: 'requested' as string,
      restocked: false,
      refundAmount: 2500,
      items: [{ productId: 'prod-1', sku: 'SKU-1', name: 'Headphones', quantity: 1 }],
      save: async () => undefined,
      toObject: () => retDoc,
    };
    ReturnRequestModel.findById = (async () => retDoc) as never;
    await assert.rejects(
      () =>
        updateReturnAdmin({
          id: validReturnId,
          status: 'refunded',
          restockEligible: true,
          actorId: 'admin-1',
          actorName: 'Ops',
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'INVALID_RETURN_TRANSITION',
    );

    let restoredOrderToDelivered = false;
    OrderModel.updateOne = (async (_f: unknown, u: { $set?: { orderStatus?: string } }) => {
      if (u.$set?.orderStatus === 'delivered') restoredOrderToDelivered = true;
      return { modifiedCount: 1 };
    }) as never;
    await updateReturnAdmin({
      id: validReturnId,
      status: 'rejected',
      inspectionNotes: 'Warranty seal broken',
      restockEligible: false,
      actorId: 'admin-1',
      actorName: 'Ops',
    });
    assert.equal(restoredOrderToDelivered, true);

    retDoc.status = 'received';
    retDoc.restocked = false;
    let restockedOnRefund = false;
    let orderMarkedReturned = false;
    ProductModel.updateOne = (async () => {
      restockedOnRefund = true;
      return { matchedCount: 1, modifiedCount: 1 };
    }) as never;
    OrderModel.updateOne = (async (_f: unknown, u: { $set?: { orderStatus?: string } }) => {
      if (u.$set?.orderStatus === 'returned') orderMarkedReturned = true;
      return { modifiedCount: 1 };
    }) as never;
    await updateReturnAdmin({
      id: validReturnId,
      status: 'refunded',
      restockEligible: true,
      actorId: 'admin-1',
      actorName: 'Ops',
    });
    assert.equal(restockedOnRefund, true);
    assert.equal(retDoc.restocked, true);
    assert.equal(orderMarkedReturned, true);
  } finally {
    OrderModel.findById = origOrderFindById;
    OrderModel.updateOne = origOrderUpdateOne;
    ProductModel.findById = origProdFindById;
    ProductModel.updateOne = origProdUpdateOne;
    InventoryMovementModel.create = origInvCreate;
    PaymentTransactionModel.updateMany = origPayUpdateMany;
    ReturnRequestModel.findById = origReturnFindById;
  }
});

test('Categories aggregate sub-category counts, bulk publish validates required attributes, coupons cap %, and deletes throw 404', async () => {
  const origCatFind = CategoryModel.find;
  const origProdAgg = ProductModel.aggregate;
  const origProdFind = ProductModel.find;
  const origPresetFind = ProductAttributePresetModel.find;
  const origCouponDelete = CouponModel.findByIdAndDelete;
  const origPageDelete = CmsPageModel.findByIdAndDelete;

  try {
    // 1. Category list aggregation merges primary & subCategory counts
    CategoryModel.find = (() => ({
      sort: () => ({
        lean: async () => [
          { _id: 'cat-main', name: 'Electronics', slug: 'electronics', parentId: null },
          { _id: 'cat-sub', name: 'Laptops', slug: 'laptops', parentId: 'cat-main' },
        ],
      }),
    })) as never;
    ProductModel.aggregate = (async () => [
      { _id: 'cat-main', count: 4 },
      { _id: 'cat-sub', count: 2 },
    ]) as never;
    const cats = await listCategoriesAdmin();
    assert.equal(cats.find((c) => c.id === 'cat-sub')?.productCount, 2);

    // 2. Bulk publish enforces required category attributes
    ProductAttributePresetModel.find = (() => ({
      lean: async () => [
        {
          _id: 'attr-1',
          name: 'Warranty Period',
          code: 'warranty',
          inputType: 'short_text',
          scope: 'category',
          categoryIds: ['cat-main'],
          isRequired: true,
          isActive: true,
        },
      ],
    })) as never;
    ProductModel.find = (() => ({
      select: () => ({
        lean: async () => [{ _id: 'p-missing-attr', name: 'Laptop X', categoryId: 'cat-main', attributeValues: [] }],
      }),
    })) as never;
    await assert.rejects(
      () => bulkProductActionAdmin({ ids: ['p-missing-attr'], action: 'publish' }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'ATTRIBUTE_VALIDATION_ERROR',
    );

    // 3. Percentage coupons and non-fixed discount rules cap at 100%
    assert.equal(couponSchema.safeParse({ code: 'BAD150', discountType: 'percentage', discountValue: 150 }).success, false);
    assert.equal(couponSchema.safeParse({ code: 'FLAT500', discountType: 'fixed', discountValue: 500 }).success, true);
    assert.equal(discountRuleSchema.safeParse({ name: 'Bad Pct', ruleType: 'percentage', value: 120 }).success, false);
    assert.equal(discountRuleSchema.safeParse({ name: 'Bad Bulk', ruleType: 'bulk', value: 105 }).success, false);
    assert.equal(discountRuleSchema.safeParse({ name: 'Fixed 250', ruleType: 'fixed', value: 250 }).success, true);

    // 4. Missing coupon / CMS page deletes throw 404
    CouponModel.findByIdAndDelete = (async () => null) as never;
    await assert.rejects(
      () => deleteCouponAdmin('507f1f77bcf86cd799439031'),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 404 && err.code === 'COUPON_NOT_FOUND',
    );
    CmsPageModel.findByIdAndDelete = (async () => null) as never;
    await assert.rejects(
      () => deleteCmsPageAdmin('507f1f77bcf86cd799439032'),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 404 && err.code === 'PAGE_NOT_FOUND',
    );
  } finally {
    CategoryModel.find = origCatFind;
    ProductModel.aggregate = origProdAgg;
    ProductModel.find = origProdFind;
    ProductAttributePresetModel.find = origPresetFind;
    CouponModel.findByIdAndDelete = origCouponDelete;
    CmsPageModel.findByIdAndDelete = origPageDelete;
  }
});

test('Customer RBAC guards, customer group cleanup, and last super_admin protection prevent privilege escalation and lockouts', async () => {
  const origUserFindById = UserModel.findById;
  const origUserCount = UserModel.countDocuments;
  const origUserUpdateMany = UserModel.updateMany;
  const origGroupDelete = CustomerGroupModel.findByIdAndDelete;

  try {
    // 1. User with customers.view only (canManageStaff: false) cannot suspend staff
    UserModel.findById = (() => ({
      select: async () => ({ _id: 'staff-1', role: 'order_manager', status: 'active', email: 'ops@novara.test' }),
    })) as never;
    await assert.rejects(
      () =>
        updateCustomerStatusAdmin({
          id: 'staff-1',
          actorId: 'support-1',
          canManageStaff: false,
          status: 'suspended',
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 403 && err.code === 'FORBIDDEN',
    );

    // 2. Deleting missing group -> 404; deleting valid group clears customerGroupId on users
    CustomerGroupModel.findByIdAndDelete = (async () => null) as never;
    await assert.rejects(
      () => deleteCustomerGroupAdmin('507f1f77bcf86cd799439041'),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 404 && err.code === 'GROUP_NOT_FOUND',
    );

    let clearedGroup = false;
    CustomerGroupModel.findByIdAndDelete = (async () => ({ _id: 'grp-1' })) as never;
    UserModel.updateMany = (async (_f: unknown, u: { $set?: { customerGroupId?: unknown } }) => {
      if (u.$set?.customerGroupId === null) clearedGroup = true;
      return { modifiedCount: 2 };
    }) as never;
    const grpDel = await deleteCustomerGroupAdmin('grp-1');
    assert.equal(grpDel.deleted, true);
    assert.equal(clearedGroup, true);

    // 3. updateStaffAdmin blocks self-demotion and last super_admin demotion/suspension
    UserModel.findById = (() => ({
      select: async () => ({ _id: 'sa-1', role: 'super_admin', status: 'active', email: 'root@novara.test' }),
    })) as never;
    await assert.rejects(
      () =>
        updateStaffAdmin({
          id: 'sa-1',
          actorId: 'sa-1',
          role: 'admin',
          status: 'active',
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'SELF_DEMOTE_FORBIDDEN',
    );

    UserModel.countDocuments = (async () => 0) as never;
    await assert.rejects(
      () =>
        updateStaffAdmin({
          id: 'sa-1',
          actorId: 'other-admin',
          role: 'admin',
          status: 'active',
        }),
      (err: { statusCode?: number; code?: string }) => err.statusCode === 400 && err.code === 'LAST_SUPER_ADMIN',
    );
  } finally {
    UserModel.findById = origUserFindById;
    UserModel.countDocuments = origUserCount;
    UserModel.updateMany = origUserUpdateMany;
    CustomerGroupModel.findByIdAndDelete = origGroupDelete;
  }
});




