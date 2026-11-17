export type AttributeInputType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'decimal'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'color'
  | 'date'
  | 'url'
  | 'measurement'
  | 'file';

export type AttributeScope = 'global' | 'category' | 'product';

export interface AttributeOptionItem {
  label: string;
  value: string;
  colorHex?: string;
  sortOrder?: number;
}

export interface AttributeValidationRules {
  min?: number | null;
  max?: number | null;
  minLength?: number | null;
  maxLength?: number | null;
  pattern?: string;
}

export interface ProductAttributeDefinition {
  id: string;
  _id?: string;
  name: string;
  code: string;
  description?: string;
  group: string;
  groupId?: string | null;
  groupName?: string;
  groupSortOrder?: number;
  inputType: AttributeInputType;
  unit?: string;
  scope: AttributeScope;
  categoryIds?: string[];
  values: string[];
  options?: AttributeOptionItem[];
  defaultValue?: unknown;
  validationRules?: AttributeValidationRules;
  sortOrder?: number;
  isRequired: boolean;
  isVisibleToCustomers: boolean;
  showOnProductDetails: boolean;
  isFilterable: boolean;
  isSearchable: boolean;
  isComparable: boolean;
  isActive: boolean;
}

export interface ProductAttributeValueEntry {
  attributeId?: string | null;
  code: string;
  name: string;
  label?: string;
  groupName?: string;
  inputType?: AttributeInputType;
  value: unknown;
  unit?: string;
  colorHex?: string;
  sortOrder?: number;
  isVisibleToCustomers?: boolean;
  showOnProductDetails?: boolean;
  isFilterable?: boolean;
  isSearchable?: boolean;
  isComparable?: boolean;
  isCustom?: boolean;
}

export interface ProductSpecificationRow {
  label: string;
  value: string;
  unit?: string;
  groupName?: string;
  sortOrder?: number;
}

export interface ProductHighlightItem {
  icon: string;
  title: string;
  subtitle?: string;
  sortOrder?: number;
}

export interface ProductVideoItem {
  title: string;
  url: string;
  thumbnailUrl?: string;
  sortOrder?: number;
}

export interface ProductContentFieldItem {
  key?: string;
  label: string;
  value: string;
  unit?: string;
}

export interface ProductContentSectionItem {
  sectionId: string;
  title: string;
  sectionType:
    | 'prose'
    | 'key_value'
    | 'bullet_list'
    | 'media_banner'
    | 'specifications'
    | 'highlights'
    | 'whats_in_box'
    | 'compatibility'
    | 'dimensions'
    | 'materials'
    | 'care_instructions'
    | 'safety'
    | 'warranty'
    | 'manufacturer'
    | 'certifications'
    | 'notes'
    | 'custom';
  body?: string;
  mediaUrl?: string;
  fields: ProductContentFieldItem[];
  sortOrder: number;
  isEnabled: boolean;
  showToCustomer: boolean;
}

export const ATTRIBUTE_INPUT_TYPE_OPTIONS: Array<{ value: AttributeInputType; label: string }> = [
  { value: 'short_text', label: 'Short Text' },
  { value: 'long_text', label: 'Long Text' },
  { value: 'number', label: 'Number' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'boolean', label: 'Boolean (Yes / No)' },
  { value: 'single_select', label: 'Single Select' },
  { value: 'multi_select', label: 'Multiple Select' },
  { value: 'color', label: 'Color Selector' },
  { value: 'date', label: 'Date' },
  { value: 'url', label: 'URL / Link' },
  { value: 'measurement', label: 'Measurement with Unit' },
  { value: 'file', label: 'Image / File Reference' },
];

