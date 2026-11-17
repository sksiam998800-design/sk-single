import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Filter, RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import { apiRequest, isAbortError } from '../services/api';
import { useAppSelector } from '../app/hooks';
import type { BrandItem, CategoryItem, ProductItem } from '../types/commerce';
import { ProductCard } from '../components/catalog/ProductCard';
import { ResilientImage } from '../components/ui/ResilientImage';
import { DynamicBannerGroup } from '../components/banners/DynamicBannerRenderer';
import { useSeoMeta } from '../lib/useSeoMeta';

const SECTION_LABELS: Record<string, string> = {
  featured: 'Featured Products',
  latest: 'Latest Products',
  new_arrivals: 'New Arrivals',
  trending: 'Trending Products',
  bestsellers: 'Best Sellers',
  premium: 'Our Premium Collection',
};

interface DynamicFilterOption {
  label: string;
  value: string;
  colorHex?: string;
  count: number;
}

interface DynamicFilterFacet {
  id: string;
  name: string;
  code: string;
  inputType: string;
  unit?: string;
  options: DynamicFilterOption[];
}

export function ShopPage() {
  const { slug: categoryParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const storefront = useAppSelector((s) => s.storefront);

  const q = searchParams.get('q') || '';
  const subCategory = searchParams.get('subCategory') || '';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const inStock = searchParams.get('inStock') === 'true';
  const discount = searchParams.get('discount') === 'true';
  const section = searchParams.get('section') || '';
  const sort = searchParams.get('sort') || 'popular';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  // Extract active attr_<code >=val1,val2 query parameters deterministically
  const attrParamsEntries: Array<[string, string[]]> = [];
  searchParams.forEach((val, key) => {
    if (!key.startsWith('attr_') || !val) return;
    const code = key.slice(5).trim().toLowerCase();
    const values = val
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
    if (code && values.length > 0) {
      attrParamsEntries.push([code, values]);
    }
  });
  const attrParamsKey = attrParamsEntries
    .map(([c, vals]) => `${c}:${vals.join(',')}`)
    .sort()
    .join('|');

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [dynamicFilters, setDynamicFilters] = useState<DynamicFilterFacet[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>(storefront.categories || []);
  const [subcategories, setSubcategories] = useState<CategoryItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>(storefront.brands || []);
  const [categoryInfo, setCategoryInfo] = useState<CategoryItem | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 16, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const sectionHeading = section && SECTION_LABELS[section] ? SECTION_LABELS[section] : null;
  const pageTitle = q
    ? `Search: "${q}" | NOVARA COMMERCE`
    : categoryInfo
      ? `${categoryInfo.name} | NOVARA COMMERCE`
      : sectionHeading
        ? `${sectionHeading} | NOVARA COMMERCE`
        : 'Shop All Products | NOVARA COMMERCE';

  useSeoMeta({
    title: pageTitle,
    description:
      categoryInfo?.description ||
      'Browse electronics, fashion, books, beauty, and home essentials across Bangladesh at NOVARA COMMERCE.',
  });

  useEffect(() => {
    if (storefront.loaded) {
      setCategories(storefront.categories || []);
      setBrands(storefront.brands || []);
      return;
    }
    const controller = new AbortController();
    apiRequest<{ ok: true; categories: CategoryItem[]; brands: BrandItem[] }>('/api/storefront/navigation', {
      signal: controller.signal,
    })
      .then((res) => {
        setCategories(Array.isArray(res?.categories) ? res.categories : []);
        setBrands(Array.isArray(res?.brands) ? res.brands : []);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setCategories([]);
          setBrands([]);
        }
      });
    return () => controller.abort();
  }, [storefront.loaded, storefront.categories, storefront.brands]);

  useEffect(() => {
    const controller = new AbortController();
    const qs = new URLSearchParams();
    if (categoryParam) qs.set('category', categoryParam);
    if (subCategory) qs.set('subCategory', subCategory);
    apiRequest<{ ok: true; filters: DynamicFilterFacet[] }>(
      `/api/products/attributes/filters${qs.toString() ? `?${qs.toString()}` : ''}`,
      { signal: controller.signal },
    )
      .then((res) => {
        setDynamicFilters(Array.isArray(res?.filters) ? res.filters : []);
      })
      .catch((err) => {
        if (!isAbortError(err)) {
          setDynamicFilters([]);
        }
      });
    return () => controller.abort();
  }, [categoryParam, subCategory]);

  const loadProducts = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        if (categoryParam) params.set('category', categoryParam);
        if (subCategory) params.set('subCategory', subCategory);
        if (brand) params.set('brand', brand);
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (inStock) params.set('inStock', 'true');
        if (discount) params.set('discount', 'true');
        if (section) params.set('section', section);
        params.set('sort', sort);
        params.set('page', String(page));
        for (const [code, values] of attrParamsEntries) {
          params.set(`attr_${code}`, values.join(','));
        }

        const res = await apiRequest<{
          ok: true;
          products: ProductItem[];
          category: CategoryItem | null;
          subcategories?: CategoryItem[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/api/products?${params.toString()}`, { signal });

        setProducts(Array.isArray(res?.products) ? res.products : []);
        setCategoryInfo(res?.category ?? null);
        setSubcategories(Array.isArray(res?.subcategories) ? res.subcategories : []);
        if (res?.pagination) {
          setPagination(res.pagination);
        } else {
          const count = Array.isArray(res?.products) ? res.products.length : 0;
          setPagination({ page: 1, limit: 16, total: count, totalPages: 1 });
        }
      } catch (err) {
        if (isAbortError(err)) return;
        setProducts([]);
        setPagination((prev) => ({ ...prev, total: 0, totalPages: 1 }));
        setError(err instanceof Error ? err.message : 'Unable to fetch catalog products.');
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, categoryParam, subCategory, brand, minPrice, maxPrice, inStock, discount, section, sort, page, attrParamsKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadProducts(controller.signal);
    return () => controller.abort();
  }, [loadProducts]);

  const updateFilter = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const toggleAttributeFilter = (code: string, optionValue: string, singleChoice = false) => {
    const paramKey = `attr_${code.toLowerCase()}`;
    const next = new URLSearchParams(searchParams);
    const current = (next.get(paramKey) || '')
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    const exists = current.some((v) => v.toLowerCase() === optionValue.toLowerCase());
    let updated: string[];
    if (singleChoice) {
      updated = exists ? [] : [optionValue];
    } else {
      updated = exists
        ? current.filter((v) => v.toLowerCase() !== optionValue.toLowerCase())
        : [...current, optionValue];
    }

    if (updated.length === 0) {
      next.delete(paramKey);
    } else {
      next.set(paramKey, updated.join(','));
    }
    next.set('page', '1');
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const derivedSubcategories =
    subcategories.length > 0
      ? subcategories
      : categoryInfo
        ? categories.filter((c) => c.parentId === categoryInfo.id)
        : [];

  const categoryTopBanners = (storefront.banners || []).filter((b) => b.placement === 'category_top');
  const categorySidebarAd = (storefront.promotionalAds || []).find((a) => a.placement === 'category_sidebar');

  const FilterPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-sm font-bold text-[#0F1D3A]">Categories</h3>
        <ul className="mt-2.5 space-y-1.5 text-sm">
          <li>
            <Link
              to="/shop"
              className={`block rounded-lg px-2.5 py-1.5 ${
                !categoryParam ? 'bg-[#E9F0FD] font-semibold text-[#1155EE]' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Categories
            </Link>
          </li>
          {categories
            .filter((c) => !c.parentId)
            .map((cat) => (
              <li key={cat.id}>
                <Link
                  to={`/category/${cat.slug}`}
                  className={`block rounded-lg px-2.5 py-1.5 ${
                    categoryParam === cat.slug
                      ? 'bg-[#E9F0FD] font-semibold text-[#1155EE]'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </Link>
              </li>
            ))}
        </ul>
      </div>

      <div>
        <h3 className="font-display text-sm font-bold text-[#0F1D3A]">Price Range (৳)</h3>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <input
            type="number"
            min={0}
            placeholder="Min"
            value={minPrice}
            onChange={(e) => updateFilter('minPrice', e.target.value || null)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-[#1155EE] focus:outline-none"
          />
          <input
            type="number"
            min={0}
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => updateFilter('maxPrice', e.target.value || null)}
            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs focus:border-[#1155EE] focus:outline-none"
          />
        </div>
      </div>

      {brands.length > 0 && (
        <div>
          <h3 className="font-display text-sm font-bold text-[#0F1D3A]">Brand</h3>
          <select
            aria-label="Filter by brand"
            value={brand}
            onChange={(e) => updateFilter('brand', e.target.value || null)}
            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-700 focus:border-[#1155EE] focus:outline-none"
          >
            <option value="">All Brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Category-Aware Dynamic Attribute Filters */}
      {dynamicFilters.map((facet) => {
        const selectedVals = new Set(
          (searchParams.get(`attr_${facet.code.toLowerCase()}`) || '')
            .split(',')
            .map((v) => v.trim().toLowerCase())
            .filter(Boolean),
        );

        return (
          <div key={facet.id} className="border-t border-slate-200 pt-4">
            <h3 className="font-display text-sm font-bold text-[#0F1D3A]">
              {facet.name}
              {facet.unit ? <span className="ml-1 text-[11px] font-normal text-slate-400">({facet.unit})</span> : null}
            </h3>

            {facet.inputType === 'color' ? (
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {facet.options.map((opt) => {
                  const isActive = selectedVals.has(opt.value.toLowerCase());
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAttributeFilter(facet.code, opt.value)}
                      title={`${opt.label} (${opt.count})`}
                      aria-label={`Filter by ${facet.name}: ${opt.label}`}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all ${
                        isActive
                          ? 'border-[#1155EE] bg-[#E9F0FD] text-[#1155EE]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-slate-300"
                        style={{ backgroundColor: opt.colorHex || '#64748B' }}
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : facet.inputType === 'boolean' ? (
              <div className="mt-2.5 flex gap-2">
                {facet.options.map((opt) => {
                  const isActive = selectedVals.has(opt.value.toLowerCase());
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAttributeFilter(facet.code, opt.value, true)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'border-[#1155EE] bg-[#1155EE] text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {facet.options.map((opt) => {
                  const isActive = selectedVals.has(opt.value.toLowerCase());
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => toggleAttributeFilter(facet.code, opt.value)}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                        isActive
                          ? 'border-[#1155EE] bg-[#E9F0FD] font-semibold text-[#1155EE]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {opt.count > 0 && <span className="text-[10px] text-slate-400">({opt.count})</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="space-y-2.5 border-t border-slate-200 pt-4">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => updateFilter('inStock', e.target.checked ? 'true' : null)}
            className="rounded border-slate-300 text-[#1155EE]"
          />
          In Stock Only
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={discount}
            onChange={(e) => updateFilter('discount', e.target.checked ? 'true' : null)}
            className="rounded border-slate-300 text-[#1155EE]"
          />
          On Sale / Discounted
        </label>
      </div>

      <button
        type="button"
        onClick={clearAllFilters}
        className="w-full rounded-lg border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        Clear All Filters
      </button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1380px] px-4 py-6">
      {/* Breadcrumb & Header */}
      <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-slate-500">
        <Link to="/" className="hover:text-[#1155EE]">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-[#1155EE]">Shop</Link>
        {(categoryInfo || categoryParam) && (
          <>
            <span>/</span>
            <span className="font-semibold capitalize text-[#0F1D3A]">
              {categoryInfo?.name || categoryParam?.replace(/-/g, ' ')}
            </span>
          </>
        )}
      </nav>

      {categoryTopBanners.length > 0 && (
        <div className="mb-5">
          <DynamicBannerGroup banners={categoryTopBanners} />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h1 className="font-display text-2xl font-bold capitalize text-[#0F1D3A]">
            {q
              ? `Search results for "${q}"`
              : categoryInfo
                ? categoryInfo.name
                : categoryParam
                  ? categoryParam.replace(/-/g, ' ')
                  : sectionHeading || 'All Products'}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            {loading
              ? 'Loading product catalog...'
              : error
                ? 'Catalog request could not be completed'
                : `Showing ${products.length} of ${pagination.total} products`}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>

          <select
            aria-label="Sort products"
            value={sort}
            onChange={(e) => updateFilter('sort', e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#0F1D3A] focus:border-[#1155EE] focus:outline-none"
          >
            <option value="popular">Best Selling</option>
            <option value="trending">Trending Now</option>
            <option value="newest">Newest Arrivals</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Subcategory chips when browsing a parent category */}
      {derivedSubcategories.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updateFilter('subCategory', null)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              !subCategory
                ? 'bg-[#1155EE] text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            All {categoryInfo?.name}
          </button>
          {derivedSubcategories.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => updateFilter('subCategory', sub.slug)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                subCategory === sub.slug
                  ? 'bg-[#1155EE] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        <aside className="hidden space-y-5 lg:col-span-3 lg:block lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <Filter className="h-4 w-4 text-[#1155EE]" />
              <h2 className="font-display text-sm font-bold text-[#0F1D3A]">Filter Catalog</h2>
            </div>
            {FilterPanel}
          </div>

          {categorySidebarAd && (
            <a
              href={categorySidebarAd.destinationUrl}
              onClick={() => {
                fetch(`/api/storefront/ads/${categorySidebarAd.id}/track`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ event: 'click' }),
                }).catch(() => undefined);
              }}
              className="block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition-opacity hover:opacity-95"
            >
              <ResilientImage
                src={categorySidebarAd.imageUrl}
                alt={categorySidebarAd.altText || categorySidebarAd.title}
                className="w-full object-cover"
              />
            </a>
          )}
        </aside>

        {/* Mobile Filter Drawer */}
        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-[70] flex bg-[#071024]/50 lg:hidden">
            <div className="h-full w-80 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="font-display text-base font-bold text-[#0F1D3A]">Filter Catalog</h2>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  aria-label="Close filters"
                  className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              {FilterPanel}
            </div>
          </div>
        )}

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {attrParamsEntries.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs">
              <span className="font-semibold text-slate-500">Active Attributes:</span>
              {attrParamsEntries.flatMap(([code, vals]) => {
                const facet = dynamicFilters.find((f) => f.code.toLowerCase() === code.toLowerCase());
                const labelPrefix = facet?.name || code.replace(/_/g, ' ');
                return vals.map((val) => (
                  <button
                    key={`${code}-${val}`}
                    type="button"
                    onClick={() => toggleAttributeFilter(code, val)}
                    className="inline-flex items-center gap-1 rounded-full bg-[#E9F0FD] px-2.5 py-1 font-semibold text-[#1155EE] hover:bg-[#DCE8FC]"
                  >
                    <span className="capitalize">{labelPrefix}:</span> {val}
                    <X className="h-3 w-3" />
                  </button>
                ));
              })}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-auto font-semibold text-slate-500 hover:text-rose-600"
              >
                Clear All
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200/70" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center">
              <AlertTriangle className="mx-auto mb-3 h-7 w-7 text-rose-500" />
              <p className="font-display text-base font-bold text-[#0F1D3A]">Unable to Load Products</p>
              <p className="mt-1.5 text-sm font-medium text-rose-700">{error}</p>
              <button
                type="button"
                onClick={() => loadProducts()}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#1155EE] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0B44CC]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
              <p className="font-display text-lg font-bold text-[#0F1D3A]">No products found</p>
              <p className="mt-1 text-sm text-slate-500">
                Try adjusting your search keywords or clearing active filters.
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-4 rounded-full bg-[#1155EE] px-5 py-2 text-xs font-semibold text-white"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((prod) => (
                  <ProductCard key={prod.id} product={prod} />
                ))}
              </div>

              {pagination.totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  {Array.from({ length: pagination.totalPages }).map((_, idx) => {
                    const pNum = idx + 1;
                    return (
                      <button
                        key={pNum}
                        type="button"
                        onClick={() => {
                          const next = new URLSearchParams(searchParams);
                          next.set('page', String(pNum));
                          setSearchParams(next);
                        }}
                        className={`h-9 w-9 rounded-lg text-xs font-semibold ${
                          pagination.page === pNum
                            ? 'bg-[#1155EE] text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {pNum}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
