import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Sliders } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import { AdminPageHeader, ErrorBanner, LoadingCards } from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { useAppDispatch } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import type { ProductItem } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function InventoryAdjustmentsPage() {
  useSeoMeta({ title: 'Stock Adjustments | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProductId, setSelectedProductId] = useState('');
  const selectedProductIdRef = useRef('');
  selectedProductIdRef.current = selectedProductId;
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [direction, setDirection] = useState<'add' | 'deduct'>('add');
  const [quantity, setQuantity] = useState('10');
  const [reason, setReason] = useState('Supplier restock batch');
  const [saving, setSaving] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: true; items: ProductItem[] }>('/api/admin/inventory/stock?limit=100');
      const items = res.items || [];
      setProducts(items);
      if (items.length > 0 && !selectedProductIdRef.current) {
        setSelectedProductId(items[0].id);
        setSelectedVariantId(items[0].hasVariants && items[0].variants?.length ? items[0].variants[0]._id || '' : '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load catalog inventory.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const currentProduct = products.find((p) => p.id === selectedProductId) || null;
  const currentVariant =
    currentProduct?.hasVariants && selectedVariantId
      ? currentProduct.variants.find((v) => v._id === selectedVariantId) || null
      : null;

  const currentStock = currentVariant
    ? currentVariant.stockOnHand
    : currentProduct
      ? currentProduct.stockOnHand
      : 0;
  const currentReserved = currentVariant
    ? currentVariant.reservedStock
    : currentProduct
      ? currentProduct.reservedStock
      : 0;
  const signedDelta = (direction === 'add' ? 1 : -1) * Math.max(1, Math.abs(Number(quantity) || 0));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentProduct) return;
    setSaving(true);
    try {
      await apiRequest('/api/admin/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: currentProduct.id,
          variantId: currentProduct.hasVariants && selectedVariantId ? selectedVariantId : null,
          delta: signedDelta,
          reason: reason.trim(),
        }),
      });
      dispatch(showToast({ variant: 'success', message: 'Stock ledger updated successfully.' }));
      await loadProducts();
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Adjustment failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="inventory.adjust">
        <div className="space-y-5 max-w-[920px] mx-auto">
          <AdminPageHeader
            title="Stock Adjustments"
            subtitle="Perform audited warehouse stock additions or write-offs for products and variants."
            breadcrumbs={[
              { label: 'Product Management' },
              { label: 'Inventory', to: '/admin/inventory' },
              { label: 'Stock Adjustments' },
            ]}
            actions={
              <Link
                to="/admin/inventory"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Inventory
              </Link>
            }
          />

          {error && <ErrorBanner message={error} onRetry={loadProducts} />}
          {loading ? (
            <LoadingCards count={2} />
          ) : (
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-6 shadow-xs space-y-5"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-[#101B35] dark:text-white">
                <Sliders className="h-4 w-4 text-[#145CFF]" /> Stock Adjustment Workstation
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold">Select Product *</label>
                  <select
                    required
                    value={selectedProductId}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      setSelectedProductId(nextId);
                      const found = products.find((p) => p.id === nextId);
                      setSelectedVariantId(found?.hasVariants && found.variants?.length ? found.variants[0]._id || '' : '');
                    }}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    {products.map((p) => {
                      const onHand =
                        p.hasVariants && p.variants?.length > 0
                          ? p.variants
                              .filter((v) => v.isActive !== false)
                              .reduce((sum, v) => sum + (v.stockOnHand || 0), 0)
                          : p.stockOnHand;
                      return (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — On Hand: {onHand}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {currentProduct?.hasVariants && currentProduct.variants?.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold">Select Variant *</label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      {currentProduct.variants.map((v) => (
                        <option key={v._id} value={v._id}>
                          {v.title} ({v.sku}) — Stock: {v.stockOnHand}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold">Adjustment Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDirection('add')}
                      className={`h-10 rounded-xl text-xs font-semibold border transition-colors ${
                        direction === 'add'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900'
                      }`}
                    >
                      + Restock / Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('deduct')}
                      className={`h-10 rounded-xl text-xs font-semibold border transition-colors ${
                        direction === 'deduct'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900'
                      }`}
                    >
                      - Deduct / Write-off
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 font-mono-tabular text-xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold">Reason for Audit Trail *</label>
                  <input
                    required
                    minLength={3}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Supplier shipment #INV-204, warehouse count discrepancy, damaged goods..."
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  />
                </div>
              </div>

              {currentProduct && (
                <div className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 bg-[#F4F7FF] dark:bg-slate-900/70 p-4 grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <div className="text-[#64748B]">Current On Hand</div>
                    <div className="font-mono-tabular text-base font-bold text-[#101B35] dark:text-white">{currentStock}</div>
                  </div>
                  <div>
                    <div className="text-[#64748B]">Reserved by Orders</div>
                    <div className="font-mono-tabular text-base font-bold text-amber-600">{currentReserved}</div>
                  </div>
                  <div>
                    <div className="text-[#64748B]">Projected Stock</div>
                    <div
                      className={`font-mono-tabular text-base font-bold ${
                        currentStock + signedDelta < currentReserved ? 'text-rose-600' : 'text-[#145CFF]'
                      }`}
                    >
                      {currentStock + signedDelta}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <Link to="/admin/inventory/history" className="rounded-xl border border-[#E4EAF5] px-4 py-2.5 text-xs font-semibold">
                  View Stock History
                </Link>
                <button
                  type="submit"
                  disabled={saving || !currentProduct}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#145CFF] px-6 py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {saving ? 'Applying...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
