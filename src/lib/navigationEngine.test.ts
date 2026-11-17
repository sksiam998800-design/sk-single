import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMegaMenuGeometry,
  computeNavigationOverviewStats,
  computeNextSlideIndex,
  filterStorefrontMenus,
  isSafeNavigationUrl,
  normalizeNavigationMenu,
  sanitizeNavigationUrl,
  slugifyNavigationSegment,
} from './navigationEngine';

test('URL and text sanitization prevents XSS/javascript protocols and builds clean slugs', () => {
  assert.equal(isSafeNavigationUrl('/shop'), true);
  assert.equal(isSafeNavigationUrl('/category/mobiles-tablets?sort=newest'), true);
  assert.equal(isSafeNavigationUrl('https://novara.com.bd/offers'), true);
  assert.equal(isSafeNavigationUrl('#featured'), false); // only exact '#' allowed, or '/' paths
  assert.equal(isSafeNavigationUrl('#'), true);
  assert.equal(isSafeNavigationUrl('javascript:alert(1)'), false);
  assert.equal(isSafeNavigationUrl('data:text/html,<script>alert(1)</script>'), false);
  assert.equal(isSafeNavigationUrl('//evil.example.com'), false);
  assert.equal(sanitizeNavigationUrl('javascript:void(0)', '/shop'), '/shop');
  assert.equal(slugifyNavigationSegment('Electronics & Smart Tech!'), 'electronics-smart-tech');
});

test('filterStorefrontMenus enforces active, published, schedule window, and viewport visibility', () => {
  const now = new Date('2026-11-17T12:00:00.000Z');
  const menus = [
    normalizeNavigationMenu({
      id: 'm1',
      label: 'Electronics',
      url: '/category/mobiles-tablets',
      type: 'mega_menu',
      isActive: true,
      isPublished: true,
      displayOrder: 2,
      groups: [
        {
          id: 'g1',
          title: 'Devices',
          slug: 'devices',
          isActive: true,
          displayOrder: 0,
          items: [
            {
              id: 'i1',
              label: 'Smartphones',
              slug: 'smartphones',
              url: '/category/mobiles-tablets',
              target: '_self',
              isActive: true,
              displayOrder: 0,
              visibilitySettings: { showIcon: true, showDescription: true, desktopVisible: true, mobileVisible: true },
            },
            {
              id: 'i2',
              label: 'Hidden Link',
              slug: 'hidden',
              url: '/shop',
              target: '_self',
              isActive: false,
              displayOrder: 1,
              visibilitySettings: { showIcon: true, showDescription: true, desktopVisible: true, mobileVisible: true },
            },
          ],
        },
        {
          id: 'g2',
          title: 'Disabled Group',
          slug: 'disabled',
          isActive: false,
          displayOrder: 1,
          items: [
            {
              id: 'i3',
              label: 'Should Hide',
              slug: 'should-hide',
              url: '/shop',
              target: '_self',
              isActive: true,
              displayOrder: 0,
              visibilitySettings: { showIcon: true, showDescription: true, desktopVisible: true, mobileVisible: true },
            },
          ],
        },
      ],
      slides: [
        {
          id: 's1',
          imageUrl: '/src/assets/images/hero_smart_tech_1794832024388.jpg',
          altText: 'Active Slide',
          target: '_self',
          focalPoint: 'center',
          objectFit: 'cover',
          isActive: true,
          displayOrder: 0,
        },
        {
          id: 's2',
          imageUrl: '/src/assets/images/promo_headphones_1794832024152.jpg',
          altText: 'Disabled Slide',
          target: '_self',
          focalPoint: 'center',
          objectFit: 'cover',
          isActive: false,
          displayOrder: 1,
        },
      ],
    }),
    normalizeNavigationMenu({
      id: 'm2',
      label: 'Home',
      url: '/',
      type: 'link',
      isActive: true,
      isPublished: true,
      displayOrder: 0,
    }),
    normalizeNavigationMenu({
      id: 'm3',
      label: 'Draft Campaign',
      url: '/offers',
      isActive: true,
      isPublished: false,
      displayOrder: 1,
    }),
    normalizeNavigationMenu({
      id: 'm4',
      label: 'Future Menu',
      url: '/offers',
      isActive: true,
      isPublished: true,
      startsAt: '2026-12-01T00:00:00.000Z',
      displayOrder: 3,
    }),
  ];

  const desktopMenus = filterStorefrontMenus(menus, { now, viewport: 'desktop' });
  assert.equal(desktopMenus.length, 2);
  assert.equal(desktopMenus[0].label, 'Home');
  assert.equal(desktopMenus[1].label, 'Electronics');
  assert.equal(desktopMenus[1].groups.length, 1);
  assert.equal(desktopMenus[1].groups[0].items.length, 1);
  assert.equal(desktopMenus[1].groups[0].items[0].label, 'Smartphones');
  assert.equal(desktopMenus[1].slides.length, 1);
  assert.equal(desktopMenus[1].slides[0].altText, 'Active Slide');
});

