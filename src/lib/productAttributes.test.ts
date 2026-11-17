import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildGroupedSpecifications,
  formatAttributeDisplayValue,
  mergeLiveAttributeDefinitions,
  resolveAttributesForCategories,
  slugifyAttributeCode,
  syncLegacyAttributesMap,
  validateAttributeValue,
  type ProductAttributeDefinition,
} from './productAttributes';
import {
  buildCombinationKey,
  extractVariantDimensions,
  generateVariantCombinations,
  getDimensionOptionStates,
  pickVariantForOptionChange,
  resolveSelectedVariant,
} from './variantEngine';

const sampleDefs: ProductAttributeDefinition[] = [
  {
    id: 'attr-ram',
    name: 'RAM',
    code: 'ram',
    group: 'Processor & Memory',
    groupName: 'Processor & Memory',
    groupSortOrder: 1,
    inputType: 'single_select',
    scope: 'category',
    categoryIds: ['cat-mobile', 'cat-laptop'],
    values: ['8GB', '12GB', '16GB'],
    sortOrder: 1,
    isRequired: false,
    isVisibleToCustomers: true,
    showOnProductDetails: true,
    isFilterable: true,
    isSearchable: true,
    isComparable: true,
    isActive: true,
  },
  {
    id: 'attr-battery',
    name: 'Battery Capacity',
    code: 'battery_capacity',
    group: 'Battery & Charging',
    groupName: 'Battery & Charging',
    groupSortOrder: 2,
    inputType: 'number',
    unit: 'mAh',
    scope: 'category',
    categoryIds: ['cat-mobile'],
    values: [],
    validationRules: { min: 1000, max: 20000 },
    sortOrder: 1,
    isRequired: true,
    isVisibleToCustomers: true,
    showOnProductDetails: true,
    isFilterable: true,
    isSearchable: false,
    isComparable: true,
    isActive: true,
  },
  {
    id: 'attr-fabric',
    name: 'Fabric',
    code: 'fabric',
    group: 'Apparel & Fit',
    groupName: 'Apparel & Fit',
    groupSortOrder: 3,
    inputType: 'short_text',
    scope: 'category',
    categoryIds: ['cat-fashion'],
    values: [],
    sortOrder: 1,
    isRequired: false,
    isVisibleToCustomers: true,
    showOnProductDetails: true,
    isFilterable: true,
    isSearchable: true,
    isComparable: false,
    isActive: true,
  },
  {
    id: 'attr-origin',
    name: 'Country of Origin',
    code: 'origin',
    group: 'General',
    groupName: 'General',
    groupSortOrder: 0,
    inputType: 'short_text',
    scope: 'global',
    categoryIds: [],
    values: [],
    sortOrder: 1,
    isRequired: false,
    isVisibleToCustomers: true,
    showOnProductDetails: true,
    isFilterable: false,
    isSearchable: false,
    isComparable: false,
    isActive: true,
  },
  {
    id: 'attr-hidden',
    name: 'Internal Sourcing Tier',
    code: 'sourcing_tier',
    group: 'Internal',
    groupName: 'Internal',
    groupSortOrder: 99,
    inputType: 'short_text',
    scope: 'global',
    categoryIds: [],
    values: [],
    sortOrder: 1,
    isRequired: false,
    isVisibleToCustomers: false,
    showOnProductDetails: false,
    isFilterable: false,
    isSearchable: false,
    isComparable: false,
    isActive: true,
  },
];

test('slugifyAttributeCode generates clean snake_case codes', () => {
  assert.equal(slugifyAttributeCode('Battery Capacity (mAh)!'), 'battery_capacity_mah');
  assert.equal(slugifyAttributeCode('  5G Support  '), '5g_support');
});

test('resolveAttributesForCategories isolates mobile vs laptop vs fashion attributes', () => {
  const mobileAttrs = resolveAttributesForCategories(sampleDefs, 'cat-mobile', null);
  assert.deepEqual(
    mobileAttrs.map((a) => a.code),
    ['origin', 'ram', 'battery_capacity', 'sourcing_tier'],
  );

  const laptopAttrs = resolveAttributesForCategories(sampleDefs, 'cat-laptop', null);
  assert.equal(laptopAttrs.some((a) => a.code === 'battery_capacity'), false);
  assert.equal(laptopAttrs.some((a) => a.code === 'fabric'), false);
  assert.equal(laptopAttrs.some((a) => a.code === 'ram'), true);
});

