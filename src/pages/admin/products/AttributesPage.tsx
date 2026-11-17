import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Edit3, FolderTree, Layers, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  DataTable,
  EmptyStateCard,
  ErrorBanner,
  StatusBadge,
} from '../../../components/admin/ui';
import { ConfirmDialog, Modal } from '../../../components/ui/Modal';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type {
  AttributeGroupItem,
  AttributeInputType,
  AttributeOptionItem,
  AttributeScope,
  CategoryItem,
  ProductAttributePresetItem,
} from '../../../types/commerce';
import {
  ATTRIBUTE_INPUT_TYPE_OPTIONS,
  normalizeAttributeOptions,
  slugifyAttributeCode,
} from '../../../lib/productAttributes';
import { useSeoMeta } from '../../../lib/useSeoMeta';

interface AttributesPageProps {
  defaultTab?: 'attributes' | 'groups';
}

const CHOICE_TYPES = new Set<AttributeInputType>(['single_select', 'multi_select', 'color']);
const NUMERIC_TYPES = new Set<AttributeInputType>(['number', 'decimal', 'measurement']);

export function AttributesPage({ defaultTab = 'attributes' }: AttributesPageProps) {
  useSeoMeta({ title: 'Product Attributes & Groups | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [activeTab, setActiveTab] = useState<'attributes' | 'groups'>(defaultTab);
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const [attributes, setAttributes] = useState<ProductAttributePresetItem[]>([]);
  const [groups, setGroups] = useState<AttributeGroupItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');

  // Attribute Modal state
  const [attrModalOpen, setAttrModalOpen] = useState(false);
  const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
  const [attrName, setAttrName] = useState('');
  const [attrCode, setAttrCode] = useState('');
  const [attrDescription, setAttrDescription] = useState('');
  const [attrInputType, setAttrInputType] = useState<AttributeInputType>('single_select');
  const [attrUnit, setAttrUnit] = useState('');
  const [attrScope, setAttrScope] = useState<AttributeScope>('global');
  const [attrCategoryIds, setAttrCategoryIds] = useState<string[]>([]);
  const [attrGroupId, setAttrGroupId] = useState('');
  const [attrSortOrder, setAttrSortOrder] = useState('0');
  const [attrDefaultValue, setAttrDefaultValue] = useState('');
  const [attrOptions, setAttrOptions] = useState<AttributeOptionItem[]>([]);
  const [ruleMin, setRuleMin] = useState('');
  const [ruleMax, setRuleMax] = useState('');
  const [ruleMinLength, setRuleMinLength] = useState('');
  const [ruleMaxLength, setRuleMaxLength] = useState('');
  const [rulePattern, setRulePattern] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [isVisibleToCustomers, setIsVisibleToCustomers] = useState(true);
  const [showOnProductDetails, setShowOnProductDetails] = useState(true);
  const [isFilterable, setIsFilterable] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);
  const [isComparable, setIsComparable] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [savingAttr, setSavingAttr] = useState(false);

  // Quick option adder
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionHex, setNewOptionHex] = useState('#1155EE');

  // Group Modal state
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupSlug, setGroupSlug] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupSortOrder, setGroupSortOrder] = useState('0');
  const [groupActive, setGroupActive] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);

  // Delete confirmations
  const [deleteAttrTarget, setDeleteAttrTarget] = useState<ProductAttributePresetItem | null>(null);
  const [deleteGroupTarget, setDeleteGroupTarget] = useState<AttributeGroupItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [attrRes, grpRes, catRes] = await Promise.all([
        apiRequest<{ ok: true; attributes: ProductAttributePresetItem[] }>('/api/admin/attributes'),
        apiRequest<{ ok: true; groups: AttributeGroupItem[] }>('/api/admin/attribute-groups'),
        apiRequest<{ ok: true; categories: CategoryItem[] }>('/api/admin/categories'),
      ]);
      setAttributes(attrRes.attributes || []);
      setGroups(grpRes.groups || []);
      setCategories(catRes.categories || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load attribute settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryNameMap = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filteredAttributes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return attributes.filter((a) => {
      if (scopeFilter !== 'all' && (a.scope || 'global') !== scopeFilter) return false;
      if (groupFilter !== 'all' && (a.groupId || a.group) !== groupFilter) return false;
      if (!q) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        a.code.toLowerCase().includes(q) ||
        (a.groupName || a.group || '').toLowerCase().includes(q)
      );
    });
  }, [attributes, searchQuery, scopeFilter, groupFilter]);

  const openCreateAttr = () => {
    setEditingAttrId(null);
    setAttrName('');
    setAttrCode('');
    setAttrDescription('');
    setAttrInputType('single_select');
    setAttrUnit('');
    setAttrScope('global');
    setAttrCategoryIds([]);
    setAttrGroupId(groups[0]?.id || '');
    setAttrSortOrder(String(attributes.length));
    setAttrDefaultValue('');
    setAttrOptions([]);
    setRuleMin('');
    setRuleMax('');
    setRuleMinLength('');
    setRuleMaxLength('');
    setRulePattern('');
    setIsRequired(false);
    setIsVisibleToCustomers(true);
    setShowOnProductDetails(true);
    setIsFilterable(true);
    setIsSearchable(true);
    setIsComparable(false);
    setIsActive(true);
    setNewOptionLabel('');
    setAttrModalOpen(true);
  };

  const openEditAttr = (item: ProductAttributePresetItem) => {
    setEditingAttrId(item.id);
    setAttrName(item.name);
    setAttrCode(item.code);
    setAttrDescription(item.description || '');
    setAttrInputType(item.inputType || 'single_select');
    setAttrUnit(item.unit || '');
    setAttrScope(item.scope || 'global');
    setAttrCategoryIds(item.categoryIds || []);
    setAttrGroupId(item.groupId || '');
    setAttrSortOrder(String(item.sortOrder ?? 0));
    setAttrDefaultValue(item.defaultValue != null ? String(item.defaultValue) : '');
    setAttrOptions(normalizeAttributeOptions(item.options || [], item.values || []));
    setRuleMin(item.validationRules?.min != null ? String(item.validationRules.min) : '');
    setRuleMax(item.validationRules?.max != null ? String(item.validationRules.max) : '');
    setRuleMinLength(item.validationRules?.minLength != null ? String(item.validationRules.minLength) : '');
    setRuleMaxLength(item.validationRules?.maxLength != null ? String(item.validationRules.maxLength) : '');
    setRulePattern(item.validationRules?.pattern || '');
    setIsRequired(Boolean(item.isRequired));
    setIsVisibleToCustomers(item.isVisibleToCustomers !== false);
    setShowOnProductDetails(item.showOnProductDetails !== false);
    setIsFilterable(Boolean(item.isFilterable));
    setIsSearchable(item.isSearchable !== false);
    setIsComparable(Boolean(item.isComparable));
    setIsActive(item.isActive !== false);
    setNewOptionLabel('');
    setAttrModalOpen(true);
  };

  const addOptionRow = () => {
    const label = newOptionLabel.trim();
    if (!label) return;
    if (attrOptions.some((o) => o.label.toLowerCase() === label.toLowerCase())) {
      dispatch(showToast({ variant: 'warning', message: 'Option already added.' }));
      return;
    }
    setAttrOptions((prev) => [
      ...prev,
      {
        label,
        value: label,
        colorHex: attrInputType === 'color' ? newOptionHex : undefined,
        sortOrder: prev.length,
      },
    ]);
    setNewOptionLabel('');
  };

  const handleSaveAttr = async (e: FormEvent) => {
    e.preventDefault();
    if (attrScope === 'category' && attrCategoryIds.length === 0) {
      dispatch(showToast({ variant: 'warning', message: 'Select at least one category for category-scoped attributes.' }));
      return;
    }
    setSavingAttr(true);
    try {
      const selectedGrp = groups.find((g) => g.id === attrGroupId);
      const cleanedOptions = CHOICE_TYPES.has(attrInputType)
        ? attrOptions
            .filter((o) => o.label.trim())
            .map((o, idx) => ({
              label: o.label.trim(),
              value: (o.value || o.label).trim(),
              colorHex: o.colorHex || undefined,
              sortOrder: o.sortOrder ?? idx,
            }))
        : [];

      const payload = {
        name: attrName.trim(),
        code: slugifyAttributeCode(attrCode || attrName),
        description: attrDescription.trim(),
        group: selectedGrp?.slug || 'general',
        groupId: selectedGrp?.id || null,
        groupName: selectedGrp?.name || 'General',
        inputType: attrInputType,
        unit: attrUnit.trim(),
        scope: attrScope,
        categoryIds: attrScope === 'category' ? attrCategoryIds : [],
        options: cleanedOptions,
        values: cleanedOptions.map((o) => o.label),
        defaultValue: attrDefaultValue.trim() || null,
        validationRules: {
          min: ruleMin !== '' ? Number(ruleMin) : null,
          max: ruleMax !== '' ? Number(ruleMax) : null,
          minLength: ruleMinLength !== '' ? Number(ruleMinLength) : null,
          maxLength: ruleMaxLength !== '' ? Number(ruleMaxLength) : null,
          pattern: rulePattern.trim() || undefined,
        },
        sortOrder: Number(attrSortOrder || 0),
        isRequired,
        isVisibleToCustomers,
        showOnProductDetails,
        isFilterable,
        isSearchable,
        isComparable,
        isActive,
      };

      if (editingAttrId) {
        await apiRequest(`/api/admin/attributes/${editingAttrId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Attribute updated.' }));
      } else {
        await apiRequest('/api/admin/attributes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Attribute created.' }));
      }
      setAttrModalOpen(false);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Save failed.' }));
    } finally {
      setSavingAttr(false);
    }
  };

  const handleDeleteAttr = async () => {
    if (!deleteAttrTarget) return;
    try {
      await apiRequest(`/api/admin/attributes/${deleteAttrTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Attribute deleted.' }));
      setDeleteAttrTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  const openCreateGroup = () => {
    setEditingGroupId(null);
    setGroupName('');
    setGroupSlug('');
    setGroupDesc('');
    setGroupSortOrder(String(groups.length + 1));
    setGroupActive(true);
    setGroupModalOpen(true);
  };

  const openEditGroup = (grp: AttributeGroupItem) => {
    setEditingGroupId(grp.id);
    setGroupName(grp.name);
    setGroupSlug(grp.slug);
    setGroupDesc(grp.description || '');
    setGroupSortOrder(String(grp.sortOrder ?? 0));
    setGroupActive(grp.isActive !== false);
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: FormEvent) => {
    e.preventDefault();
    setSavingGroup(true);
    try {
      const payload = {
        name: groupName.trim(),
        slug: slugifyAttributeCode(groupSlug || groupName),
        description: groupDesc.trim(),
        sortOrder: Number(groupSortOrder || 0),
        isActive: groupActive,
      };
      if (editingGroupId) {
        await apiRequest(`/api/admin/attribute-groups/${editingGroupId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Attribute group updated.' }));
      } else {
        await apiRequest('/api/admin/attribute-groups', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        dispatch(showToast({ variant: 'success', message: 'Attribute group created.' }));
      }
      setGroupModalOpen(false);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Group save failed.' }));
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!deleteGroupTarget) return;
    try {
      await apiRequest(`/api/admin/attribute-groups/${deleteGroupTarget.id}`, { method: 'DELETE' });
      dispatch(showToast({ variant: 'success', message: 'Attribute group deleted.' }));
      setDeleteGroupTarget(null);
      load();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Delete failed.' }));
    }
  };

  const toggleCategoryId = (catId: string) => {
    setAttrCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="catalog.view">
        <div className="space-y-4 max-w-[1440px] mx-auto">
          <AdminPageHeader
            title="Attribute Engine & Groups"
            subtitle="Configure category-aware product attributes, input types, swatch options, specification groups, and Shop filter visibility."
            breadcrumbs={[{ label: 'Product Management' }, { label: 'Product Attributes' }]}
            actions={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateGroup}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50 whitespace-nowrap shrink-0"
                >
                  <Layers className="h-3.5 w-3.5 text-[#145CFF]" /> New Group
                </button>
                <button
                  type="button"
                  onClick={openCreateAttr}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#0E47D9] whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" /> Add Attribute
                </button>
              </div>
            }
          />

          {/* Tabs */}
          <div className="flex items-center gap-2 border-b border-[#E4EAF5] dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('attributes')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'attributes'
                  ? 'bg-[#145CFF] text-white'
                  : 'bg-white dark:bg-[#0B1730] text-[#64748B] hover:text-[#101B35] border border-[#E4EAF5] dark:border-slate-800'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Attributes ({attributes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('groups')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                activeTab === 'groups'
                  ? 'bg-[#145CFF] text-white'
                  : 'bg-white dark:bg-[#0B1730] text-[#64748B] hover:text-[#101B35] border border-[#E4EAF5] dark:border-slate-800'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              Attribute Groups ({groups.length})
            </button>
          </div>

          {error && <ErrorBanner message={error} onRetry={load} />}

          {activeTab === 'attributes' ? (
            <>
              {/* Filter toolbar */}
              <div className="grid gap-3 rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 sm:grid-cols-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search attribute name or code..."
                    className="h-9 w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 pl-8 pr-3 text-xs"
                  />
                </div>
                <select
                  aria-label="Filter by scope"
                  value={scopeFilter}
                  onChange={(e) => setScopeFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="all">All Scopes</option>
                  <option value="global">Global (All Products)</option>
                  <option value="category">Category Assigned</option>
                  <option value="product">Product Specific</option>
                </select>
                <select
                  aria-label="Filter by group"
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                >
                  <option value="all">All Attribute Groups</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <DataTable<ProductAttributePresetItem>
                rows={filteredAttributes}
                rowKey={(a) => a.id}
                loading={loading}
                emptyState={
                  <EmptyStateCard
                    icon={<SlidersHorizontal className="h-6 w-6" />}
                    title="No attributes matched"
                    description="Create reusable or category-specific product attributes with custom input types and filter options."
                    action={
                      <button
                        type="button"
                        onClick={openCreateAttr}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                      >
                        <Plus className="h-4 w-4" /> Add Attribute
                      </button>
                    }
                  />
                }
                columns={[
                  {
                    key: 'name',
                    header: 'Attribute',
                    render: (a) => (
                      <div>
                        <div className="flex items-center gap-1.5 font-semibold text-[#101B35] dark:text-white">
                          <span>{a.name}</span>
                          {a.isRequired && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                              Required
                            </span>
                          )}
                        </div>
                        <div className="font-mono-tabular text-[11px] text-[#64748B]">
                          {a.code}
                          {a.unit ? ` · Unit: ${a.unit}` : ''}
                        </div>
                      </div>
                    ),
                  },
                  {
                    key: 'type',
                    header: 'Input Type & Group',
                    render: (a) => (
                      <div className="space-y-1">
                        <StatusBadge
                          label={
                            ATTRIBUTE_INPUT_TYPE_OPTIONS.find((t) => t.value === a.inputType)?.label ||
                            a.inputType ||
                            'Single Select'
                          }
                          tone="indigo"
                        />
                        <div className="text-[11px] text-[#64748B]">{a.groupName || a.group}</div>
                      </div>
                    ),
                  },
                  {
                    key: 'scope',
                    header: 'Scope & Categories',
                    render: (a) => (
                      <div className="space-y-1">
                        <StatusBadge
                          label={a.scope === 'category' ? 'Category Scoped' : a.scope === 'product' ? 'Product Only' : 'Global'}
                          tone={a.scope === 'category' ? 'blue' : 'slate'}
                        />
                        {a.scope === 'category' && (a.categoryIds?.length || 0) > 0 && (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {a.categoryIds!.slice(0, 3).map((cid) => (
                              <span key={cid} className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px]">
                                {categoryNameMap.get(cid) || 'Category'}
                              </span>
                            ))}
                            {a.categoryIds!.length > 3 && (
                              <span className="text-[10px] text-[#64748B]">+{a.categoryIds!.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: 'values',
                    header: 'Options / Behavior',
                    render: (a) => {
                      const opts = normalizeAttributeOptions(a.options || [], a.values || []);
                      return (
                        <div className="space-y-1.5 max-w-xs">
                          {opts.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {opts.slice(0, 5).map((o) => (
                                <span
                                  key={o.label}
                                  className="inline-flex items-center gap-1 rounded-md bg-[#F4F7FF] dark:bg-slate-800 border border-[#E4EAF5] dark:border-slate-700 px-1.5 py-0.5 text-[11px]"
                                >
                                  {o.colorHex && (
                                    <span
                                      className="h-2.5 w-2.5 rounded-full border border-slate-300"
                                      style={{ backgroundColor: o.colorHex }}
                                    />
                                  )}
                                  {o.label}
                                </span>
                              ))}
                              {opts.length > 5 && <span className="text-[10px] text-[#64748B]">+{opts.length - 5}</span>}
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#64748B]">Freeform / typed input</span>
                          )}
                          <div className="flex flex-wrap gap-1 text-[10px] text-[#64748B]">
                            {a.isFilterable && <span className="rounded bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300 font-semibold">Filterable</span>}
                            {a.showOnProductDetails !== false && <span className="rounded bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 text-[#145CFF] font-semibold">PDP Specs</span>}
                            {typeof a.usageCount === 'number' && a.usageCount > 0 && (
                              <span className="font-mono-tabular">Used on {a.usageCount} products</span>
                            )}
                          </div>
                        </div>
                      );
                    },
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (a) => (
                      <StatusBadge label={a.isActive ? 'Active' : 'Inactive'} tone={a.isActive ? 'emerald' : 'slate'} />
                    ),
                  },
                  {
                    key: 'actions',
                    header: 'Actions',
                    align: 'right',
                    render: (a) => (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditAttr(a)}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-[#101B35] dark:text-slate-200 hover:bg-slate-50"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteAttrTarget(a)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    ),
                  },
                ]}
              />
            </>
          ) : (
            <DataTable<AttributeGroupItem>
              rows={groups}
              rowKey={(g) => g.id}
              loading={loading}
              emptyState={
                <EmptyStateCard
                  icon={<Layers className="h-6 w-6" />}
                  title="No attribute groups yet"
                  description="Organize technical specifications into structured sections on Product Details pages."
                  action={
                    <button
                      type="button"
                      onClick={openCreateGroup}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white"
                    >
                      <Plus className="h-4 w-4" /> Create Attribute Group
                    </button>
                  }
                />
              }
              columns={[
                {
                  key: 'name',
                  header: 'Group Name',
                  render: (g) => (
                    <div>
                      <div className="font-semibold text-[#101B35] dark:text-white">{g.name}</div>
                      <div className="font-mono-tabular text-[11px] text-[#64748B]">{g.slug}</div>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: (g) => <span className="text-xs text-[#64748B]">{g.description || '—'}</span>,
                },
                {
                  key: 'count',
                  header: 'Assigned Attributes',
                  render: (g) => (
                    <span className="font-mono-tabular text-xs font-semibold">{g.attributeCount ?? 0}</span>
                  ),
                },
                {
                  key: 'order',
                  header: 'Sort Order',
                  render: (g) => <span className="font-mono-tabular text-xs">{g.sortOrder}</span>,
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (g) => (
                    <StatusBadge label={g.isActive ? 'Active' : 'Inactive'} tone={g.isActive ? 'emerald' : 'slate'} />
                  ),
                },
                {
                  key: 'actions',
                  header: 'Actions',
                  align: 'right',
                  render: (g) => (
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditGroup(g)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#E4EAF5] dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold"
                      >
                        <Edit3 className="h-3.5 w-3.5 text-[#145CFF]" /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteGroupTarget(g)}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}

          {/* Attribute Builder Modal */}
          <Modal
            open={attrModalOpen}
            onClose={() => setAttrModalOpen(false)}
            title={editingAttrId ? 'Edit Dynamic Attribute' : 'Create Dynamic Attribute'}
            size="lg"
          >
            <form onSubmit={handleSaveAttr} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Attribute Name *</label>
                  <input
                    required
                    value={attrName}
                    onChange={(e) => {
                      setAttrName(e.target.value);
                      if (!editingAttrId) setAttrCode(slugifyAttributeCode(e.target.value));
                    }}
                    placeholder="e.g. Storage Capacity, Fabric Weight, Color"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Unique Code *</label>
                  <input
                    required
                    value={attrCode}
                    onChange={(e) => setAttrCode(slugifyAttributeCode(e.target.value))}
                    placeholder="storage_capacity"
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Input Type *</label>
                  <select
                    value={attrInputType}
                    onChange={(e) => setAttrInputType(e.target.value as AttributeInputType)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    {ATTRIBUTE_INPUT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Attribute Group</label>
                  <select
                    value={attrGroupId}
                    onChange={(e) => setAttrGroupId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="">General</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Scope *</label>
                  <select
                    value={attrScope}
                    onChange={(e) => setAttrScope(e.target.value as AttributeScope)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="global">Global (All Products)</option>
                    <option value="category">Assigned Categories</option>
                    <option value="product">Product Specific Only</option>
                  </select>
                </div>
              </div>

              {attrScope === 'category' && (
                <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F8FAFF] dark:bg-slate-900/50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <FolderTree className="h-3.5 w-3.5 text-[#145CFF]" />
                    Assign to Categories ({attrCategoryIds.length} selected)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {categories.map((cat) => (
                      <label key={cat.id} className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={attrCategoryIds.includes(cat.id)}
                          onChange={() => toggleCategoryId(cat.id)}
                          className="h-3.5 w-3.5 rounded text-[#145CFF]"
                        />
                        <span className="truncate">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Unit (Optional)</label>
                  <input
                    value={attrUnit}
                    onChange={(e) => setAttrUnit(e.target.value)}
                    placeholder="kg, cm, GB, mAh, GSM"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Default Value</label>
                  <input
                    value={attrDefaultValue}
                    onChange={(e) => setAttrDefaultValue(e.target.value)}
                    placeholder="Optional default"
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Display Order</label>
                  <input
                    type="number"
                    value={attrSortOrder}
                    onChange={(e) => setAttrSortOrder(e.target.value)}
                    className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">Helper Description</label>
                <input
                  value={attrDescription}
                  onChange={(e) => setAttrDescription(e.target.value)}
                  placeholder="Guidance shown to catalog managers inside Product Form"
                  className="w-full h-9 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>

              {CHOICE_TYPES.has(attrInputType) && (
                <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Selectable Options ({attrOptions.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addOptionRow();
                        }
                      }}
                      placeholder="Add option label (e.g. 512GB or Midnight Black)"
                      className="flex-1 min-w-[200px] h-9 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    />
                    {attrInputType === 'color' && (
                      <input
                        type="color"
                        aria-label="Swatch hex color"
                        value={newOptionHex}
                        onChange={(e) => setNewOptionHex(e.target.value)}
                        className="h-9 w-12 rounded-lg border border-[#E4EAF5] bg-white p-1 cursor-pointer"
                      />
                    )}
                    <button
                      type="button"
                      onClick={addOptionRow}
                      className="h-9 rounded-lg bg-[#145CFF] px-3 text-xs font-semibold text-white hover:bg-[#0E47D9] whitespace-nowrap"
                    >
                      Add Option
                    </button>
                  </div>

                  {attrOptions.length > 0 && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {attrOptions.map((opt, idx) => (
                        <div key={`${opt.label}-${idx}`} className="flex items-center gap-2 rounded-lg bg-[#F8FAFF] dark:bg-slate-900 px-2.5 py-1.5 text-xs">
                          {attrInputType === 'color' && (
                            <input
                              type="color"
                              value={opt.colorHex || '#1155EE'}
                              onChange={(e) =>
                                setAttrOptions((prev) =>
                                  prev.map((o, i) => (i === idx ? { ...o, colorHex: e.target.value } : o)),
                                )
                              }
                              className="h-6 w-8 rounded border border-slate-300 cursor-pointer"
                            />
                          )}
                          <input
                            value={opt.label}
                            onChange={(e) =>
                              setAttrOptions((prev) =>
                                prev.map((o, i) => (i === idx ? { ...o, label: e.target.value, value: e.target.value } : o)),
                              )
                            }
                            className="flex-1 h-7 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setAttrOptions((prev) => prev.filter((_, i) => i !== idx))}
                            aria-label={`Remove option ${opt.label}`}
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Validation Rules */}
              <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-700 p-3 space-y-2">
                <span className="block text-xs font-bold">Validation Rules (Optional)</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {NUMERIC_TYPES.has(attrInputType) ? (
                    <>
                      <input
                        type="number"
                        value={ruleMin}
                        onChange={(e) => setRuleMin(e.target.value)}
                        placeholder="Min value"
                        className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                      />
                      <input
                        type="number"
                        value={ruleMax}
                        onChange={(e) => setRuleMax(e.target.value)}
                        placeholder="Max value"
                        className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                      />
                    </>
                  ) : (
                    <>
                      <input
                        type="number"
                        value={ruleMinLength}
                        onChange={(e) => setRuleMinLength(e.target.value)}
                        placeholder="Min chars"
                        className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                      />
                      <input
                        type="number"
                        value={ruleMaxLength}
                        onChange={(e) => setRuleMaxLength(e.target.value)}
                        placeholder="Max chars"
                        className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 text-xs"
                      />
                    </>
                  )}
                  <input
                    value={rulePattern}
                    onChange={(e) => setRulePattern(e.target.value)}
                    placeholder="Regex pattern"
                    className="h-8 rounded-lg border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-2.5 font-mono-tabular text-xs"
                  />
                </div>
              </div>

              {/* Behavior Checkboxes */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 p-3 text-xs font-semibold">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                  Required Field
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isVisibleToCustomers} onChange={(e) => setIsVisibleToCustomers(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                  Visible to Customers
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={showOnProductDetails} onChange={(e) => setShowOnProductDetails(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                  Show on PDP Specs
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isFilterable} onChange={(e) => setIsFilterable(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                  Filterable in Shop
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isSearchable} onChange={(e) => setIsSearchable(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                  Searchable
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isComparable} onChange={(e) => setIsComparable(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                  Comparable
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded text-[#145CFF]" />
                  Active
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAttrModalOpen(false)}
                  className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAttr}
                  className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  {savingAttr ? 'Saving...' : 'Save Attribute'}
                </button>
              </div>
            </form>
          </Modal>

          {/* Attribute Group Modal */}
          <Modal
            open={groupModalOpen}
            onClose={() => setGroupModalOpen(false)}
            title={editingGroupId ? 'Edit Attribute Group' : 'New Attribute Group'}
            size="md"
          >
            <form onSubmit={handleSaveGroup} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold">Group Name *</label>
                <input
                  required
                  value={groupName}
                  onChange={(e) => {
                    setGroupName(e.target.value);
                    if (!editingGroupId) setGroupSlug(slugifyAttributeCode(e.target.value));
                  }}
                  placeholder="e.g. Display & Graphics"
                  className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold">Slug *</label>
                  <input
                    required
                    value={groupSlug}
                    onChange={(e) => setGroupSlug(slugifyAttributeCode(e.target.value))}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Sort Order</label>
                  <input
                    type="number"
                    value={groupSortOrder}
                    onChange={(e) => setGroupSortOrder(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Description</label>
                <textarea
                  rows={2}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                />
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={groupActive}
                  onChange={(e) => setGroupActive(e.target.checked)}
                  className="h-4 w-4 rounded text-[#145CFF]"
                />
                Active
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  className="rounded-xl border border-[#E4EAF5] px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGroup}
                  className="rounded-xl bg-[#145CFF] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  {savingGroup ? 'Saving...' : 'Save Group'}
                </button>
              </div>
            </form>
          </Modal>

          <ConfirmDialog
            open={Boolean(deleteAttrTarget)}
            onClose={() => setDeleteAttrTarget(null)}
            onConfirm={handleDeleteAttr}
            title="Delete Attribute Definition"
            message={`Remove "${deleteAttrTarget?.name}"${
              deleteAttrTarget?.usageCount
                ? ` (currently used on ${deleteAttrTarget.usageCount} product records)`
                : ''
            }? Existing products keep their stored values safely.`}
            confirmLabel="Delete Attribute"
            destructive
          />

          <ConfirmDialog
            open={Boolean(deleteGroupTarget)}
            onClose={() => setDeleteGroupTarget(null)}
            onConfirm={handleDeleteGroup}
            title="Delete Attribute Group"
            message={`Delete "${deleteGroupTarget?.name}"? Any attributes inside this group will be moved to General without losing data.`}
            confirmLabel="Delete Group"
            destructive
          />
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
