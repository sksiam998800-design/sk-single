import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBackgroundLayerStyle,
  buildGradientCss,
  buildOverlayCss,
  createDefaultDynamicBanner,
  DEFAULT_HOMEPAGE_LAYOUT_SECTIONS,
  getBannerGridColSpanClass,
  getCustomColSpanValue,
  getWidthModeLabel,
  hexToRgba,
  normalizeBannerFromApi,
  normalizeHomepageLayoutSections,
  randomizeGradientConfig,
  resolveBannerHeights,
  sortBannersByOrder,
} from './bannerBuilder';

describe('bannerBuilder domain logic', () => {
  it('converts 3-digit and 6-digit hex colors to rgba cleanly', () => {
    assert.equal(hexToRgba('#145CFF', 100), 'rgba(20, 92, 255, 1)');
    assert.equal(hexToRgba('#fff', 50), 'rgba(255, 255, 255, 0.5)');
    assert.equal(hexToRgba('#0A1F44', 0), 'rgba(10, 31, 68, 0)');
    // Graceful fallback on invalid hex
    assert.equal(hexToRgba('invalid', 80), 'rgba(20, 92, 255, 0.8)');
  });

  it('builds sorted linear and radial multi-stop CSS gradients', () => {
    const linear = buildGradientCss({
      type: 'linear',
      angle: 135,
      opacity: 90,
      stops: [
        { color: '#0A2DFF', position: 100 },
        { color: '#145CFF', position: 0 },
        { color: '#60A5FA', position: 50 },
      ],
    });
    assert.equal(
      linear,
      'linear-gradient(135deg, rgba(20, 92, 255, 0.9) 0%, rgba(96, 165, 250, 0.9) 50%, rgba(10, 45, 255, 0.9) 100%)',
    );

    const radial = buildGradientCss({
      type: 'radial',
      angle: 90,
      opacity: 100,
      stops: [
        { color: '#145CFF', position: 0 },
        { color: '#071B3A', position: 100 },
      ],
    });
    assert.equal(
      radial,
      'radial-gradient(circle at center, rgba(20, 92, 255, 1) 0%, rgba(7, 27, 58, 1) 100%)',
    );
  });

  it('builds overlay CSS for none, solid, and gradient overlay modes', () => {
    assert.equal(
      buildOverlayCss({ type: 'none', color: '#000000', secondaryColor: '#111111', direction: 'to right', opacity: 50 }),
      'none',
    );
    assert.equal(
      buildOverlayCss({ type: 'solid', color: '#000000', secondaryColor: '#111111', direction: 'to right', opacity: 40 }),
      'linear-gradient(180deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.4) 100%)',
    );
    const gradOverlay = buildOverlayCss({
      type: 'gradient',
      color: '#0A1F44',
      secondaryColor: '#145CFF',
      direction: 'to right',
      opacity: 80,
    });
    assert.match(gradOverlay, /^linear-gradient\(to right,/);
  });

  it('resolves background layer styles for all 5 background types', () => {
    const base = createDefaultDynamicBanner({
      backgroundColor: '#145CFF',
      backgroundOpacity: 85,
    });
    const solid = buildBackgroundLayerStyle({ ...base, backgroundType: 'solid' });
    assert.equal(solid.backgroundImage, undefined);
    assert.equal(solid.backgroundColor, 'rgba(20, 92, 255, 0.85)');

    const grad = buildBackgroundLayerStyle({ ...base, backgroundType: 'gradient' });
    assert.ok(grad.backgroundImage?.startsWith('linear-gradient('));

    const gradImg = buildBackgroundLayerStyle({ ...base, backgroundType: 'gradient_image' });
    assert.ok(gradImg.backgroundImage?.startsWith('linear-gradient('));

    const imgOnly = buildBackgroundLayerStyle({ ...base, backgroundType: 'image' });
    assert.equal(imgOnly.backgroundImage, undefined);
  });

  it('normalizes legacy banner API objects cleanly with safe defaults', () => {
    const legacy = normalizeBannerFromApi({
      _id: 'abc123',
      title: 'Summer Tech Event',
      desktopImageUrl: '/assets/promo.jpg',
      placement: 'homepage_mid',
      ctaText: 'Explore',
      destinationUrl: '/shop',
      priority: 5,
      isPublished: true,
    });

    assert.equal(legacy.id, 'abc123');
    assert.equal(legacy.name, 'Summer Tech Event');
    assert.equal(legacy.backgroundType, 'image_overlay');
    assert.equal(legacy.widthMode, 'full');
    assert.equal(legacy.buttonSettings.primary.text, 'Explore');
    assert.equal(legacy.status, 'published');
    assert.equal(legacy.gradientConfig.stops.length >= 2, true);
  });

  it('sorts banners by displayOrder ascending then priority descending', () => {
    const sorted = sortBannersByOrder([
      { id: 'b', displayOrder: 2, priority: 10 },
      { id: 'a1', displayOrder: 1, priority: 5 },
      { id: 'a2', displayOrder: 1, priority: 20 },
    ]);
    assert.deepEqual(
      sorted.map((x) => x.id),
      ['a2', 'a1', 'b'],
    );
  });

  it('maps width modes and labels accurately', () => {
    assert.equal(getBannerGridColSpanClass('full'), 'md:col-span-12');
    assert.equal(getBannerGridColSpanClass('half'), 'md:col-span-6');
    assert.equal(getBannerGridColSpanClass('one_third'), 'md:col-span-4');
    assert.equal(getBannerGridColSpanClass('two_thirds'), 'md:col-span-8');
    assert.equal(getWidthModeLabel('custom', 42), 'Custom (42%)');
  });

  it('randomizes gradient config with 2 valid stops', () => {
    const g = randomizeGradientConfig();
    assert.equal(g.stops.length, 2);
    assert.ok(g.stops[0].color.startsWith('#'));
    assert.ok(g.stops[1].color.startsWith('#'));
  });

  it('normalizes homepage layout sections sequentially by displayOrder', () => {
    const reversed = DEFAULT_HOMEPAGE_LAYOUT_SECTIONS.slice(0, 3).map((s, idx) => ({
      ...s,
      displayOrder: 10 - idx,
    }));
    const normalized = normalizeHomepageLayoutSections(reversed);
    assert.deepEqual(
      normalized.map((s) => s.displayOrder),
      [0, 1, 2],
    );
    assert.equal(normalized[0].sectionId, reversed[2].sectionId);
  });

  it('resolves responsive height presets and custom dimensions accurately', () => {
    assert.deepEqual(resolveBannerHeights({ heightMode: 'auto' }), {
      desktop: 'auto',
      tablet: 'auto',
      mobile: 'auto',
    });
    assert.deepEqual(resolveBannerHeights({ heightMode: 'small' }), {
      desktop: '160px',
      tablet: '150px',
      mobile: '140px',
    });
    assert.deepEqual(resolveBannerHeights({ heightMode: 'medium' }), {
      desktop: '260px',
      tablet: '230px',
      mobile: '200px',
    });
    assert.deepEqual(resolveBannerHeights({ heightMode: 'large' }), {
      desktop: '380px',
      tablet: '320px',
      mobile: '260px',
    });
    assert.deepEqual(
      resolveBannerHeights({ heightMode: 'custom', minHeightPx: 420, tabletMinHeightPx: 340, mobileMinHeightPx: 250 }),
      {
        desktop: '420px',
        tablet: '340px',
        mobile: '250px',
      },
    );

    const legacyCustom = normalizeBannerFromApi({
      title: 'Tall Hero',
      contentSettings: { minHeightPx: 410 },
    });
    assert.equal(legacyCustom.contentSettings.heightMode, 'custom');
    assert.equal(legacyCustom.contentSettings.minHeightPx, 410);
  });

  it('calculates custom 12-column grid span clamped to 1..12', () => {
    assert.equal(getCustomColSpanValue(50), 6);
    assert.equal(getCustomColSpanValue(33), 4);
    assert.equal(getCustomColSpanValue(67), 8);
    assert.equal(getCustomColSpanValue(5), 1);
    assert.equal(getCustomColSpanValue(100), 12);
  });
});
