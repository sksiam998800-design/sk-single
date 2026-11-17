import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Edit3, ExternalLink, Package } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  ErrorBanner,
  LoadingCards,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { ResilientImage } from '../../../components/ui/ResilientImage';
import { apiRequest } from '../../../services/api';
import type { InventoryMovementRecord, ProductItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';
import { buildGroupedSpecifications } from '../../../lib/productAttributes';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  useSeoMeta({ title: 'Product Details | NOVARA Admin', noIndex: true });

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [movements, setMovements] = useState<InventoryMovementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{
        ok: true;
        product: ProductItem;
        movements: InventoryMovementRecord[];
      }>(`/api/admin/products/${id}`);
      setProduct(res.product);
      setMovements(res.movements || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load product details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const catName = product && typeof product.categoryId === 'object' ? product.categoryId?.name : '';

  return (
    <AdminLayout>
      <PermissionGuard permission="catalog.view">
        <div className="space-y-5 max-w-[1200px] mx-auto">
          <AdminPageHeader
            title={product ? product.name : 'Product Detail'}
            subtitle={product ? `SKU: ${product.sku}${catName ? ` · ${catName}` : ''}` : 'Inspect catalog item specifications & ledger'}
            breadcrumbs={[
              { label: 'Product Management' },
              { label: 'All Products', to: '/admin/products' },
              { label: product?.sku || 'Details' },
            ]}
            actions={
              <>
                <Link
                  to="/admin/products"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back
                </Link>
                {product && (
                  <>
                    <a
                      href={`/product/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold text-[#101B35] dark:text-slate-200"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View Live
                    </a>
                    <Link
                      to={`/admin/products/${product.id}/edit`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#145CFF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0E47D9]"
                    >
                      <Edit3 className="h-3.5 w-3.5" /> Edit Product
                    </Link>
                  </>
                )}
              </>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={3} />
          ) : product ? (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs flex flex-col sm:flex-row gap-5">
                  <div className="h-40 w-40 shrink-0 overflow-hidden rounded-2xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900">
                    <ResilientImage src={product.images?.[0]?.url} alt={product.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge label={product.status} tone={statusToTone(product.status)} />
                      {product.isFeatured && <StatusBadge label="Featured" tone="blue" />}
                      {product.isBestSeller && <StatusBadge label="Best Seller" tone="amber" />}
                      {product.isNewArrival && <StatusBadge label="New Arrival" tone="indigo" />}
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-bold text-[#101B35] dark:text-white">{product.name}</h2>
                      {product.nameBn && <p className="text-xs text-[#64748B]">{product.nameBn}</p>}
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-slate-300 leading-relaxed">{product.description}</p>
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#E4EAF5] dark:border-slate-800 text-xs">
                      <div>
                        <div className="text-[#64748B]">Base Price</div>
                        <div className="font-mono-tabular font-bold text-[#101B35] dark:text-white">
                          ৳{product.basePrice.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#64748B]">Effective Price</div>
                        <div className="font-mono-tabular font-bold text-[#145CFF]">
                          ৳{(product.currentPrice ?? product.salePrice ?? product.basePrice).toLocaleString('en-IN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#64748B]">Available Stock</div>
                        <div className="font-mono-tabular font-bold text-emerald-600">
                          {(product.hasVariants && product.variants?.length
                            ? product.variants
                                .filter((v) => v.isActive !== false)
                                .reduce((s, v) => s + Math.max(0, v.stockOnHand - v.reservedStock), 0)
                            : Math.max(0, product.stockOnHand - product.reservedStock)
                          ).toLocaleString('en-IN')}{' '}
                          units
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {product.hasVariants && product.variants?.length > 0 && (
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                    <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">Variants Breakdown</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B]">
                          <tr>
                            <th className="py-2 pr-3">SKU</th>
                            <th className="py-2 pr-3">Option</th>
                            <th className="py-2 pr-3">Price</th>
                            <th className="py-2 pr-3">Stock</th>
                            <th className="py-2">Reserved</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {product.variants.map((v, idx) => (
                            <tr key={v._id || idx}>
                              <td className="py-2.5 pr-3 font-mono-tabular font-semibold">{v.sku}</td>
                              <td className="py-2.5 pr-3">{v.title}</td>
                              <td className="py-2.5 pr-3 font-mono-tabular">
                                ৳{(v.salePrice ?? v.price ?? product.basePrice).toLocaleString('en-IN')}
                              </td>
                              <td className="py-2.5 pr-3 font-mono-tabular font-bold">{v.stockOnHand}</td>
                              <td className="py-2.5 font-mono-tabular text-amber-600">{v.reservedStock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">Recent Inventory Movements</h3>
                    <Link to="/admin/inventory/adjustments" className="text-xs font-semibold text-[#145CFF] hover:underline">
                      Adjust Stock →
                    </Link>
                  </div>
                  {movements.length === 0 ? (
                    <p className="text-xs text-[#64748B]">No inventory ledger movements recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {movements.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-xl border border-[#E4EAF5] dark:border-slate-800 px-3 py-2 text-xs"
                        >
                          <div>
                            <span className="font-semibold capitalize text-[#101B35] dark:text-white">{m.type}</span>
                            <span className="ml-2 text-[#64748B]">{m.reason}</span>
                          </div>
                          <div className="font-mono-tabular font-bold">
                            <span className={m.delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {m.delta >= 0 ? `+${m.delta}` : m.delta}
                            </span>
                            <span className="ml-2 text-[#64748B] font-normal">
                              ({m.previousStockOnHand} → {m.newStockOnHand})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {product.highlights && product.highlights.length > 0 && (
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-2.5 text-xs">
                    <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">PDP Highlight Cards</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {product.highlights.map((h, i) => (
                        <div key={i} className="rounded-xl bg-[#F4F7FE] dark:bg-slate-900 p-2.5">
                          <div className="font-bold text-[#101B35] dark:text-white">{h.title}</div>
                          {h.subtitle && <div className="text-[11px] text-[#64748B]">{h.subtitle}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3 text-xs">
                  <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                    <Package className="h-4 w-4 text-[#145CFF]" /> Specifications & Attributes
                  </h3>
                  <dl className="space-y-2">
                    <div className="flex justify-between">
                      <dt className="text-[#64748B]">Brand</dt>
                      <dd className="font-semibold text-[#101B35] dark:text-white">{product.brandName || 'Generic'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#64748B]">Inventory Policy</dt>
                      <dd className="font-semibold text-[#101B35] dark:text-white">
                        {product.manageInventory === false
                          ? 'Stock Not Tracked'
                          : product.allowBackorder
                            ? 'Tracked + Backorder Allowed'
                            : 'Tracked Stock'}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#64748B]">Units Sold</dt>
                      <dd className="font-mono-tabular font-semibold">{product.soldCount}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#64748B]">Rating</dt>
                      <dd className="font-mono-tabular font-semibold">
                        {product.ratingAverage.toFixed(1)} ({product.reviewCount} reviews)
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#64748B]">Low Stock Alert</dt>
                      <dd className="font-mono-tabular font-semibold">{product.lowStockThreshold}</dd>
                    </div>
                  </dl>

                  {buildGroupedSpecifications({
                    attributeValues: product.attributeValues,
                    specifications: product.specifications,
                    attributes: product.attributes,
                    includeHidden: true,
                  }).map((grp) => (
                    <div key={grp.groupName} className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-[#145CFF]">{grp.groupName}</div>
                      {grp.items.map((row, idx) => (
                        <div key={`${row.label}-${idx}`} className="flex justify-between gap-2">
                          <span className="text-[#64748B]">{row.label}</span>
                          <span className="font-semibold text-right text-[#101B35] dark:text-white">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {product.contentSections && product.contentSections.length > 0 && (
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-2 text-xs">
                    <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">
                      Custom Sections ({product.contentSections.length})
                    </h3>
                    {product.contentSections.map((sec, idx) => (
                      <div key={sec.sectionId || idx} className="flex items-center justify-between rounded-lg bg-[#F8FAFF] dark:bg-slate-900 px-3 py-2">
                        <span className="font-semibold">{sec.title}</span>
                        <StatusBadge
                          label={sec.isEnabled && sec.showToCustomer ? 'Live' : 'Hidden'}
                          tone={sec.isEnabled && sec.showToCustomer ? 'emerald' : 'slate'}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
