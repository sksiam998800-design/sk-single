import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckSquare,
  Layers,
  MessageSquare,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Video,
  Wand2,
  X,
} from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { CloudinaryImageField } from '../../../components/admin/CloudinaryImageField';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type {
  AttributeGroupItem,
  AttributeInputType,
  BrandItem,
  CategoryItem,
  ProductAttributePresetItem,
  ProductAttributeValueEntry,
  ProductContentSectionItem,
  ProductHighlightItem,
  ProductItem,
  ProductQuestionItem,
  ProductSpecificationRow,
  ProductVideoItem,
} from '../../../types/commerce';
import {
  ATTRIBUTE_INPUT_TYPE_OPTIONS,
  isEmptyAttributeValue,
  normalizeAttributeOptions,
  slugifyAttributeCode,
  syncLegacyAttributesMap,
  validateAttributeValue,
  type ProductAttributeDefinition,
} from '../../../lib/productAttributes';
import {
  generateVariantCombinations,
  inferColorHex,
  type VariantDimensionInput,
} from '../../../lib/variantEngine';
import { toLocalDateTimeInputValue } from '../../../lib/dateTime';
import { useSeoMeta } from '../../../lib/useSeoMeta';

function slugify(val: string) {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const HIGHLIGHT_ICON_OPTIONS = [
  'Cpu',
  'BatteryCharging',
  'Monitor',
  'Feather',
  'Camera',
  'ShieldCheck',
  'Sparkles',
  'Zap',
  'Wifi',
  'Award',
  'Package',
  'Headphones',
];

interface VariantRow {
  _id?: string;
  sku: string;
  barcode?: string;
  title: string;
  options: Record<string, string>;
  imageUrl?: string;
  price: string;
  salePrice: string;
  stockOnHand: string;
  lowStockThreshold: string;
  weight: string;
  isActive: boolean;
}

const FORM_SECTIONS = [
  { id: 'sec-core', label: 'Core' },
  { id: 'sec-media', label: 'Media & Video' },
  { id: 'sec-pricing', label: 'Pricing' },
  { id: 'sec-inventory', label: 'Inventory' },
  { id: 'sec-attributes', label: 'Attributes' },
  { id: 'sec-specs', label: 'Specs' },
  { id: 'sec-variants', label: 'Variants' },
  { id: 'sec-highlights', label: 'Highlights' },
  { id: 'sec-custom', label: 'Custom Sections' },
  { id: 'sec-faqs', label: 'FAQs & Q&A' },
  { id: 'sec-seo', label: 'SEO' },
];

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  useSeoMeta({ title: `${isEdit ? 'Edit' : 'Add'} Product | NOVARA Admin`, noIndex: true });

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [attributeGroups, setAttributeGroups] = useState<AttributeGroupItem[]>([]);
  const [categoryAttributes, setCategoryAttributes] = useState<ProductAttributeDefinition[]>([]);
  const [loadingAttrs, setLoadingAttrs] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);

  // Core
  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEdit);
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [attributeGroup, setAttributeGroup] = useState('general');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('published');

  // Pricing
  const [basePrice, setBasePrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [flashSalePrice, setFlashSalePrice] = useState('');
  const [flashSaleStartsAt, setFlashSaleStartsAt] = useState('');
  const [flashSaleEndsAt, setFlashSaleEndsAt] = useState('');

  // Inventory & Shipping
  const [stockOnHand, setStockOnHand] = useState('10');
  const [lowStockThreshold, setLowStockThreshold] = useState('5');
  const [manageInventory, setManageInventory] = useState(true);
  const [allowBackorder, setAllowBackorder] = useState(false);
  const [weight, setWeight] = useState('');
  const [dimLength, setDimLength] = useState('');
  const [dimWidth, setDimWidth] = useState('');
  const [dimHeight, setDimHeight] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [returnPolicyNote, setReturnPolicyNote] = useState('');

  // Media & Videos
  const [images, setImages] = useState<Array<{ url: string; publicId?: string; alt?: string }>>([
    { url: '', alt: '' },
  ]);
  const [videos, setVideos] = useState<ProductVideoItem[]>([]);

  // Attributes & Specs
  const [legacyAttributes, setLegacyAttributes] = useState<Record<string, string>>({});
  const [attributeValues, setAttributeValues] = useState<ProductAttributeValueEntry[]>([]);
  const [specifications, setSpecifications] = useState<ProductSpecificationRow[]>([]);

  // Variant Engine
  const [hasVariants, setHasVariants] = useState(false);
  const [variantDimensions, setVariantDimensions] = useState<VariantDimensionInput[]>([]);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [newDimName, setNewDimName] = useState('');
  const [dimValueInputs, setDimValueInputs] = useState<Record<number, string>>({});

  // Highlights, Features, Custom Sections, FAQs, Q&A
  const [highlights, setHighlights] = useState<ProductHighlightItem[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureInput, setNewFeatureInput] = useState('');
  const [contentSections, setContentSections] = useState<ProductContentSectionItem[]>([]);
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [questions, setQuestions] = useState<ProductQuestionItem[]>([]);
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, { answer: string; isPublished: boolean }>>({});

  // Badges & SEO
  const [isFeatured, setIsFeatured] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSeller, setIsBestSeller] = useState(false);
  const [isPremiumCollection, setIsPremiumCollection] = useState(false);
  const [tagsText, setTagsText] = useState('');
  const [bilingualKeywordsText, setBilingualKeywordsText] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoKeywordsText, setSeoKeywordsText] = useState('');

  // Inline Create New Attribute Modal
  const [inlineAttrOpen, setInlineAttrOpen] = useState(false);
  const [inAttrName, setInAttrName] = useState('');
  const [inAttrCode, setInAttrCode] = useState('');
  const [inAttrType, setInAttrType] = useState<AttributeInputType>('short_text');
  const [inAttrUnit, setInAttrUnit] = useState('');
  const [inAttrScope, setInAttrScope] = useState<'global' | 'category'>('category');
  const [inAttrGroupId, setInAttrGroupId] = useState('');
  const [inAttrOptionsText, setInAttrOptionsText] = useState('');
  const [inAttrFilterable, setInAttrFilterable] = useState(true);
  const [inAttrRequired, setInAttrRequired] = useState(false);
  const [savingInlineAttr, setSavingInlineAttr] = useState(false);

  // Add Product-Specific Custom Attribute
  const [customAttrModalOpen, setCustomAttrModalOpen] = useState(false);
  const [customAttrLabel, setCustomAttrLabel] = useState('');
  const [customAttrType, setCustomAttrType] = useState<AttributeInputType>('short_text');
  const [customAttrUnit, setCustomAttrUnit] = useState('');
  const [customAttrGroup, setCustomAttrGroup] = useState('Custom Specifications');

  const markDirty = () => setDirty(true);

  // Unsaved changes browser navigation protection
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const fetchCategoryAttributes = useCallback(async (catId: string, subId: string) => {
    if (!catId) {
      setCategoryAttributes([]);
      return;
    }
    setLoadingAttrs(true);
    try {
      const qs = new URLSearchParams({ categoryId: catId });
      if (subId) qs.set('subCategoryId', subId);
      const res = await apiRequest<{ ok: true; attributes: ProductAttributePresetItem[] }>(
        `/api/admin/attributes/by-category?${qs.toString()}`,
      );
      setCategoryAttributes(
        (res.attributes || []).map((a) => ({
          ...a,
          inputType: a.inputType || 'single_select',
          scope: a.scope || 'global',
          options: normalizeAttributeOptions(a.options || [], a.values || []),
          sortOrder: a.sortOrder ?? 0,
          isRequired: Boolean(a.isRequired),
          isVisibleToCustomers: a.isVisibleToCustomers !== false,
          showOnProductDetails: a.showOnProductDetails !== false,
          isFilterable: Boolean(a.isFilterable),
          isSearchable: a.isSearchable !== false,
          isComparable: Boolean(a.isComparable),
        })),
      );
    } catch {
      // Leave existing attributes intact if network temporarily drops
    } finally {
      setLoadingAttrs(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoading(true);
      setError(null);
      try {
        const [catRes, brandRes, grpRes] = await Promise.all([
          apiRequest<{ ok: true; categories: CategoryItem[] }>('/api/admin/categories'),
          apiRequest<{ ok: true; brands: BrandItem[] }>('/api/admin/brands'),
          apiRequest<{ ok: true; groups: AttributeGroupItem[] }>('/api/admin/attribute-groups').catch(() => ({
            groups: [],
          })),
        ]);
        if (cancelled) return;
        const cats = catRes.categories || [];
        setCategories(cats);
        setBrands(brandRes.brands || []);
        setAttributeGroups(grpRes.groups || []);

        if (id) {
          const prodRes = await apiRequest<{ ok: true; product: ProductItem }>(`/api/admin/products/${id}`);
          if (cancelled) return;
          const p = prodRes.product;
          const cId = p.categoryId ? (typeof p.categoryId === 'object' ? p.categoryId._id : p.categoryId) : '';
          const subId =
            p.subCategoryId && typeof p.subCategoryId === 'object'
              ? (p.subCategoryId as { _id: string })._id
              : p.subCategoryId || '';
          const bId = p.brandId && typeof p.brandId === 'object' ? p.brandId._id : p.brandId || '';

          setName(p.name || '');
          setNameBn(p.nameBn || '');
          setSlug(p.slug || '');
          setSlugManuallyEdited(true);
          setSku(p.sku || '');
          setBarcode(p.barcode || '');
          setCategoryId(cId || cats[0]?.id || '');
          setSubCategoryId(subId);
          setBrandId(bId);
          setAttributeGroup(p.attributeGroup || 'general');
          setLegacyAttributes(p.attributes || {});
          setAttributeValues(p.attributeValues || []);
          setSpecifications(p.specifications || []);
          setShortDescription(p.shortDescription || '');
          setDescription(p.description || '');
          setBasePrice(String(p.basePrice ?? ''));
          setCostPrice(p.costPrice != null ? String(p.costPrice) : '');
          setSalePrice(p.salePrice != null ? String(p.salePrice) : '');
          setFlashSalePrice(p.flashSalePrice != null ? String(p.flashSalePrice) : '');
          setFlashSaleStartsAt(toLocalDateTimeInputValue(p.flashSaleStartsAt));
          setFlashSaleEndsAt(toLocalDateTimeInputValue(p.flashSaleEndsAt));
          setStockOnHand(String(p.stockOnHand ?? 0));
          setLowStockThreshold(String(p.lowStockThreshold ?? 5));
          setManageInventory(p.manageInventory !== false);
          setAllowBackorder(Boolean(p.allowBackorder));
          setWeight(p.weight != null ? String(p.weight) : '');
          setDimLength(p.dimensions?.length != null ? String(p.dimensions.length) : '');
          setDimWidth(p.dimensions?.width != null ? String(p.dimensions.width) : '');
          setDimHeight(p.dimensions?.height != null ? String(p.dimensions.height) : '');
          setImages(
            p.images && p.images.length > 0
              ? p.images.map((img) => ({ url: img.url, publicId: img.publicId, alt: img.alt }))
              : [{ url: '', alt: '' }],
          );
          setVideos(p.videos || []);
          setHasVariants(Boolean(p.hasVariants && (p.variants?.length || p.variantOptions?.length)));
          setVariantDimensions(
            (p.variantOptions || []).map((o) => ({
              name: o.name,
              values: o.values || [],
              colors: o.colors || {},
            })),
          );
          setVariants(
            (p.variants || []).map((v) => ({
              _id: v._id,
              sku: v.sku,
              barcode: v.barcode || '',
              title: v.title,
              options: v.options || {},
              imageUrl:
                v.imageUrl ||
                (typeof v.images?.[0] === 'string'
                  ? v.images[0]
                  : (v.images?.[0] as { url?: string } | undefined)?.url) ||
                '',
              price: v.price != null ? String(v.price) : '',
              salePrice: v.salePrice != null ? String(v.salePrice) : '',
              stockOnHand: String(v.stockOnHand ?? 0),
              lowStockThreshold: String(v.lowStockThreshold ?? 5),
              weight: v.weight != null ? String(v.weight) : '',
              isActive: v.isActive !== false,
            })),
          );
          setHighlights(p.highlights || []);
          setFeatures(p.features || []);
          setContentSections(p.contentSections || []);
          setFaqs(p.faqs || []);
          const qs = p.questions || [];
          setQuestions(qs);
          const qMap: Record<string, { answer: string; isPublished: boolean }> = {};
          for (const q of qs) {
            const qid = q.id || q._id || '';
            if (qid) qMap[qid] = { answer: q.answer || '', isPublished: q.isPublished !== false };
          }
          setQuestionDrafts(qMap);

          setStatus(p.status);
          setIsFeatured(Boolean(p.isFeatured));
          setIsNewArrival(Boolean(p.isNewArrival));
          setIsBestSeller(Boolean(p.isBestSeller));
          setIsPremiumCollection(Boolean(p.isPremiumCollection));
          setWarrantyInfo(p.warrantyInfo || '');
          setReturnPolicyNote(p.returnPolicyNote || '');
          setTagsText((p.tags || []).join(', '));
          setBilingualKeywordsText((p.bilingualKeywords || []).join(', '));
          setSeoTitle(p.seoTitle || '');
          setSeoDescription(p.seoDescription || '');
          setSeoKeywordsText((p.seoKeywords || []).join(', '));
          setDirty(false);
        } else {
          const defaultCat = cats.find((c) => !c.parentId) || cats[0];
          setCategoryId(defaultCat?.id || '');
          setDirty(false);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load product data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (categoryId) {
      fetchCategoryAttributes(categoryId, subCategoryId);
    }
  }, [categoryId, subCategoryId, fetchCategoryAttributes]);

  const topCategories = categories.filter((c) => !c.parentId);
  const subCategories = categories.filter((c) => c.parentId === categoryId);

  const getAttrEntry = (code: string, fallbackLabel?: string) => {
    const byCode = attributeValues.find((e) => e.code.toLowerCase() === code.toLowerCase());
    if (byCode) return byCode.value;
    if (fallbackLabel && legacyAttributes[fallbackLabel] !== undefined) return legacyAttributes[fallbackLabel];
    if (legacyAttributes[code] !== undefined) return legacyAttributes[code];
    return '';
  };

  const setAttrEntry = (
    def: {
      id?: string;
      code: string;
      name: string;
      inputType: AttributeInputType;
      unit?: string;
      groupName?: string;
      group?: string;
      isVisibleToCustomers?: boolean;
      showOnProductDetails?: boolean;
      isCustom?: boolean;
    },
    nextValue: unknown,
    explicitColorHex?: string,
  ) => {
    markDirty();
    setAttributeValues((prev) => {
      const idx = prev.findIndex((e) => e.code.toLowerCase() === def.code.toLowerCase());
      const resolvedHex =
        explicitColorHex !== undefined
          ? explicitColorHex
          : def.inputType === 'color' && nextValue
            ? inferColorHex(String(nextValue)) || ''
            : '';
      const entry: ProductAttributeValueEntry = {
        attributeId: def.id || null,
        code: def.code,
        name: def.name,
        label: def.name,
        inputType: def.inputType,
        value: nextValue,
        unit: def.unit || '',
        colorHex: resolvedHex,
        groupName: def.groupName || def.group || 'General',
        isVisibleToCustomers: def.isVisibleToCustomers !== false,
        showOnProductDetails: def.showOnProductDetails !== false,
        isCustom: Boolean(def.isCustom),
      };
      if (idx >= 0) {
        return prev.map((item, i) => (i === idx ? { ...item, ...entry } : item));
      }
      return [...prev, entry];
    });
  };

  const customOnlyAttributes = useMemo(() => {
    const definedCodes = new Set(categoryAttributes.map((a) => a.code.toLowerCase()));
    return attributeValues.filter((e) => !definedCodes.has(e.code.toLowerCase()));
  }, [attributeValues, categoryAttributes]);

  const groupedCategoryAttributes = useMemo(() => {
    const groupsMap = new Map<string, ProductAttributeDefinition[]>();
    for (const def of categoryAttributes) {
      const grp = def.groupName || def.group || 'General';
      if (!groupsMap.has(grp)) groupsMap.set(grp, []);
      groupsMap.get(grp)!.push(def);
    }
    return Array.from(groupsMap.entries());
  }, [categoryAttributes]);

  const attributeValidationIssues = useMemo(() => {
    const issues: Record<string, string> = {};
    for (const def of categoryAttributes) {
      const val = getAttrEntry(def.code, def.name);
      if (def.isRequired && status === 'published') {
        const res = validateAttributeValue(def, val);
        if (!res.valid && res.error) issues[def.code] = res.error;
      } else if (!isEmptyAttributeValue(val)) {
        const res = validateAttributeValue({ ...def, isRequired: false }, val);
        if (!res.valid && res.error) issues[def.code] = res.error;
      }
    }
    return issues;
  }, [categoryAttributes, attributeValues, legacyAttributes, status]);

  const handleCreateInlineAttr = async (e: FormEvent) => {
    e.preventDefault();
    setSavingInlineAttr(true);
    try {
      const grp = attributeGroups.find((g) => g.id === inAttrGroupId);
      const opts = inAttrOptionsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((label, i) => ({
          label,
          value: label,
          colorHex: inAttrType === 'color' ? inferColorHex(label) : undefined,
          sortOrder: i,
        }));

      await apiRequest('/api/admin/attributes', {
        method: 'POST',
        body: JSON.stringify({
          name: inAttrName.trim(),
          code: slugifyAttributeCode(inAttrCode || inAttrName),
          inputType: inAttrType,
          unit: inAttrUnit.trim(),
          scope: inAttrScope,
          categoryIds: inAttrScope === 'category' && categoryId ? [categoryId] : [],
          group: grp?.slug || 'general',
          groupId: grp?.id || null,
          groupName: grp?.name || 'General',
          options: opts,
          values: opts.map((o) => o.label),
          isFilterable: inAttrFilterable,
          isRequired: inAttrRequired,
          isVisibleToCustomers: true,
          showOnProductDetails: true,
          isActive: true,
        }),
      });
      dispatch(showToast({ variant: 'success', message: 'Attribute created and attached to category.' }));
      setInlineAttrOpen(false);
      setInAttrName('');
      setInAttrCode('');
      setInAttrUnit('');
      setInAttrOptionsText('');
      await fetchCategoryAttributes(categoryId, subCategoryId);
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Unable to create attribute.' }));
    } finally {
      setSavingInlineAttr(false);
    }
  };

  const handleAddCustomProductAttr = (e: FormEvent) => {
    e.preventDefault();
    if (!customAttrLabel.trim()) return;
    const code = slugifyAttributeCode(customAttrLabel);
    setAttrEntry(
      {
        code,
        name: customAttrLabel.trim(),
        inputType: customAttrType,
        unit: customAttrUnit.trim(),
        groupName: customAttrGroup.trim() || 'Custom Specifications',
        isCustom: true,
      },
      customAttrType === 'boolean' ? true : '',
    );
    setCustomAttrModalOpen(false);
    setCustomAttrLabel('');
    setCustomAttrUnit('');
  };

  // Image reorder
  const moveImage = (idx: number, dir: -1 | 1) => {
    markDirty();
    setImages((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  // Variant Engine handlers
  const addDimension = () => {
    const clean = newDimName.trim();
    if (!clean) return;
    if (variantDimensions.some((d) => d.name.toLowerCase() === clean.toLowerCase())) {
      dispatch(showToast({ variant: 'warning', message: 'Dimension already exists.' }));
      return;
    }
    markDirty();
    setVariantDimensions((prev) => [...prev, { name: clean, values: [], colors: {} }]);
    setNewDimName('');
  };

  const addDimensionValue = (dimIdx: number) => {
    const val = (dimValueInputs[dimIdx] || '').trim();
    if (!val) return;
    markDirty();
    setVariantDimensions((prev) =>
      prev.map((d, i) => {
        if (i !== dimIdx) return d;
        if (d.values.some((v: string) => v.toLowerCase() === val.toLowerCase())) return d;
        const isColorDim = d.name.toLowerCase().includes('color') || d.name.toLowerCase().includes('colour');
        return {
          ...d,
          values: [...d.values, val],
          colors: isColorDim
            ? { ...(d.colors || {}), [val]: inferColorHex(val) || '#64748B' }
            : d.colors,
        };
      }),
    );
    setDimValueInputs((prev) => ({ ...prev, [dimIdx]: '' }));
  };

  const handleGenerateVariantMatrix = () => {
    const validDims = variantDimensions.filter((d) => d.values.length > 0);
    if (validDims.length === 0) {
      dispatch(showToast({ variant: 'warning', message: 'Add at least one dimension option value first.' }));
      return;
    }
    markDirty();
    setHasVariants(true);
    const existingForMerge = variants.map((v) => ({
      _id: v._id,
      sku: v.sku,
      barcode: v.barcode,
      title: v.title,
      options: v.options,
      price: v.price ? Number(v.price) : null,
      salePrice: v.salePrice ? Number(v.salePrice) : null,
      stockOnHand: Number(v.stockOnHand || 0),
      lowStockThreshold: Number(v.lowStockThreshold || 5),
      weight: v.weight ? Number(v.weight) : null,
      imageUrl: v.imageUrl,
      isActive: v.isActive,
    }));

    const matrix = generateVariantCombinations({
      baseSku: sku || 'SKU',
      dimensions: validDims.map((d) => ({
        name: d.name,
        values: d.values.map((label) => ({ label, colorHex: d.colors?.[label] })),
      })),
      defaultPrice: basePrice ? Number(basePrice) : null,
      defaultSalePrice: salePrice ? Number(salePrice) : null,
      defaultStock: Number(stockOnHand || 10),
      existingVariants: existingForMerge,
    });

    setVariants(
      matrix.map((m) => ({
        _id: m._id,
        sku: m.sku,
        barcode: m.barcode || '',
        title: m.title,
        options: m.options,
        imageUrl: m.imageUrl || '',
        price: m.price != null ? String(m.price) : '',
        salePrice: m.salePrice != null ? String(m.salePrice) : '',
        stockOnHand: String(m.stockOnHand ?? 0),
        lowStockThreshold: String(m.lowStockThreshold ?? 5),
        weight: m.weight != null ? String(m.weight) : '',
        isActive: m.isActive !== false,
      })),
    );
    dispatch(showToast({ variant: 'success', message: `Generated ${matrix.length} variant combinations.` }));
  };

  // Custom Content Section helpers
  const addContentSection = () => {
    markDirty();
    setContentSections((prev) => [
      ...prev,
      {
        sectionId: `sec_${Date.now().toString(36)}`,
        title: 'Additional Information',
        sectionType: 'prose',
        isEnabled: true,
        showToCustomer: true,
        sortOrder: prev.length,
        body: '',
        fields: [],
      },
    ]);
  };

  const moveContentSection = (idx: number, dir: -1 | 1) => {
    markDirty();
    setContentSections((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, sortOrder: i }));
    });
  };

  const handleSaveQuestionAnswer = async (qId: string) => {
    if (!id) return;
    const draft = questionDrafts[qId];
    if (!draft) return;
    try {
      const res = await apiRequest<{ ok: true; question: ProductQuestionItem }>(
        `/api/admin/products/${id}/questions/${qId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ answer: draft.answer, isPublished: draft.isPublished }),
        },
      );
      setQuestions((prev) =>
        prev.map((q) => ((q.id || q._id) === qId ? { ...q, ...res.question } : q)),
      );
      dispatch(showToast({ variant: 'success', message: 'Customer Q&A updated.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Failed to save answer.' }));
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!id) return;
    try {
      await apiRequest(`/api/admin/products/${id}/questions/${qId}`, { method: 'DELETE' });
      setQuestions((prev) => prev.filter((q) => (q.id || q._id) !== qId));
      dispatch(showToast({ variant: 'success', message: 'Question deleted.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
      dispatch(showToast({ variant: 'warning', message: 'Please select a primary category.' }));
      return;
    }
    const firstIssue = Object.values(attributeValidationIssues)[0];
    if (firstIssue) {
      dispatch(showToast({ variant: 'error', message: firstIssue }));
      document.getElementById('sec-attributes')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const gallery = images
        .filter((img) => img.url.trim())
        .map((img, i) => ({
          url: img.url.trim(),
          publicId: img.publicId || undefined,
          alt: img.alt?.trim() || name.trim(),
          sortOrder: i,
        }));

      const mergedAttrsMap = syncLegacyAttributesMap(attributeValues, legacyAttributes);

      const payload = {
        name: name.trim(),
        nameBn: nameBn.trim(),
        slug: (slug.trim() || slugify(name)).toLowerCase(),
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim(),
        categoryId,
        subCategoryId: subCategoryId || null,
        brandId: brandId || null,
        attributeGroup,
        attributes: mergedAttrsMap,
        attributeValues: attributeValues.filter((e) => !isEmptyAttributeValue(e.value)),
        specifications: specifications
          .filter((s) => s.label.trim() && s.value.trim())
          .map((s, idx) => ({ ...s, sortOrder: idx })),
        highlights: highlights
          .filter((h) => h.title.trim())
          .map((h, idx) => ({ ...h, sortOrder: idx })),
        features: features.map((f) => f.trim()).filter(Boolean),
        videos: videos.filter((v) => v.url.trim()),
        contentSections: contentSections.map((sec, idx) => ({ ...sec, sortOrder: idx })),
        faqs: faqs.filter((f) => f.question.trim() && f.answer.trim()),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        basePrice: Number(basePrice || 0),
        costPrice: costPrice ? Number(costPrice) : null,
        salePrice: salePrice ? Number(salePrice) : null,
        flashSalePrice: flashSalePrice ? Number(flashSalePrice) : null,
        flashSaleStartsAt: flashSaleStartsAt ? new Date(flashSaleStartsAt).toISOString() : null,
        flashSaleEndsAt: flashSaleEndsAt ? new Date(flashSaleEndsAt).toISOString() : null,
        stockOnHand: Number(stockOnHand || 0),
        lowStockThreshold: Number(lowStockThreshold || 5),
        manageInventory,
        allowBackorder,
        weight: weight ? Number(weight) : null,
        dimensions: {
          length: dimLength ? Number(dimLength) : null,
          width: dimWidth ? Number(dimWidth) : null,
          height: dimHeight ? Number(dimHeight) : null,
        },
        tags: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
        warrantyInfo: warrantyInfo.trim(),
        returnPolicyNote: returnPolicyNote.trim(),
        seoTitle: seoTitle.trim(),
        seoDescription: seoDescription.trim(),
        seoKeywords: seoKeywordsText.split(',').map((s) => s.trim()).filter(Boolean),
        status,
        isFeatured,
        isNewArrival,
        isBestSeller,
        isPremiumCollection,
        bilingualKeywords: bilingualKeywordsText.split(',').map((s) => s.trim()).filter(Boolean),
        images: gallery,
        hasVariants: hasVariants && variants.length > 0,
        variantOptions: hasVariants
          ? variantDimensions.filter((d) => d.values.length > 0)
          : [],
        variants: hasVariants
          ? variants.map((v) => ({
              ...(v._id ? { _id: v._id } : {}),
              sku: v.sku.trim().toUpperCase(),
              barcode: v.barcode?.trim() || '',
              title: v.title.trim(),
              options: v.options && Object.keys(v.options).length > 0 ? v.options : { Variant: v.title.trim() },
              price: v.price ? Number(v.price) : null,
              salePrice: v.salePrice ? Number(v.salePrice) : null,
              stockOnHand: Number(v.stockOnHand || 0),
              lowStockThreshold: Number(v.lowStockThreshold || 5),
              weight: v.weight ? Number(v.weight) : null,
              ...(v.imageUrl ? { imageUrl: v.imageUrl.trim() } : {}),
              isActive: v.isActive !== false,
            }))
          : [],
      };

      if (isEdit && id) {
        await apiRequest(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Product updated & synced with storefront.' }));
      } else {
        await apiRequest('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });
        dispatch(showToast({ variant: 'success', message: 'Product created & published to catalog.' }));
      }
      setDirty(false);
      navigate('/admin/products');
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Unable to save product.' }));
    } finally {
      setSaving(false);
    }
  };

  const renderDynamicInput = (def: ProductAttributeDefinition) => {
    const val = getAttrEntry(def.code, def.name);
    const errMsg = attributeValidationIssues[def.code];
    const opts = normalizeAttributeOptions(def.options || [], def.values || []);

    return (
      <div key={def.code} className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <label className="block text-xs font-semibold text-[#101B35] dark:text-slate-200">
            {def.name}
            {def.unit ? ` (${def.unit})` : ''}
            {def.isRequired ? <span className="ml-1 text-rose-500">*</span> : null}
          </label>
          {def.isFilterable && (
            <span className="text-[10px] font-semibold text-[#145CFF]">Filterable</span>
          )}
        </div>

        {def.inputType === 'long_text' ? (
          <textarea
            rows={2}
            value={String(val ?? '')}
            onChange={(e) => setAttrEntry(def, e.target.value)}
            className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-2.5 text-xs"
          />
        ) : def.inputType === 'boolean' ? (
          <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={val === true || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'yes'}
              onChange={(e) => setAttrEntry(def, e.target.checked)}
              className="h-4 w-4 rounded text-[#145CFF]"
            />
            {val === true || String(val).toLowerCase() === 'true' ? 'Yes' : 'No'}
          </label>
        ) : def.inputType === 'single_select' ? (
          <select
            value={String(val ?? '')}
            onChange={(e) => setAttrEntry(def, e.target.value)}
            className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
          >
            <option value="">Select {def.name}...</option>
            {opts.map((o) => (
              <option key={o.label} value={o.label}>
                {o.label}
              </option>
            ))}
          </select>
        ) : def.inputType === 'multi_select' ? (
          <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-2">
            {opts.map((o) => {
              const selectedArr = Array.isArray(val) ? val.map(String) : String(val || '').split(',').map((s) => s.trim()).filter(Boolean);
              const checked = selectedArr.includes(o.label);
              return (
                <label
                  key={o.label}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                    checked
                      ? 'border-[#145CFF] bg-[#EAF1FF] text-[#145CFF]'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? selectedArr.filter((x) => x !== o.label)
                        : [...selectedArr, o.label];
                      setAttrEntry(def, next);
                    }}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              );
            })}
          </div>
        ) : def.inputType === 'color' ? (
          <div className="flex flex-wrap items-center gap-2">
            {opts.length > 0 ? (
              opts.map((o) => {
                const selected = String(val).toLowerCase() === o.label.toLowerCase();
                return (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() =>
                      setAttrEntry(
                        def,
                        selected ? '' : o.label,
                        selected ? '' : o.colorHex || inferColorHex(o.label) || '',
                      )
                    }
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold ${
                      selected ? 'border-[#145CFF] bg-[#EAF1FF] text-[#145CFF]' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: o.colorHex || inferColorHex(o.label) }}
                    />
                    {o.label}
                  </button>
                );
              })
            ) : (
              <input
                value={String(val ?? '')}
                onChange={(e) => setAttrEntry(def, e.target.value, inferColorHex(e.target.value) || '')}
                placeholder="Color name or #hex"
                className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
              />
            )}
          </div>
        ) : def.inputType === 'file' ? (
          <CloudinaryImageField
            label=""
            folder="novara/attributes"
            value={String(val ?? '')}
            onChange={(url) => setAttrEntry(def, url)}
          />
        ) : (
          <div className="relative">
            <input
              type={
                def.inputType === 'number' || def.inputType === 'decimal' || def.inputType === 'measurement'
                  ? 'number'
                  : def.inputType === 'date'
                    ? 'date'
                    : def.inputType === 'url'
                      ? 'url'
                      : 'text'
              }
              step={def.inputType === 'decimal' || def.inputType === 'measurement' ? 'any' : undefined}
              value={String(val ?? '')}
              onChange={(e) => setAttrEntry(def, e.target.value)}
              placeholder={def.description || `Enter ${def.name.toLowerCase()}`}
              className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
            />
            {def.unit && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[#64748B]">
                {def.unit}
              </span>
            )}
          </div>
        )}

        {errMsg && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-rose-600">
            <AlertCircle className="h-3 w-3" /> {errMsg}
          </p>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="catalog.manage">
        <div className="space-y-5 max-w-[1280px] mx-auto pb-16">
          <AdminPageHeader
            title={isEdit ? 'Edit Product' : 'Add New Product'}
            subtitle="Configure core details, category-aware attributes, variant matrix, PDP highlights, custom sections, and SEO."
            breadcrumbs={[
              { label: 'Product Management' },
              { label: 'All Products', to: '/admin/products' },
              { label: isEdit ? 'Edit Product' : 'Add Product' },
            ]}
            actions={
              <button
                type="button"
                onClick={() => (dirty ? setLeaveConfirmOpen(true) : navigate('/admin/products'))}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Products
              </button>
            }
          />

          {/* Section Quick Jump Nav */}
          {!loading && (
            <div className="sticky top-[68px] z-20 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white/95 dark:bg-[#0B1730]/95 backdrop-blur-xs px-3 py-2 shadow-xs">
              {FORM_SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-[#64748B] hover:bg-[#EAF1FF] hover:text-[#145CFF] whitespace-nowrap shrink-0"
                >
                  {s.label}
                </a>
              ))}
              {dirty && (
                <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 whitespace-nowrap shrink-0">
                  Unsaved changes
                </span>
              )}
            </div>
          )}

          {error && <ErrorBanner message={error} />}
          {loading ? (
            <LoadingCards count={4} />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 1. Core Information */}
              <section id="sec-core" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <h2 className="font-display text-sm font-bold text-[#101B35] dark:text-white">1. Core Information & Categories</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Product Name (English) *</label>
                    <input
                      required
                      value={name}
                      onChange={(e) => {
                        markDirty();
                        setName(e.target.value);
                        if (!isEdit && !slugManuallyEdited) setSlug(slugify(e.target.value));
                      }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Product Name (Bangla / বাংলা)</label>
                    <input
                      value={nameBn}
                      onChange={(e) => { markDirty(); setNameBn(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">URL Slug *</label>
                    <input
                      required
                      value={slug}
                      onChange={(e) => { markDirty(); setSlugManuallyEdited(true); setSlug(slugify(e.target.value)); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">SKU *</label>
                    <input
                      required
                      value={sku}
                      onChange={(e) => { markDirty(); setSku(e.target.value.toUpperCase()); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Barcode / UPC / EAN</label>
                    <input
                      value={barcode}
                      onChange={(e) => { markDirty(); setBarcode(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Publish Status</label>
                    <select
                      value={status}
                      onChange={(e) => { markDirty(); setStatus(e.target.value as 'draft' | 'published' | 'archived'); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="published">Published (Live)</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Primary Category *</label>
                    <select
                      required
                      value={categoryId}
                      onChange={(e) => { markDirty(); setCategoryId(e.target.value); setSubCategoryId(''); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="">Select Category</option>
                      {topCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Subcategory</label>
                    <select
                      value={subCategoryId}
                      onChange={(e) => { markDirty(); setSubCategoryId(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="">None</option>
                      {subCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Brand</label>
                    <select
                      value={brandId}
                      onChange={(e) => { markDirty(); setBrandId(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="">Generic / Unbranded</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Short Summary / Subtitle</label>
                  <input
                    value={shortDescription}
                    onChange={(e) => { markDirty(); setShortDescription(e.target.value); }}
                    placeholder="Concise line displayed beneath the title (e.g. Powerful. Portable. Perfect.)"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Full Description *</label>
                  <textarea
                    required
                    minLength={10}
                    rows={4}
                    value={description}
                    onChange={(e) => { markDirty(); setDescription(e.target.value); }}
                    className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                  />
                </div>
              </section>

              {/* 2. Media Gallery & Videos */}
              <section id="sec-media" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold">2. Product Gallery & Videos</h2>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { markDirty(); setImages((prev) => [...prev, { url: '', alt: '' }]); }}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Image
                    </button>
                    <button
                      type="button"
                      onClick={() => { markDirty(); setVideos((prev) => [...prev, { url: '', title: '' }]); }}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                    >
                      <Video className="h-3.5 w-3.5" /> Add Video
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_200px_auto] items-end rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-3">
                      <CloudinaryImageField
                        label={idx === 0 ? 'Primary Image' : `Gallery Image #${idx + 1}`}
                        folder="novara/products"
                        value={img.url}
                        onChange={(url, pubId) => {
                          markDirty();
                          setImages((prev) => prev.map((item, i) => (i === idx ? { ...item, url, publicId: pubId } : item)));
                        }}
                      />
                      <div>
                        <label className="mb-1 block text-xs font-semibold">Alt Text</label>
                        <input
                          value={img.alt || ''}
                          onChange={(e) => {
                            markDirty();
                            setImages((prev) => prev.map((item, i) => (i === idx ? { ...item, alt: e.target.value } : item)));
                          }}
                          className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(idx, -1)}
                          disabled={idx === 0}
                          aria-label="Move image up"
                          className="h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-2.5 text-slate-600 disabled:opacity-40"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(idx, 1)}
                          disabled={idx === images.length - 1}
                          aria-label="Move image down"
                          className="h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-2.5 text-slate-600 disabled:opacity-40"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                        {images.length > 1 && (
                          <button
                            type="button"
                            onClick={() => { markDirty(); setImages((prev) => prev.filter((_, i) => i !== idx)); }}
                            aria-label="Remove image"
                            className="h-10 rounded-xl border border-rose-200 px-2.5 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {videos.length > 0 && (
                  <div className="space-y-2 border-t border-[#E4EAF5] dark:border-slate-800 pt-3">
                    <div className="text-xs font-bold">Product Videos (Optional)</div>
                    {videos.map((vid, idx) => (
                      <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-center">
                        <input
                          value={vid.url}
                          onChange={(e) => {
                            markDirty();
                            setVideos((prev) => prev.map((v, i) => (i === idx ? { ...v, url: e.target.value } : v)));
                          }}
                          placeholder="Video URL (YouTube, Vimeo, or MP4)"
                          className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                        <input
                          value={vid.title || ''}
                          onChange={(e) => {
                            markDirty();
                            setVideos((prev) => prev.map((v, i) => (i === idx ? { ...v, title: e.target.value } : v)));
                          }}
                          placeholder="Video Title"
                          className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => { markDirty(); setVideos((prev) => prev.filter((_, i) => i !== idx)); }}
                          className="h-9 rounded-xl border border-rose-200 px-3 text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 3. Pricing */}
              <section id="sec-pricing" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <h2 className="font-display text-sm font-bold">3. Pricing & Flash Sale</h2>
                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Base Price (৳) *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={basePrice}
                      onChange={(e) => { markDirty(); setBasePrice(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Sale Price (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={salePrice}
                      onChange={(e) => { markDirty(); setSalePrice(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Cost Price (৳)</label>
                    <input
                      type="number"
                      min={0}
                      value={costPrice}
                      onChange={(e) => { markDirty(); setCostPrice(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Flash Sale Price</label>
                    <input
                      type="number"
                      min={0}
                      value={flashSalePrice}
                      onChange={(e) => { markDirty(); setFlashSalePrice(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Flash Starts</label>
                    <input
                      type="datetime-local"
                      value={flashSaleStartsAt}
                      onChange={(e) => { markDirty(); setFlashSaleStartsAt(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Flash Ends</label>
                    <input
                      type="datetime-local"
                      value={flashSaleEndsAt}
                      onChange={(e) => { markDirty(); setFlashSaleEndsAt(e.target.value); }}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                    />
                  </div>
                </div>
              </section>

              {/* 4. Inventory, Shipping & Policy */}
              <section id="sec-inventory" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-sm font-bold">4. Inventory, Shipping & Warranty</h2>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manageInventory}
                        onChange={(e) => { markDirty(); setManageInventory(e.target.checked); }}
                        className="h-4 w-4 rounded text-[#145CFF]"
                      />
                      Track Inventory
                    </label>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowBackorder}
                        onChange={(e) => { markDirty(); setAllowBackorder(e.target.checked); }}
                        className="h-4 w-4 rounded text-[#145CFF]"
                      />
                      Allow Backorders
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Stock On Hand *</label>
                    <input
                      type="number"
                      min={0}
                      required
                      value={stockOnHand}
                      onChange={(e) => { markDirty(); setStockOnHand(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Low Stock Alert</label>
                    <input
                      type="number"
                      min={0}
                      value={lowStockThreshold}
                      onChange={(e) => { markDirty(); setLowStockThreshold(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Weight (g)</label>
                    <input
                      type="number"
                      min={0}
                      value={weight}
                      onChange={(e) => { markDirty(); setWeight(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Length (cm)</label>
                    <input
                      type="number"
                      min={0}
                      value={dimLength}
                      onChange={(e) => { markDirty(); setDimLength(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Width (cm)</label>
                    <input
                      type="number"
                      min={0}
                      value={dimWidth}
                      onChange={(e) => { markDirty(); setDimWidth(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Height (cm)</label>
                    <input
                      type="number"
                      min={0}
                      value={dimHeight}
                      onChange={(e) => { markDirty(); setDimHeight(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Warranty Info</label>
                    <input
                      value={warrantyInfo}
                      onChange={(e) => { markDirty(); setWarrantyInfo(e.target.value); }}
                      placeholder="e.g. 1 Year Official Service Warranty"
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Return Policy Note</label>
                    <input
                      value={returnPolicyNote}
                      onChange={(e) => { markDirty(); setReturnPolicyNote(e.target.value); }}
                      placeholder="e.g. 7 Days Easy Replacement Guarantee"
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>
              </section>

              {/* 5. Dynamic Category Attributes */}
              <section id="sec-attributes" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-bold">5. Dynamic Category & Product Attributes</h2>
                    <p className="text-xs text-[#64748B]">
                      Automatically loads global and category-assigned fields. All optional attributes may be left blank.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setInAttrGroupId(attributeGroups[0]?.id || '');
                        setInlineAttrOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#EAF1FF] dark:bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                    >
                      <Plus className="h-3.5 w-3.5" /> Create Reusable Attribute
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomAttrModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Product-Only Field
                    </button>
                  </div>
                </div>

                {loadingAttrs ? (
                  <p className="text-xs text-[#64748B]">Loading attributes for selected category...</p>
                ) : groupedCategoryAttributes.length === 0 ? (
                  <p className="text-xs text-[#64748B]">
                    No category attributes defined yet. Use "Create Reusable Attribute" or add a product-only field above.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {groupedCategoryAttributes.map(([grpName, defs]) => (
                      <div key={grpName} className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-4 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wide text-[#145CFF]">{grpName}</div>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {defs.map((def) => renderDynamicInput(def))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {customOnlyAttributes.length > 0 && (
                  <div className="rounded-xl border border-dashed border-[#E4EAF5] dark:border-slate-700 p-4 space-y-3">
                    <div className="text-xs font-bold text-[#64748B]">Product-Specific Custom Fields</div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {customOnlyAttributes.map((entry) => (
                        <div key={entry.code} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold">
                              {entry.label || entry.name} {entry.unit ? `(${entry.unit})` : ''}
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                markDirty();
                                setAttributeValues((prev) => prev.filter((x) => x.code !== entry.code));
                              }}
                              className="text-rose-600 hover:underline text-[11px]"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            value={String(entry.value ?? '')}
                            onChange={(e) =>
                              setAttrEntry(
                                {
                                  code: entry.code,
                                  name: entry.label || entry.name,
                                  inputType: (entry.inputType as AttributeInputType) || 'short_text',
                                  unit: entry.unit,
                                  groupName: entry.groupName,
                                  isCustom: true,
                                },
                                e.target.value,
                              )
                            }
                            className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* 6. Specifications Table Builder */}
              <section id="sec-specs" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-display text-sm font-bold">6. Technical Specification Rows</h2>
                    <p className="text-xs text-[#64748B]">Add categorized key-value specification rows displayed in the Specifications tab.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      markDirty();
                      setSpecifications((prev) => [...prev, { label: '', value: '', unit: '', groupName: 'Specifications' }]);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Spec Row
                  </button>
                </div>

                {specifications.map((row, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[160px_1fr_1fr_90px_auto] items-center">
                    <input
                      value={row.groupName || ''}
                      onChange={(e) => {
                        markDirty();
                        setSpecifications((prev) => prev.map((r, i) => (i === idx ? { ...r, groupName: e.target.value } : r)));
                      }}
                      placeholder="Group (e.g. Display)"
                      className="h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                    />
                    <input
                      value={row.label}
                      onChange={(e) => {
                        markDirty();
                        setSpecifications((prev) => prev.map((r, i) => (i === idx ? { ...r, label: e.target.value } : r)));
                      }}
                      placeholder="Label (e.g. Resolution)"
                      className="h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                    />
                    <input
                      value={row.value}
                      onChange={(e) => {
                        markDirty();
                        setSpecifications((prev) => prev.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r)));
                      }}
                      placeholder="Value (e.g. 2560 x 1664)"
                      className="h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                    />
                    <input
                      value={row.unit || ''}
                      onChange={(e) => {
                        markDirty();
                        setSpecifications((prev) => prev.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)));
                      }}
                      placeholder="Unit"
                      className="h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => { markDirty(); setSpecifications((prev) => prev.filter((_, i) => i !== idx)); }}
                      className="h-9 rounded-lg border border-rose-200 px-2.5 text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </section>

              {/* 7. Variant Engine */}
              <section id="sec-variants" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-sm font-bold">7. Multi-Dimension Variant Engine</h2>
                    <p className="text-xs text-[#64748B]">Define option dimensions (Storage, Color, Size), generate combinations, and set per-variant SKU/price/stock/image.</p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasVariants}
                      onChange={(e) => { markDirty(); setHasVariants(e.target.checked); }}
                      className="h-4 w-4 rounded text-[#145CFF]"
                    />
                    Enable Variants
                  </label>
                </div>

                {hasVariants && (
                  <div className="space-y-4">
                    {/* Dimension Builder */}
                    <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-4 space-y-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          value={newDimName}
                          onChange={(e) => setNewDimName(e.target.value)}
                          placeholder="Add option dimension (e.g. Storage Capacity, Color, Size)"
                          className="flex-1 min-w-[220px] h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                        />
                        <button
                          type="button"
                          onClick={addDimension}
                          className="h-9 rounded-lg border border-[#145CFF] px-3 text-xs font-semibold text-[#145CFF] hover:bg-[#EAF1FF]"
                        >
                          + Add Dimension
                        </button>
                        <button
                          type="button"
                          onClick={handleGenerateVariantMatrix}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#145CFF] px-3.5 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                        >
                          <Wand2 className="h-3.5 w-3.5" /> Generate Variant Matrix
                        </button>
                      </div>

                      {variantDimensions.map((dim, dimIdx) => {
                        const isColorDim = dim.name.toLowerCase().includes('color') || dim.name.toLowerCase().includes('colour');
                        return (
                          <div key={`${dim.name}-${dimIdx}`} className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold">{dim.name}</span>
                              <button
                                type="button"
                                onClick={() => { markDirty(); setVariantDimensions((prev) => prev.filter((_, i) => i !== dimIdx)); }}
                                className="text-xs text-rose-600 hover:underline"
                              >
                                Remove Dimension
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {dim.values.map((val: string) => (
                                <span
                                  key={val}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-800 px-2 py-1 text-xs font-semibold"
                                >
                                  {isColorDim && (
                                    <input
                                      type="color"
                                      aria-label={`Hex color for ${val}`}
                                      value={dim.colors?.[val] || inferColorHex(val) || '#64748B'}
                                      onChange={(e) => {
                                        markDirty();
                                        const hex = e.target.value;
                                        setVariantDimensions((prev) =>
                                          prev.map((d, i) =>
                                            i === dimIdx ? { ...d, colors: { ...(d.colors || {}), [val]: hex } } : d,
                                          ),
                                        );
                                      }}
                                      className="h-4 w-5 cursor-pointer rounded border-0 p-0"
                                    />
                                  )}
                                  {val}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      markDirty();
                                      setVariantDimensions((prev) =>
                                        prev.map((d, i) =>
                                          i === dimIdx ? { ...d, values: d.values.filter((v: string) => v !== val) } : d,
                                        ),
                                      );
                                    }}
                                    className="text-slate-400 hover:text-rose-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <input
                                value={dimValueInputs[dimIdx] || ''}
                                onChange={(e) => setDimValueInputs((prev) => ({ ...prev, [dimIdx]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addDimensionValue(dimIdx);
                                  }
                                }}
                                placeholder={`Add ${dim.name} value (e.g. ${isColorDim ? 'Midnight' : '512GB'})`}
                                className="flex-1 h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => addDimensionValue(dimIdx)}
                                className="h-8 rounded-lg border border-[#E4EAF5] px-3 text-xs font-semibold text-[#145CFF]"
                              >
                                Add Value
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Variant Matrix Table */}
                    <div className="space-y-2.5">
                      {variants.map((v, idx) => (
                        <div key={idx} className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F8FAFF] dark:bg-slate-900/50 p-3 space-y-2">
                          <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8 items-end">
                            <div className="lg:col-span-2">
                              <label className="mb-1 block text-[11px] font-semibold">SKU *</label>
                              <input
                                required
                                value={v.sku}
                                onChange={(e) => {
                                  markDirty();
                                  setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, sku: e.target.value } : r)));
                                }}
                                className="w-full h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                              />
                            </div>
                            <div className="lg:col-span-2">
                              <label className="mb-1 block text-[11px] font-semibold">Title *</label>
                              <input
                                required
                                value={v.title}
                                onChange={(e) => {
                                  markDirty();
                                  setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, title: e.target.value } : r)));
                                }}
                                className="w-full h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold">Price (৳)</label>
                              <input
                                type="number"
                                value={v.price}
                                onChange={(e) => {
                                  markDirty();
                                  setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, price: e.target.value } : r)));
                                }}
                                className="w-full h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold">Sale (৳)</label>
                              <input
                                type="number"
                                value={v.salePrice}
                                onChange={(e) => {
                                  markDirty();
                                  setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, salePrice: e.target.value } : r)));
                                }}
                                className="w-full h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                              />
                            </div>
                            <div>
                              <label className="mb-1 block text-[11px] font-semibold">Stock *</label>
                              <input
                                type="number"
                                required
                                value={v.stockOnHand}
                                onChange={(e) => {
                                  markDirty();
                                  setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, stockOnHand: e.target.value } : r)));
                                }}
                                className="w-full h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  markDirty();
                                  setVariants((prev) => prev.filter((_, i) => i !== idx));
                                }}
                                className="h-9 rounded-lg border border-rose-200 px-2.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-4 items-center text-xs">
                            <input
                              value={v.barcode || ''}
                              onChange={(e) => {
                                markDirty();
                                setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, barcode: e.target.value } : r)));
                              }}
                              placeholder="Barcode (optional)"
                              className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                            />
                            <input
                              type="number"
                              value={v.weight}
                              onChange={(e) => {
                                markDirty();
                                setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, weight: e.target.value } : r)));
                              }}
                              placeholder="Weight (g)"
                              className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                            />
                            <input
                              value={v.imageUrl || ''}
                              onChange={(e) => {
                                markDirty();
                                setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, imageUrl: e.target.value } : r)));
                              }}
                              placeholder="Variant Image URL (optional)"
                              className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                            />
                            <label className="inline-flex items-center gap-2 font-semibold cursor-pointer">
                              <input
                                type="checkbox"
                                checked={v.isActive}
                                onChange={(e) => {
                                  markDirty();
                                  setVariants((prev) => prev.map((r, i) => (i === idx ? { ...r, isActive: e.target.checked } : r)));
                                }}
                                className="h-3.5 w-3.5 rounded text-[#145CFF]"
                              />
                              Active Variant
                            </label>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          markDirty();
                          setVariants((prev) => [
                            ...prev,
                            {
                              sku: `${sku || 'SKU'}-V${prev.length + 1}`,
                              barcode: '',
                              title: '',
                              options: {},
                              price: basePrice,
                              salePrice: '',
                              stockOnHand: '10',
                              lowStockThreshold: '5',
                              weight: '',
                              imageUrl: '',
                              isActive: true,
                            },
                          ]);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-[#145CFF]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Manual Variant Row
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* 8. Highlights & Feature Bullets */}
              <section id="sec-highlights" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-sm font-bold flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-[#145CFF]" /> 8. Product Highlight Tiles & Checkmark Features
                    </h2>
                    <p className="text-xs text-[#64748B]">Up to 4 summary cards shown above variants on Product Details Page (e.g., M4 Chip · 18 Hours · Liquid Retina).</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      markDirty();
                      setHighlights((prev) => [...prev, { icon: 'Cpu', title: '', subtitle: '', sortOrder: prev.length }]);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Highlight Tile
                  </button>
                </div>

                {highlights.length > 0 && (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {highlights.map((h, idx) => (
                      <div key={idx} className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FE]/60 dark:bg-slate-900/60 p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <select
                            value={h.icon}
                            onChange={(e) => {
                              markDirty();
                              setHighlights((prev) => prev.map((row, i) => (i === idx ? { ...row, icon: e.target.value } : row)));
                            }}
                            className="h-8 flex-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-xs"
                          >
                            {HIGHLIGHT_ICON_OPTIONS.map((ic) => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => { markDirty(); setHighlights((prev) => prev.filter((_, i) => i !== idx)); }}
                            className="text-rose-600 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <input
                          value={h.title}
                          onChange={(e) => {
                            markDirty();
                            setHighlights((prev) => prev.map((row, i) => (i === idx ? { ...row, title: e.target.value } : row)));
                          }}
                          placeholder="Line 1 (e.g. M4 Chip)"
                          className="w-full h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-semibold"
                        />
                        <input
                          value={h.subtitle || ''}
                          onChange={(e) => {
                            markDirty();
                            setHighlights((prev) => prev.map((row, i) => (i === idx ? { ...row, subtitle: e.target.value } : row)));
                          }}
                          placeholder="Line 2 (e.g. 10-Core CPU)"
                          className="w-full h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-[#E4EAF5] dark:border-slate-800 pt-3 space-y-2">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-[#145CFF]" /> Description Feature Bullets
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newFeatureInput}
                      onChange={(e) => setNewFeatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newFeatureInput.trim()) {
                            markDirty();
                            setFeatures((prev) => [...prev, newFeatureInput.trim()]);
                            setNewFeatureInput('');
                          }
                        }
                      }}
                      placeholder="Add bullet point (e.g. Apple M4 Chip — Superfast performance)"
                      className="flex-1 h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newFeatureInput.trim()) {
                          markDirty();
                          setFeatures((prev) => [...prev, newFeatureInput.trim()]);
                          setNewFeatureInput('');
                        }
                      }}
                      className="h-9 rounded-xl border border-[#E4EAF5] px-3 text-xs font-semibold text-[#145CFF]"
                    >
                      Add Bullet
                    </button>
                  </div>
                  {features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        value={feat}
                        onChange={(e) => {
                          markDirty();
                          setFeatures((prev) => prev.map((f, i) => (i === idx ? e.target.value : f)));
                        }}
                        className="flex-1 h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => { markDirty(); setFeatures((prev) => prev.filter((_, i) => i !== idx)); }}
                        className="h-8 rounded-lg border border-rose-200 px-2.5 text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* 9. Dynamic Custom Content Sections */}
              <section id="sec-custom" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-sm font-bold flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-[#145CFF]" /> 9. Dynamic Custom Content Sections
                    </h2>
                    <p className="text-xs text-[#64748B]">Add, reorder, toggle visibility, or remove extra product blocks (e.g. Box Contents, Care Guide, Size Chart).</p>
                  </div>
                  <button
                    type="button"
                    onClick={addContentSection}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Custom Section
                  </button>
                </div>

                {contentSections.map((sec, idx) => (
                  <div key={sec.sectionId || idx} className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/50 p-4 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={sec.title}
                        onChange={(e) => {
                          markDirty();
                          setContentSections((prev) => prev.map((s, i) => (i === idx ? { ...s, title: e.target.value } : s)));
                        }}
                        placeholder="Section Heading"
                        className="flex-1 min-w-[180px] h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold"
                      />
                      <select
                        value={sec.sectionType}
                        onChange={(e) => {
                          markDirty();
                          setContentSections((prev) =>
                            prev.map((s, i) =>
                              i === idx ? { ...s, sectionType: e.target.value as ProductContentSectionItem['sectionType'] } : s,
                            ),
                          );
                        }}
                        className="h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs"
                      >
                        <option value="prose">Rich Text / Prose</option>
                        <option value="key_value">Key-Value Specs</option>
                        <option value="bullet_list">Bullet Checklist</option>
                        <option value="media_banner">Image + Text Showcase</option>
                      </select>
                      <label className="inline-flex items-center gap-1.5 text-xs font-semibold">
                        <input
                          type="checkbox"
                          checked={sec.isEnabled && sec.showToCustomer}
                          onChange={(e) => {
                            markDirty();
                            const next = e.target.checked;
                            setContentSections((prev) =>
                              prev.map((s, i) => (i === idx ? { ...s, isEnabled: next, showToCustomer: next } : s)),
                            );
                          }}
                          className="h-4 w-4 rounded text-[#145CFF]"
                        />
                        Visible
                      </label>
                      <button
                        type="button"
                        onClick={() => moveContentSection(idx, -1)}
                        disabled={idx === 0}
                        className="h-9 rounded-lg border border-[#E4EAF5] px-2 disabled:opacity-40"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveContentSection(idx, 1)}
                        disabled={idx === contentSections.length - 1}
                        className="h-9 rounded-lg border border-[#E4EAF5] px-2 disabled:opacity-40"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => { markDirty(); setContentSections((prev) => prev.filter((_, i) => i !== idx)); }}
                        className="h-9 rounded-lg border border-rose-200 px-2.5 text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {sec.sectionType === 'media_banner' && (
                      <input
                        value={sec.mediaUrl || ''}
                        onChange={(e) => {
                          markDirty();
                          setContentSections((prev) => prev.map((s, i) => (i === idx ? { ...s, mediaUrl: e.target.value } : s)));
                        }}
                        placeholder="Banner image URL"
                        className="w-full h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs"
                      />
                    )}

                    {(sec.sectionType === 'prose' || sec.sectionType === 'media_banner' || sec.sectionType === 'bullet_list') && (
                      <textarea
                        rows={3}
                        value={sec.body || ''}
                        onChange={(e) => {
                          markDirty();
                          setContentSections((prev) => prev.map((s, i) => (i === idx ? { ...s, body: e.target.value } : s)));
                        }}
                        placeholder={sec.sectionType === 'bullet_list' ? 'One item per line...' : 'Section content...'}
                        className="w-full rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-slate-900 p-2.5 text-xs"
                      />
                    )}

                    {sec.sectionType === 'key_value' && (
                      <div className="space-y-2">
                        {(sec.fields || []).map((fld, fIdx) => (
                          <div key={fIdx} className="grid gap-2 sm:grid-cols-[1fr_1fr_90px_auto]">
                            <input
                              value={fld.label}
                              onChange={(e) => {
                                markDirty();
                                setContentSections((prev) =>
                                  prev.map((s, i) =>
                                    i === idx
                                      ? { ...s, fields: (s.fields || []).map((f, fi) => (fi === fIdx ? { ...f, label: e.target.value } : f)) }
                                      : s,
                                  ),
                                );
                              }}
                              placeholder="Field label"
                              className="h-8 rounded-lg border border-[#E4EAF5] bg-white dark:bg-slate-900 px-2.5 text-xs"
                            />
                            <input
                              value={fld.value}
                              onChange={(e) => {
                                markDirty();
                                setContentSections((prev) =>
                                  prev.map((s, i) =>
                                    i === idx
                                      ? { ...s, fields: (s.fields || []).map((f, fi) => (fi === fIdx ? { ...f, value: e.target.value } : f)) }
                                      : s,
                                  ),
                                );
                              }}
                              placeholder="Field value"
                              className="h-8 rounded-lg border border-[#E4EAF5] bg-white dark:bg-slate-900 px-2.5 text-xs"
                            />
                            <input
                              value={fld.unit || ''}
                              onChange={(e) => {
                                markDirty();
                                setContentSections((prev) =>
                                  prev.map((s, i) =>
                                    i === idx
                                      ? { ...s, fields: (s.fields || []).map((f, fi) => (fi === fIdx ? { ...f, unit: e.target.value } : f)) }
                                      : s,
                                  ),
                                );
                              }}
                              placeholder="Unit"
                              className="h-8 rounded-lg border border-[#E4EAF5] bg-white dark:bg-slate-900 px-2.5 text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                markDirty();
                                setContentSections((prev) =>
                                  prev.map((s, i) =>
                                    i === idx ? { ...s, fields: (s.fields || []).filter((_, fi) => fi !== fIdx) } : s,
                                  ),
                                );
                              }}
                              className="h-8 rounded-lg border border-rose-200 px-2 text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            markDirty();
                            setContentSections((prev) =>
                              prev.map((s, i) =>
                                i === idx
                                  ? { ...s, fields: [...(s.fields || []), { key: `f_${Date.now()}`, label: '', value: '', unit: '' }] }
                                  : s,
                              ),
                            );
                          }}
                          className="text-xs font-semibold text-[#145CFF] hover:underline"
                        >
                          + Add Field Row
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </section>

              {/* 10. FAQs & Customer Q&A */}
              <section id="sec-faqs" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-sm font-bold flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4 text-[#145CFF]" /> 10. Product FAQs & Customer Q&A
                  </h2>
                  <button
                    type="button"
                    onClick={() => { markDirty(); setFaqs((prev) => [...prev, { question: '', answer: '' }]); }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#E4EAF5] dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-[#145CFF]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add FAQ
                  </button>
                </div>

                {faqs.map((faq, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] items-start">
                    <input
                      value={faq.question}
                      onChange={(e) => {
                        markDirty();
                        setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, question: e.target.value } : f)));
                      }}
                      placeholder="Question"
                      className="h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                    <input
                      value={faq.answer}
                      onChange={(e) => {
                        markDirty();
                        setFaqs((prev) => prev.map((f, i) => (i === idx ? { ...f, answer: e.target.value } : f)));
                      }}
                      placeholder="Answer"
                      className="h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => { markDirty(); setFaqs((prev) => prev.filter((_, i) => i !== idx)); }}
                      className="h-9 rounded-lg border border-rose-200 px-2.5 text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {isEdit && questions.length > 0 && (
                  <div className="border-t border-[#E4EAF5] dark:border-slate-800 pt-3 space-y-3">
                    <div className="text-xs font-bold">Customer Submitted Questions ({questions.length})</div>
                    {questions.map((q) => {
                      const qId = q.id || q._id || '';
                      const draft = questionDrafts[qId] || { answer: q.answer || '', isPublished: q.isPublished !== false };
                      return (
                        <div key={qId} className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 p-3 space-y-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">Q: {q.question}</span>
                            <span className="text-[11px] text-[#64748B]">Asked by {q.askedBy}</span>
                          </div>
                          <textarea
                            rows={2}
                            value={draft.answer}
                            onChange={(e) =>
                              setQuestionDrafts((prev) => ({
                                ...prev,
                                [qId]: { ...draft, answer: e.target.value },
                              }))
                            }
                            placeholder="Write official store answer..."
                            className="w-full rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-2 text-xs"
                          />
                          <div className="flex items-center justify-between gap-2">
                            <label className="inline-flex items-center gap-1.5 font-semibold">
                              <input
                                type="checkbox"
                                checked={draft.isPublished}
                                onChange={(e) =>
                                  setQuestionDrafts((prev) => ({
                                    ...prev,
                                    [qId]: { ...draft, isPublished: e.target.checked },
                                  }))
                                }
                                className="h-3.5 w-3.5 rounded text-[#145CFF]"
                              />
                              Visible to Customers
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveQuestionAnswer(qId)}
                                className="rounded-lg bg-[#145CFF] px-3 py-1 text-[11px] font-semibold text-white"
                              >
                                Save Answer
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteQuestion(qId)}
                                className="rounded-lg border border-rose-200 px-2.5 py-1 text-[11px] font-semibold text-rose-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* 11. Merchandising Badges & SEO */}
              <section id="sec-seo" className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4">
                <h2 className="font-display text-sm font-bold">11. Merchandising Badges, Keywords & SEO</h2>

                <div className="flex flex-wrap gap-5 text-xs font-semibold">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isFeatured} onChange={(e) => { markDirty(); setIsFeatured(e.target.checked); }} className="h-4 w-4 rounded text-[#145CFF]" />
                    Featured Product
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isNewArrival} onChange={(e) => { markDirty(); setIsNewArrival(e.target.checked); }} className="h-4 w-4 rounded text-[#145CFF]" />
                    New Arrival
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isBestSeller} onChange={(e) => { markDirty(); setIsBestSeller(e.target.checked); }} className="h-4 w-4 rounded text-[#145CFF]" />
                    Best Seller
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isPremiumCollection} onChange={(e) => { markDirty(); setIsPremiumCollection(e.target.checked); }} className="h-4 w-4 rounded text-[#145CFF]" />
                    Premium Collection
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Tags (comma separated)</label>
                    <input
                      value={tagsText}
                      onChange={(e) => { markDirty(); setTagsText(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">Bilingual Search Keywords (Bangla + Banglish)</label>
                    <input
                      value={bilingualKeywordsText}
                      onChange={(e) => { markDirty(); setBilingualKeywordsText(e.target.value); }}
                      placeholder="স্মার্টফোন, phone, mobile"
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">SEO Title</label>
                    <input
                      value={seoTitle}
                      onChange={(e) => { markDirty(); setSeoTitle(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">SEO Keywords (comma separated)</label>
                    <input
                      value={seoKeywordsText}
                      onChange={(e) => { markDirty(); setSeoKeywordsText(e.target.value); }}
                      className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">SEO Meta Description</label>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => { markDirty(); setSeoDescription(e.target.value); }}
                    className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                  />
                </div>
              </section>

              {/* Bottom Save Bar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => (dirty ? setLeaveConfirmOpen(true) : navigate('/admin/products'))}
                  className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-5 py-2.5 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          )}

          {/* Inline Create Reusable Attribute Modal */}
          <Modal
            open={inlineAttrOpen}
            onClose={() => setInlineAttrOpen(false)}
            title="Create Reusable Attribute"
            size="md"
          >
            <form onSubmit={handleCreateInlineAttr} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Attribute Name *</label>
                  <input
                    required
                    value={inAttrName}
                    onChange={(e) => {
                      setInAttrName(e.target.value);
                      setInAttrCode(slugifyAttributeCode(e.target.value));
                    }}
                    placeholder="e.g. Chipset"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Code *</label>
                  <input
                    required
                    value={inAttrCode}
                    onChange={(e) => setInAttrCode(slugifyAttributeCode(e.target.value))}
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Input Type</label>
                  <select
                    value={inAttrType}
                    onChange={(e) => setInAttrType(e.target.value as AttributeInputType)}
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2 text-xs"
                  >
                    {ATTRIBUTE_INPUT_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Scope</label>
                  <select
                    value={inAttrScope}
                    onChange={(e) => setInAttrScope(e.target.value as 'global' | 'category')}
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2 text-xs"
                  >
                    <option value="category">Current Category</option>
                    <option value="global">Global</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Unit</label>
                  <input
                    value={inAttrUnit}
                    onChange={(e) => setInAttrUnit(e.target.value)}
                    placeholder="GB, kg, mAh"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                  />
                </div>
              </div>

              {(inAttrType === 'single_select' || inAttrType === 'multi_select' || inAttrType === 'color') && (
                <div>
                  <label className="mb-1 block text-xs font-semibold">Options (comma separated)</label>
                  <input
                    value={inAttrOptionsText}
                    onChange={(e) => setInAttrOptionsText(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              )}

              <div className="flex gap-4 text-xs font-semibold">
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={inAttrFilterable} onChange={(e) => setInAttrFilterable(e.target.checked)} className="h-3.5 w-3.5 rounded text-[#145CFF]" />
                  Filterable in Shop
                </label>
                <label className="inline-flex items-center gap-1.5">
                  <input type="checkbox" checked={inAttrRequired} onChange={(e) => setInAttrRequired(e.target.checked)} className="h-3.5 w-3.5 rounded text-[#145CFF]" />
                  Required
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setInlineAttrOpen(false)} className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" disabled={savingInlineAttr} className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white">
                  {savingInlineAttr ? 'Creating...' : 'Create & Attach'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Add Product-Only Custom Field Modal */}
          <Modal
            open={customAttrModalOpen}
            onClose={() => setCustomAttrModalOpen(false)}
            title="Add Product-Specific Field"
            size="sm"
          >
            <form onSubmit={handleAddCustomProductAttr} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">Field Label *</label>
                <input
                  required
                  value={customAttrLabel}
                  onChange={(e) => setCustomAttrLabel(e.target.value)}
                  placeholder="e.g. Keyboard Layout"
                  className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Type</label>
                  <select
                    value={customAttrType}
                    onChange={(e) => setCustomAttrType(e.target.value as AttributeInputType)}
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2 text-xs"
                  >
                    <option value="short_text">Text</option>
                    <option value="number">Number</option>
                    <option value="boolean">Yes / No</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Unit</label>
                  <input
                    value={customAttrUnit}
                    onChange={(e) => setCustomAttrUnit(e.target.value)}
                    placeholder="Optional"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Spec Group Name</label>
                <input
                  value={customAttrGroup}
                  onChange={(e) => setCustomAttrGroup(e.target.value)}
                  className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCustomAttrModalOpen(false)} className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white">
                  Add Field
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={leaveConfirmOpen}
            onClose={() => setLeaveConfirmOpen(false)}
            onConfirm={() => {
              setDirty(false);
              setLeaveConfirmOpen(false);
              navigate('/admin/products');
            }}
            title="Discard Unsaved Changes?"
            message="You have unsaved product changes. Leaving this page will discard them."
            confirmLabel="Discard & Leave"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