test('validateAttributeValue enforces required, numeric bounds, select options, boolean, url, and regex', () => {
  const batteryDef = sampleDefs[1];
  assert.equal(validateAttributeValue(batteryDef, '').valid, false);
  assert.equal(validateAttributeValue(batteryDef, '500').valid, false);
  assert.equal(validateAttributeValue(batteryDef, '5000').valid, true);
  assert.equal(validateAttributeValue(batteryDef, '5000.5').valid, false);

  const ramDef = sampleDefs[0];
  assert.equal(validateAttributeValue(ramDef, '12GB').valid, true);
  assert.equal(validateAttributeValue(ramDef, '999GB').valid, false);

  assert.equal(
    validateAttributeValue(
      { name: '5G Support', inputType: 'boolean', isRequired: false, values: [] },
      true,
    ).valid,
    true,
  );
  assert.equal(
    validateAttributeValue(
      { name: 'Manual PDF', inputType: 'url', isRequired: false, values: [] },
      'not-a-url',
    ).valid,
    false,
  );
  assert.equal(
    validateAttributeValue(
      { name: 'Manual PDF', inputType: 'url', isRequired: false, values: [] },
      'https://novara.com.bd/manual.pdf',
    ).valid,
    true,
  );
});

test('formatAttributeDisplayValue appends unit cleanly without duplicating and omits empties', () => {
  assert.equal(formatAttributeDisplayValue({ inputType: 'number', value: 5000, unit: 'mAh' }), '5000 mAh');
  assert.equal(formatAttributeDisplayValue({ inputType: 'short_text', value: '5000 mAh', unit: 'mAh' }), '5000 mAh');
  assert.equal(formatAttributeDisplayValue({ inputType: 'boolean', value: true }), 'Yes');
  assert.equal(formatAttributeDisplayValue({ inputType: 'multi_select', value: ['5G', 'Wi-Fi 7'] }), '5G, Wi-Fi 7');
  assert.equal(formatAttributeDisplayValue({ inputType: 'short_text', value: '   ' }), null);
});

test('buildGroupedSpecifications omits empty or hidden attributes and deduplicates across legacy & custom specs', () => {
  const groups = buildGroupedSpecifications({
    attributeValues: [
      { code: 'ram', name: 'RAM', groupName: 'Processor & Memory', inputType: 'single_select', value: '12GB', sortOrder: 1 },
      { code: 'battery_capacity', name: 'Battery Capacity', groupName: 'Battery & Charging', inputType: 'number', value: 5000, unit: 'mAh', sortOrder: 2 },
      { code: 'empty_field', name: 'HDD Capacity', groupName: 'Processor & Memory', inputType: 'short_text', value: '', sortOrder: 3 },
      { code: 'sourcing_tier', name: 'Internal Sourcing Tier', groupName: 'Internal', inputType: 'short_text', value: 'Tier-A', isVisibleToCustomers: false, showOnProductDetails: false },
    ],
    specifications: [
      { label: 'Charging Power', value: '67', unit: 'W', groupName: 'Battery & Charging', sortOrder: 3 },
      { label: 'Empty Spec', value: '  ' },
    ],
    legacyAttributes: {
      RAM: '12GB',
      'Internal Sourcing Tier': 'Tier-A',
      Processor: 'Snapdragon 8 Gen 3',
    },
  });

  assert.equal(groups.some((g) => g.groupName === 'Internal'), false);
  const flatLabels = groups.flatMap((g) => g.items.map((i) => `${i.label}:${i.value}`));
  assert.equal(flatLabels.includes('RAM:12GB'), true);
  assert.equal(flatLabels.includes('Battery Capacity:5000 mAh'), true);
  assert.equal(flatLabels.includes('Charging Power:67 W'), true);
  assert.equal(flatLabels.includes('Processor:Snapdragon 8 Gen 3'), true);
  assert.equal(flatLabels.some((s) => s.startsWith('HDD Capacity')), false);
  assert.equal(flatLabels.some((s) => s.startsWith('Internal Sourcing Tier')), false);

  const synced = syncLegacyAttributesMap([
    { code: 'ram', name: 'RAM', inputType: 'single_select', value: '12GB' },
    { code: 'internal', name: 'Secret', inputType: 'short_text', value: 'Hidden', isVisibleToCustomers: false },
  ]);
  assert.deepEqual(synced, { RAM: '12GB' });
});

test('variantEngine generates Cartesian combinations, respects exclusions, preserves edits, and creates unique SKUs', () => {
  const existing = [
    {
      _id: 'var-1',
      sku: 'MBA4-256-SLV',
      title: '256GB / Silver',
      options: { Storage: '256GB', Color: 'Silver' },
      price: 139999,
      salePrice: 112999,
      stockOnHand: 8,
    },
  ];
  const excluded = [buildCombinationKey({ Storage: '512GB', Color: 'Silver' })];

  const generated = generateVariantCombinations({
    baseSku: 'NVR-MBA4',
    dimensions: [
      { name: 'Storage', values: [{ label: '256GB' }, { label: '512GB' }] },
      { name: 'Color', values: [{ label: 'Silver', colorHex: '#CBD5E1' }, { label: 'Midnight', colorHex: '#0B1730' }] },
    ],
    defaultPrice: 149999,
    defaultSalePrice: 119999,
    defaultStock: 10,
    existingVariants: existing,
    excludedKeys: excluded,
  });

  assert.equal(generated.length, 3);
  const preserved = generated.find((v) => v.sku === 'MBA4-256-SLV');
  assert.ok(preserved);
  assert.equal(preserved._id, 'var-1');
  assert.equal(preserved.stockOnHand, 8);
  assert.equal(new Set(generated.map((v) => v.sku)).size, 3);
  assert.equal(
    generated.some((v) => v.options.Storage === '512GB' && v.options.Color === 'Silver'),
    false,
  );
});