export function slugifyAttributeCode(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export function isEmptyAttributeValue(val: unknown): boolean {
  if (val === undefined || val === null) return true;
  if (typeof val === 'string') return val.trim().length === 0;
  if (Array.isArray(val)) return val.filter((v) => String(v ?? '').trim().length > 0).length === 0;
  return false;
}

export function normalizeAttributeOptions(
  options?: Array<Partial<AttributeOptionItem> | Record<string, unknown>>,
  legacyValues?: string[],
): AttributeOptionItem[] {
  if (Array.isArray(options) && options.length > 0) {
    return options
      .filter((o) => o && String(o.label || o.value || '').trim().length > 0)
      .map((o, idx) => {
        const label = String(o.label || o.value).trim();
        const value = String(o.value || o.label).trim();
        return {
          label,
          value,
          ...(o.colorHex ? { colorHex: String(o.colorHex).trim() } : {}),
          sortOrder: Number.isFinite(Number(o.sortOrder)) ? Number(o.sortOrder) : idx,
        };
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }
  if (Array.isArray(legacyValues) && legacyValues.length > 0) {
    return legacyValues
      .map((v) => String(v).trim())
      .filter(Boolean)
      .map((v, idx) => ({ label: v, value: v, sortOrder: idx }));
  }
  return [];
}

export function resolveAttributesForCategories(
  allAttributes: ProductAttributeDefinition[],
  categoryId?: string | null,
  subCategoryId?: string | null,
): ProductAttributeDefinition[] {
  const catTargets = new Set<string>(
    [categoryId, subCategoryId].map((v) => String(v || '').trim()).filter(Boolean),
  );

  return allAttributes
    .filter((attr) => {
      if (attr.isActive === false) return false;
      if (attr.scope === 'global') return true;
      if (attr.scope === 'category') {
        const assigned = (attr.categoryIds || []).map((id) => String(id));
        if (catTargets.size === 0) return false;
        return assigned.some((id) => catTargets.has(id));
      }
      return false;
    })
    .slice()
    .sort((a, b) => {
      const groupOrderDiff = Number(a.groupSortOrder ?? 0) - Number(b.groupSortOrder ?? 0);
      if (groupOrderDiff !== 0) return groupOrderDiff;
      const gA = (a.groupName || a.group || 'General').toLowerCase();
      const gB = (b.groupName || b.group || 'General').toLowerCase();
      if (gA !== gB) return gA.localeCompare(gB);
      const sortDiff = Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0);
      if (sortDiff !== 0) return sortDiff;
      return a.name.localeCompare(b.name);
    });
}

export interface AttributeValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAttributeValue(
  def: Pick<
    ProductAttributeDefinition,
    'name' | 'inputType' | 'isRequired' | 'validationRules' | 'options' | 'values'
  >,
  rawValue: unknown,
): AttributeValidationResult {
  const empty = isEmptyAttributeValue(rawValue);
  if (empty) {
    if (def.isRequired) {
      return { valid: false, error: `${def.name} is required.` };
    }
    return { valid: true };
  }

  const rules = def.validationRules || {};

  if (def.inputType === 'number' || def.inputType === 'decimal' || def.inputType === 'measurement') {
    const rawStr = String(rawValue).trim();
    const numeric = Number(rawStr);
    if (!Number.isFinite(numeric)) {
      if (def.inputType === 'measurement') {
        // Allow structured measurement text like "15.6 inch" if not purely numeric, unless min/max set
        if (rules.min != null || rules.max != null) {
          return { valid: false, error: `${def.name} must be a valid number.` };
        }
      } else {
        return { valid: false, error: `${def.name} must be a valid number.` };
      }
    } else {
      if (def.inputType === 'number' && !Number.isInteger(numeric)) {
        return { valid: false, error: `${def.name} must be a whole integer.` };
      }
      if (rules.min != null && numeric < rules.min) {
        return { valid: false, error: `${def.name} must be at least ${rules.min}.` };
      }
      if (rules.max != null && numeric > rules.max) {
        return { valid: false, error: `${def.name} must be at most ${rules.max}.` };
      }
    }
    return { valid: true };
  }

  if (def.inputType === 'boolean') {
    if (typeof rawValue === 'boolean') return { valid: true };
    const normalized = String(rawValue).trim().toLowerCase();
    if (!['true', 'false', 'yes', 'no', '1', '0'].includes(normalized)) {
      return { valid: false, error: `${def.name} must be Yes or No.` };
    }
    return { valid: true };
  }

  if (def.inputType === 'url' || def.inputType === 'file') {
    const str = String(rawValue).trim();
    const looksValid =
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('/') ||
      str.startsWith('data:image/');
    if (!looksValid) {
      return { valid: false, error: `${def.name} must be a valid URL or asset path.` };
    }
    return { valid: true };
  }

  if (def.inputType === 'date') {
    const ms = Date.parse(String(rawValue));
    if (!Number.isFinite(ms)) {
      return { valid: false, error: `${def.name} must be a valid date.` };
    }
    return { valid: true };
  }

  if (def.inputType === 'single_select' || def.inputType === 'multi_select') {
    const allowed = new Set(
      normalizeAttributeOptions(def.options, def.values).map((o) => o.value.toLowerCase()),
    );
    if (allowed.size > 0) {
      const selected = Array.isArray(rawValue)
        ? rawValue.map((v) => String(v).trim()).filter(Boolean)
        : String(rawValue)
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean);
      for (const item of selected) {
        if (!allowed.has(item.toLowerCase())) {
          return { valid: false, error: `"${item}" is not a valid option for ${def.name}.` };
        }
      }
    }
    return { valid: true };
  }

  const text = Array.isArray(rawValue) ? rawValue.join(', ') : String(rawValue).trim();
  if (rules.minLength != null && text.length < rules.minLength) {
    return { valid: false, error: `${def.name} must be at least ${rules.minLength} characters.` };
  }
  if (rules.maxLength != null && text.length > rules.maxLength) {
    return { valid: false, error: `${def.name} must be at most ${rules.maxLength} characters.` };
  }
  if (rules.pattern) {
    try {
      const regex = new RegExp(rules.pattern);
      if (!regex.test(text)) {
        return { valid: false, error: `${def.name} does not match the required format.` };
      }
    } catch {
      // Ignore malformed admin regex safely
    }
  }

  return { valid: true };
}

export function formatAttributeDisplayValue(entry: {
  inputType?: AttributeInputType;
  value: unknown;
  unit?: string;
}): string | null {
  if (isEmptyAttributeValue(entry.value)) return null;

  let formatted = '';
  if (entry.inputType === 'boolean') {
    if (typeof entry.value === 'boolean') {
      formatted = entry.value ? 'Yes' : 'No';
    } else {
      const norm = String(entry.value).trim().toLowerCase();
      formatted = norm === 'true' || norm === 'yes' || norm === '1' ? 'Yes' : 'No';
    }
  } else if (Array.isArray(entry.value)) {
    const items = entry.value.map((v) => String(v ?? '').trim()).filter(Boolean);
    if (items.length === 0) return null;
    formatted = items.join(', ');
  } else {
    formatted = String(entry.value).trim();
  }

  if (!formatted) return null;

  if (entry.unit && entry.unit.trim()) {
    const unitClean = entry.unit.trim();
    if (!formatted.toLowerCase().endsWith(unitClean.toLowerCase())) {
      formatted = `${formatted} ${unitClean}`;
    }
  }

  return formatted;
}

export interface GroupedSpecificationSection {
  groupName: string;
  items: Array<{
    label: string;
    value: string;
    code?: string;
    colorHex?: string;
    inputType?: AttributeInputType;
    isComparable?: boolean;
  }>;
}

const DEFAULT_GROUP_LABELS: Record<string, string> = {
  general: 'General Information',
  electronics: 'Technical Specifications',
  beauty: 'Formulation & Usage',
  books: 'Edition & Publishing',
  home: 'Dimensions & Build',
};

function normalizeGroupDisplayName(raw?: string): string {
  const clean = (raw || '').trim();
  if (!clean) return 'General Specifications';
  return DEFAULT_GROUP_LABELS[clean.toLowerCase()] || clean;
}

export function buildGroupedSpecifications(input: {
  attributeValues?: ProductAttributeValueEntry[];
  legacyAttributes?: Record<string, string>;
  attributes?: Record<string, string>;
  specifications?: ProductSpecificationRow[];
  includeHidden?: boolean;
}): GroupedSpecificationSection[] {
  const groupMap = new Map<
    string,
    {
      groupName: string;
      minOrder: number;
      items: Array<GroupedSpecificationSection['items'][number] & { _order: number }>;
    }
  >();
  const seenLabels = new Set<string>();

  const pushItem = (
    rawGroup: string | undefined,
    item: GroupedSpecificationSection['items'][number],
    sortOrder: number,
  ) => {
    const dedupeKey = item.label.trim().toLowerCase();
    if (!dedupeKey || !item.value.trim() || seenLabels.has(dedupeKey)) return;
    seenLabels.add(dedupeKey);

    const groupName = normalizeGroupDisplayName(rawGroup);
    const groupKey = groupName.toLowerCase();
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, { groupName, minOrder: sortOrder, items: [] });
    }
    const bucket = groupMap.get(groupKey)!;
    bucket.minOrder = Math.min(bucket.minOrder, sortOrder);
    bucket.items.push({ ...item, _order: sortOrder });
  };

  // 1. Dynamic structured attributeValues (respecting visibility flags unless includeHidden)
  const attrValues = Array.isArray(input.attributeValues) ? input.attributeValues : [];
  attrValues.forEach((entry, idx) => {
    if (!input.includeHidden && (entry.isVisibleToCustomers === false || entry.showOnProductDetails === false)) {
      // Mark label as seen so legacy map fallback cannot re-expose hidden attribute
      if (entry.name) seenLabels.add(entry.name.trim().toLowerCase());
      return;
    }
    const displayVal = formatAttributeDisplayValue({
      inputType: entry.inputType,
      value: entry.value,
      unit: entry.unit,
    });
    if (!displayVal) return;

    pushItem(
      entry.groupName || 'Technical Specifications',
      {
        label: entry.name,
        value: displayVal,
        code: entry.code,
        colorHex: entry.colorHex,
        inputType: entry.inputType,
        isComparable: entry.isComparable,
      },
      entry.sortOrder ?? idx,
    );
  });

  // 2. Explicit custom product specifications
  const specs = Array.isArray(input.specifications) ? input.specifications : [];
  specs.forEach((spec, idx) => {
    const formatted = formatAttributeDisplayValue({ value: spec.value, unit: spec.unit });
    if (!formatted || !spec.label?.trim()) return;
    pushItem(
      spec.groupName || 'Specifications',
      {
        label: spec.label.trim(),
        value: formatted,
      },
      spec.sortOrder ?? 1000 + idx,
    );
  });

  // 3. Legacy flat attributes map fallback
  const legacyMap = input.legacyAttributes || input.attributes;
  if (legacyMap && typeof legacyMap === 'object') {
    Object.entries(legacyMap).forEach(([key, val], idx) => {
      const cleanKey = key.trim();
      const cleanVal = String(val ?? '').trim();
      if (!cleanKey || !cleanVal) return;
      pushItem(
        'Additional Specifications',
        { label: cleanKey, value: cleanVal },
        2000 + idx,
      );
    });
  }

  return Array.from(groupMap.values())
    .sort((a, b) => a.minOrder - b.minOrder)
    .map((group) => ({
      groupName: group.groupName,
      items: group.items
        .sort((a, b) => a._order - b._order)
        .map(({ _order, ...rest }) => {
          void _order;
          return rest;
        }),
    }))
    .filter((g) => g.items.length > 0);
}

