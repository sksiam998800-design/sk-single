import { computeAvailableStock } from './orderStateMachine';

export interface VariantDimensionValue {
  label: string;
  colorHex?: string;
}

export interface VariantDimensionInput {
  name: string;
  values: string[];
  colors?: Record<string, string>;
}

export interface VariantDimensionConfig {
  name: string;
  values: VariantDimensionValue[];
}

export interface VariantMatrixRowInput {
  _id?: string;
  sku: string;
  title: string;
  options: Record<string, string>;
  price?: number | null;
  salePrice?: number | null;
  stockOnHand: number;
  reservedStock?: number;
  lowStockThreshold?: number;
  barcode?: string;
  weight?: number | null;
  imageUrl?: string;
  images?: Array<string | { url: string; alt?: string }>;
  isActive?: boolean;
}

export function slugifySkuToken(raw: string): string {
  return raw
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 12);
}

export function buildCombinationKey(options: Record<string, string>): string {
  return Object.entries(options)
    .filter(([k, v]) => k.trim() && v.trim())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k.trim().toLowerCase()}=${v.trim().toLowerCase()}`)
    .join('|');
}

export function generateUniqueVariantSku(
  baseSku: string,
  options: Record<string, string>,
  takenSkus: Set<string>,
): string {
  const prefix = slugifySkuToken(baseSku) || 'SKU';
  const suffixParts = Object.values(options)
    .map((v) => slugifySkuToken(v).slice(0, 6))
    .filter(Boolean);
  const candidateBase = [prefix, ...suffixParts].filter(Boolean).join('-') || `${prefix}-VAR`;

  let candidate = candidateBase;
  let counter = 2;
  while (takenSkus.has(candidate)) {
    candidate = `${candidateBase}-${counter}`;
    counter += 1;
  }
  takenSkus.add(candidate);
  return candidate;
}

export function generateVariantCombinations(input: {
  baseSku: string;
  dimensions: VariantDimensionConfig[];
  defaultPrice?: number | null;
  defaultSalePrice?: number | null;
  defaultStock?: number;
  defaultLowStockThreshold?: number;
  existingVariants?: VariantMatrixRowInput[];
  excludedKeys?: Set<string> | string[];
}): VariantMatrixRowInput[] {
  const cleanDimensions = input.dimensions
    .map((d) => ({
      name: d.name.trim(),
      values: d.values
        .map((v) => ({ label: v.label.trim(), colorHex: v.colorHex }))
        .filter((v) => v.label.length > 0),
    }))
    .filter((d) => d.name.length > 0 && d.values.length > 0);

  if (cleanDimensions.length === 0) {
    return [];
  }

  const excludedSet = new Set<string>(
    Array.isArray(input.excludedKeys)
      ? input.excludedKeys
      : input.excludedKeys
        ? Array.from(input.excludedKeys)
        : [],
  );

  // Build lookup of existing variants by normalized combination key
  const existingMap = new Map<string, VariantMatrixRowInput>();
  for (const existing of input.existingVariants || []) {
    const key = buildCombinationKey(existing.options || {});
    if (key && !existingMap.has(key)) {
      existingMap.set(key, existing);
    }
  }

  // Cartesian product across dimensions
  let combos: Array<Record<string, string>> = [{}];
  for (const dim of cleanDimensions) {
    const nextCombos: Array<Record<string, string>> = [];
    for (const prefix of combos) {
      for (const val of dim.values) {
        nextCombos.push({ ...prefix, [dim.name]: val.label });
      }
    }
    combos = nextCombos;
  }

  const takenSkus = new Set<string>();
  const rows: VariantMatrixRowInput[] = [];

  for (const optionMap of combos) {
    const comboKey = buildCombinationKey(optionMap);
    if (excludedSet.has(comboKey)) continue;

    const prev = existingMap.get(comboKey);
    const title = Object.values(optionMap).join(' / ');
    let sku = prev?.sku?.trim().toUpperCase() || '';
    if (!sku || takenSkus.has(sku)) {
      sku = generateUniqueVariantSku(input.baseSku, optionMap, takenSkus);
    } else {
      takenSkus.add(sku);
    }

    rows.push({
      ...(prev?._id ? { _id: prev._id } : {}),
      sku,
      title,
      options: optionMap,
      price: prev?.price !== undefined ? prev.price : (input.defaultPrice ?? null),
      salePrice: prev?.salePrice !== undefined ? prev.salePrice : (input.defaultSalePrice ?? null),
      stockOnHand: prev?.stockOnHand ?? input.defaultStock ?? 10,
      reservedStock: prev?.reservedStock ?? 0,
      lowStockThreshold: prev?.lowStockThreshold ?? input.defaultLowStockThreshold ?? 5,
      barcode: prev?.barcode || '',
      weight: prev?.weight ?? null,
      imageUrl: prev?.imageUrl || '',
      images: prev?.images || [],
      isActive: prev?.isActive !== false,
    });
  }

  return rows;
}

export interface CustomerVariantDimension {
  name: string;
  isColorDimension: boolean;
  values: Array<{
    label: string;
    colorHex?: string;
  }>;
}

const KNOWN_COLOR_HEX: Record<string, string> = {
  black: '#111827',
  'midnight black': '#0F172A',
  midnight: '#0B1730',
  'charcoal black': '#1F2937',
  charcoal: '#374151',
  silver: '#CBD5E1',
  'starlight silver': '#E2E8F0',
  white: '#F8FAFC',
  'white/navy': '#E2E8F0',
  blue: '#2563EB',
  'titanium blue': '#4B6B8F',
  'sky blue': '#93C5FD',
  navy: '#1E3A8A',
  'midnight navy': '#0A1E40',
  red: '#DC2626',
  green: '#16A34A',
  gold: '#D97706',
  pink: '#EC4899',
  purple: '#7C3AED',
  titanium: '#78716C',
  'titanium black': '#292524',
  gray: '#6B7280',
  grey: '#6B7280',
};

export function inferColorHex(label: string, explicitHex?: string): string | undefined {
  if (explicitHex && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(explicitHex.trim())) {
    return explicitHex.trim();
  }
  return KNOWN_COLOR_HEX[label.trim().toLowerCase()];
}

export function extractVariantDimensions(
  variants: VariantMatrixRowInput[],
  savedVariantOptions?: Array<{ name: string; values: string[]; colors?: Record<string, string> }>,
): CustomerVariantDimension[] {
  const activeVariants = (variants || []).filter((v) => v.isActive !== false);
  const dimOrder: string[] = [];
  const dimValuesMap = new Map<string, Set<string>>();
  const colorMetaMap = new Map<string, Record<string, string>>();

  if (Array.isArray(savedVariantOptions)) {
    for (const opt of savedVariantOptions) {
      const name = opt.name?.trim();
      if (!name) continue;
      if (!dimValuesMap.has(name)) {
        dimOrder.push(name);
        dimValuesMap.set(name, new Set());
      }
      if (opt.colors) {
        colorMetaMap.set(name, opt.colors);
      }
      for (const val of opt.values || []) {
        const clean = String(val).trim();
        if (clean) dimValuesMap.get(name)!.add(clean);
      }
    }
  }

  for (const v of activeVariants) {
    const opts = v.options || {};
    for (const [k, val] of Object.entries(opts)) {
      const dimName = k.trim();
      const optVal = String(val ?? '').trim();
      if (!dimName || !optVal) continue;
      if (!dimValuesMap.has(dimName)) {
        dimOrder.push(dimName);
        dimValuesMap.set(dimName, new Set());
      }
      dimValuesMap.get(dimName)!.add(optVal);
    }
  }

  return dimOrder
    .map((name) => {
      const rawValues = Array.from(dimValuesMap.get(name) || []);
      const colorLookup = colorMetaMap.get(name) || {};
      const isColorDimension =
        name.toLowerCase().includes('color') ||
        name.toLowerCase().includes('colour') ||
        Object.keys(colorLookup).length > 0;

      return {
        name,
        isColorDimension,
        values: rawValues.map((label) => ({
          label,
          colorHex: isColorDimension ? inferColorHex(label, colorLookup[label]) || '#64748B' : undefined,
        })),
      };
    })
    .filter((d) => d.values.length > 0);
}

export function resolveSelectedVariant<T extends VariantMatrixRowInput>(
  variants: T[],
  selection: Record<string, string>,
): T | null {
  const active = (variants || []).filter((v) => v.isActive !== false);
  if (active.length === 0) return null;

  const entries = Object.entries(selection).filter(([, val]) => Boolean(val));
  if (entries.length === 0) return active[0];

  const exact = active.find((v) => {
    const opts = v.options || {};
    return entries.every(([k, val]) => String(opts[k] || '').trim() === val.trim());
  });
  return exact || null;
}

export interface DimensionOptionState {
  label: string;
  colorHex?: string;
  isSelected: boolean;
  existsInMatrix: boolean;
  inStock: boolean;
  selectable: boolean;
}

export function getDimensionOptionStates(input: {
  variants: VariantMatrixRowInput[];
  dimensions: CustomerVariantDimension[];
  currentSelection: Record<string, string>;
  allowBackorder?: boolean;
  manageInventory?: boolean;
}): Record<string, DimensionOptionState[]> {
  const activeVariants = (input.variants || []).filter((v) => v.isActive !== false);
  const bypassStock = input.manageInventory === false || input.allowBackorder === true;
  const result: Record<string, DimensionOptionState[]> = {};

  for (const dim of input.dimensions) {
    result[dim.name] = dim.values.map((valObj) => {
      const candidateSelection: Record<string, string> = {
        ...input.currentSelection,
        [dim.name]: valObj.label,
      };

      const matchingVariants = activeVariants.filter((v) => {
        const opts = v.options || {};
        return Object.entries(candidateSelection).every(
          ([k, chosen]) => !chosen || String(opts[k] || '').trim() === chosen.trim(),
        );
      });

      // Also check whether this option exists with *any* combination if current partial selection restricts it
      const existsAnywhere = activeVariants.some(
        (v) => String(v.options?.[dim.name] || '').trim() === valObj.label.trim(),
      );

      const existsInMatrix = matchingVariants.length > 0;
      const inStock = bypassStock
        ? existsInMatrix
        : matchingVariants.some(
            (v) => computeAvailableStock(Number(v.stockOnHand || 0), Number(v.reservedStock || 0)) > 0,
          );

      // Selectable if this option has stock in either the current combo or another valid combo (so switching auto-selects it)
      const inStockAnywhere = bypassStock
        ? existsAnywhere
        : activeVariants.some(
            (v) =>
              String(v.options?.[dim.name] || '').trim() === valObj.label.trim() &&
              computeAvailableStock(Number(v.stockOnHand || 0), Number(v.reservedStock || 0)) > 0,
          );

      return {
        label: valObj.label,
        colorHex: valObj.colorHex,
        isSelected: input.currentSelection[dim.name] === valObj.label,
        existsInMatrix,
        inStock,
        selectable: inStockAnywhere,
      };
    });
  }

  return result;
}

export function pickVariantForOptionChange<T extends VariantMatrixRowInput>(input: {
  variants: T[];
  currentSelection: Record<string, string>;
  dimensionName: string;
  nextValue: string;
  allowBackorder?: boolean;
  manageInventory?: boolean;
}): { variant: T | null; selection: Record<string, string> } {
  const activeVariants = (input.variants || []).filter((v) => v.isActive !== false);
  const bypassStock = input.manageInventory === false || input.allowBackorder === true;
  const desired = { ...input.currentSelection, [input.dimensionName]: input.nextValue };

  // 1. Exact match with all current selections (only prefer immediately if in stock)
  const exact = activeVariants.find((v) => {
    const opts = v.options || {};
    return Object.entries(desired).every(([k, val]) => !val || String(opts[k] || '').trim() === val.trim());
  });
  const exactInStock =
    exact &&
    (bypassStock || computeAvailableStock(Number(exact.stockOnHand || 0), Number(exact.reservedStock || 0)) > 0);
  if (exact && exactInStock) {
    return { variant: exact, selection: { ...(exact.options || {}) } };
  }

  // 2. Nearest valid variant having the clicked dimension value (preferring in-stock)
  const candidates = activeVariants.filter(
    (v) => String(v.options?.[input.dimensionName] || '').trim() === input.nextValue.trim(),
  );
  const inStockCandidate = candidates.find(
    (v) => bypassStock || computeAvailableStock(Number(v.stockOnHand || 0), Number(v.reservedStock || 0)) > 0,
  );
  const fallback = inStockCandidate || exact || candidates[0] || null;
  return {
    variant: fallback,
    selection: fallback ? { ...(fallback.options || {}) } : desired,
  };
}