test('customer multi-dimension variant state disables out-of-stock/unavailable options and switches seamlessly', () => {
  const variants = [
    { _id: 'v1', sku: 'SHU-41-BLK', title: '41 / Black', options: { Size: '41', Color: 'Black' }, stockOnHand: 5, reservedStock: 0, isActive: true },
    { _id: 'v2', sku: 'SHU-42-BLK', title: '42 / Black', options: { Size: '42', Color: 'Black' }, stockOnHand: 0, reservedStock: 0, isActive: true },
    { _id: 'v3', sku: 'SHU-42-WHT', title: '42 / White', options: { Size: '42', Color: 'White' }, stockOnHand: 4, reservedStock: 0, isActive: true },
  ];
  const dims = extractVariantDimensions(variants);
  assert.equal(dims.length, 2);
  assert.equal(dims[1].isColorDimension, true);

  const selected = resolveSelectedVariant(variants, { Size: '41', Color: 'Black' });
  assert.equal(selected?.sku, 'SHU-41-BLK');

  const states = getDimensionOptionStates({
    variants,
    dimensions: dims,
    currentSelection: { Size: '41', Color: 'Black' },
  });
  const size42 = states.Size.find((s) => s.label === '42')!;
  assert.equal(size42.inStock, false); // 42/Black is 0 stock
  assert.equal(size42.selectable, true); // 42/White exists in stock, so clicking 42 switches to 42/White

  const switched = pickVariantForOptionChange({
    variants,
    currentSelection: { Size: '41', Color: 'Black' },
    dimensionName: 'Size',
    nextValue: '42',
  });
  assert.equal(switched.variant?.sku, 'SHU-42-WHT');
  assert.deepEqual(switched.selection, { Size: '42', Color: 'White' });
});

test('mergeLiveAttributeDefinitions overlays live rename, unit, groupName, colorHex, and hides inactive presets', () => {
  const merged = mergeLiveAttributeDefinitions(
    [
      {
        attributeId: 'attr-bat',
        code: 'battery_capacity',
        name: 'Battery',
        groupName: 'Power',
        inputType: 'number',
        value: 5000,
        unit: 'mAh',
        isVisibleToCustomers: true,
        showOnProductDetails: true,
      },
      {
        attributeId: 'attr-col',
        code: 'color',
        name: 'Color',
        groupName: 'Design',
        inputType: 'color',
        value: 'Midnight Titanium',
        isVisibleToCustomers: true,
        showOnProductDetails: true,
      },
      {
        attributeId: 'attr-dead',
        code: 'legacy_flag',
        name: 'Legacy Flag',
        groupName: 'General',
        inputType: 'boolean',
        value: true,
        isVisibleToCustomers: true,
        showOnProductDetails: true,
      },
    ],
    [
      {
        _id: 'attr-bat',
        code: 'battery_life',
        name: 'Battery Capacity',
        groupName: 'Battery & Charging',
        unit: 'mAh (Typical)',
        sortOrder: 5,
        isVisibleToCustomers: true,
        showOnProductDetails: true,
        isActive: true,
      },
      {
        _id: 'attr-col',
        code: 'color',
        name: 'Finish Color',
        groupName: 'Chassis',
        inputType: 'color',
        isActive: true,
        options: [{ label: 'Midnight Titanium', value: 'midnight', colorHex: '#1E293B' }],
      },
      {
        _id: 'attr-dead',
        code: 'legacy_flag',
        name: 'Legacy Flag',
        isActive: false,
      },
    ],
  );

  assert.equal(merged[0].name, 'Battery Capacity');
  assert.equal(merged[0].groupName, 'Battery & Charging');
  assert.equal(merged[0].unit, 'mAh (Typical)');
  assert.equal(merged[1].colorHex, '#1E293B');
  assert.equal(merged[2].isVisibleToCustomers, false);
  assert.equal(merged[2].showOnProductDetails, false);

  const grouped = buildGroupedSpecifications({ attributeValues: merged });
  assert.equal(grouped.some((g) => g.items.some((i) => i.label === 'Legacy Flag')), false);
  const batteryItem = grouped.flatMap((g) => g.items).find((i) => i.label === 'Battery Capacity');
  assert.equal(batteryItem?.value, '5000 mAh (Typical)');
});