export function syncLegacyAttributesMap(
  entries: ProductAttributeValueEntry[],
  existingLegacy: Record<string, string> = {},
): Record<string, string> {
  const result: Record<string, string> = {};
  const managedNames = new Set(entries.map((e) => e.name.trim().toLowerCase()));

  for (const [k, v] of Object.entries(existingLegacy)) {
    if (!managedNames.has(k.trim().toLowerCase()) && String(v ?? '').trim()) {
      result[k] = String(v).trim();
    }
  }

  for (const entry of entries) {
    if (entry.isVisibleToCustomers === false || entry.showOnProductDetails === false) continue;
    const formatted = formatAttributeDisplayValue({
      inputType: entry.inputType,
      value: entry.value,
      unit: entry.unit,
    });
    if (formatted) {
      result[entry.name] = formatted;
    }
  }

  return result;
}

export interface LiveAttributePresetLike {
  id?: string;
  _id?: unknown;
  code: string;
  name: string;
  group?: string;
  groupName?: string;
  inputType?: AttributeInputType | string;
  unit?: string;
  sortOrder?: number;
  isVisibleToCustomers?: boolean;
  showOnProductDetails?: boolean;
  isFilterable?: boolean;
  isComparable?: boolean;
  isActive?: boolean;
  options?: Array<Partial<AttributeOptionItem>>;
}