test('computeMegaMenuGeometry clamps height to available viewport and avoids horizontal edge clipping', () => {
  // Small laptop viewport (700px tall), trigger near bottom at y=130, admin max=640
  const geo = computeMegaMenuGeometry({
    triggerRect: { left: 1120, right: 1240, top: 90, bottom: 130, width: 120 },
    viewportWidth: 1280,
    viewportHeight: 700,
    menuWidth: 'xl',
    alignment: 'left',
    adminMaxHeightPx: 640,
    configuredColumns: 0,
    groupCount: 4,
    hasPromoSidebar: true,
  });

  assert.equal(geo.top, 134);
  // maxHeight must fit within viewport (700 - 134 - 20 = 546)
  assert.equal(geo.maxHeight <= 700 - geo.top - 20, true);
  // left + width must not exceed viewportWidth - 16
  assert.equal(geo.left + geo.width <= 1280 - 16, true);
  assert.equal(geo.left >= 16, true);
  assert.equal(geo.effectiveColumns, 4);

  // Short viewport where 50 items need scrolling
  const shortGeo = computeMegaMenuGeometry({
    triggerRect: { left: 120, right: 220, top: 80, bottom: 120, width: 100 },
    viewportWidth: 1440,
    viewportHeight: 500,
    menuWidth: 'lg',
    alignment: 'center',
    adminMaxHeightPx: 600,
    configuredColumns: 3,
    groupCount: 2,
    hasPromoSidebar: false,
  });
  assert.equal(shortGeo.maxHeight, 356); // 500 - 124 - 20
  assert.equal(shortGeo.effectiveColumns, 2);
});

test('computeNextSlideIndex wraps cleanly in both directions and computeNavigationOverviewStats aggregates metrics', () => {
  assert.equal(computeNextSlideIndex(0, 3, 'next'), 1);
  assert.equal(computeNextSlideIndex(2, 3, 'next'), 0);
  assert.equal(computeNextSlideIndex(0, 3, 'prev'), 2);
  assert.equal(computeNextSlideIndex(1, 3, 'prev'), 0);

  const stats = computeNavigationOverviewStats([
    normalizeNavigationMenu({
      id: '1',
      label: 'Electronics',
      url: '/shop',
      isActive: true,
      isPublished: true,
      groups: [
        {
          id: 'g1',
          title: 'Phones',
          slug: 'phones',
          isActive: true,
          displayOrder: 0,
          items: [
            { id: 'a', label: 'A', slug: 'a', url: '/a', target: '_self', isActive: true, displayOrder: 0, visibilitySettings: { showIcon: true, showDescription: true, desktopVisible: true, mobileVisible: true } },
            { id: 'b', label: 'B', slug: 'b', url: '/b', target: '_self', isActive: true, displayOrder: 1, visibilitySettings: { showIcon: true, showDescription: true, desktopVisible: true, mobileVisible: true } },
          ],
        },
      ],
      slides: [
        { id: 's1', imageUrl: '/img1.jpg', altText: '1', target: '_self', focalPoint: 'center', objectFit: 'cover', isActive: true, displayOrder: 0 },
        { id: 's2', imageUrl: '/img2.jpg', altText: '2', target: '_self', focalPoint: 'center', objectFit: 'cover', isActive: false, displayOrder: 1 },
      ],
      promotions: [
        { id: 'p1', title: 'Deal', theme: 'royal-blue', isActive: true, displayOrder: 0 },
      ],
    }),
    normalizeNavigationMenu({
      id: '2',
      label: 'Hidden',
      url: '/hidden',
      isActive: false,
      isPublished: false,
    }),
  ]);

  assert.equal(stats.totalMenus, 2);
  assert.equal(stats.activeMenus, 1);
  assert.equal(stats.inactiveMenus, 1);
  assert.equal(stats.totalDropdownLinks, 2);
  assert.equal(stats.totalSlides, 2);
  assert.equal(stats.activeSlides, 1);
  assert.equal(stats.publishedPromoContent, 2); // 1 active slide + 1 active promo on published menu
});