export function mergeLiveAttributeDefinitions(
  entries: ProductAttributeValueEntry[] = [],
  livePresets: LiveAttributePresetLike[] = [],
): ProductAttributeValueEntry[] {
  if (!Array.isArray(entries) || entries.length === 0) return [];
  const byId = new Map<string, LiveAttributePresetLike>();
  const byCode = new Map<string, LiveAttributePresetLike>();

  for (const preset of livePresets || []) {
    const pid = String(preset.id || preset._id || '').trim();
    if (pid) byId.set(pid, preset);
    const pcode = String(preset.code || '').trim().toLowerCase();
    if (pcode) byCode.set(pcode, preset);
  }

  return entries.map((entry) => {
    const entryId = entry.attributeId ? String(entry.attributeId).trim() : '';
    const entryCode = String(entry.code || '').trim().toLowerCase();
    const preset = (entryId && byId.get(entryId)) || (entryCode ? byCode.get(entryCode) : undefined);

    if (!preset) return entry;

    const inactive = preset.isActive === false;
    let resolvedColorHex = entry.colorHex || '';
    if (!resolvedColorHex && (preset.inputType === 'color' || entry.inputType === 'color') && Array.isArray(preset.options)) {
      const valStr = String(entry.value ?? '').trim().toLowerCase();
      const optMatch = preset.options.find(
        (o) =>
          String(o.label || '').trim().toLowerCase() === valStr ||
          String(o.value || '').trim().toLowerCase() === valStr,
      );
      if (optMatch?.colorHex) resolvedColorHex = optMatch.colorHex;
    }

    return {
      ...entry,
      name: preset.name || entry.name,
      code: preset.code || entry.code,
      groupName: preset.groupName || preset.group || entry.groupName,
      unit: preset.unit !== undefined ? preset.unit : entry.unit,
      sortOrder: preset.sortOrder !== undefined ? preset.sortOrder : entry.sortOrder,
      isVisibleToCustomers: inactive ? false : preset.isVisibleToCustomers !== false,
      showOnProductDetails: inactive ? false : preset.showOnProductDetails !== false,
      isFilterable: preset.isFilterable !== undefined ? Boolean(preset.isFilterable) : entry.isFilterable,
      isComparable: preset.isComparable !== undefined ? Boolean(preset.isComparable) : entry.isComparable,
      ...(resolvedColorHex ? { colorHex: resolvedColorHex } : {}),
    };
  });
}

