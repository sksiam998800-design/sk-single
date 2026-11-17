import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Save, ShoppingBag } from 'lucide-react';
import { AdminLayout, PermissionGuard } from '../../../layouts/AdminLayout';
import {
  AdminPageHeader,
  ErrorBanner,
  LoadingCards,
  StatusBadge,
  statusToTone,
} from '../../../components/admin/ui';
import { apiRequest } from '../../../services/api';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { showToast } from '../../../features/notifications/toastSlice';
import { hasPermission, type RoleName } from '../../../lib/rbac';
import type { CustomerGroupRecord, CustomerRecord, OrderRecord, SavedAddress } from '../../../types/commerce';
import { useSeoMeta } from '../../../lib/useSeoMeta';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  useSeoMeta({ title: 'Customer Profile | NOVARA Admin', noIndex: true });
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((s) => s.auth.user);
  const canManageRoles = Boolean(
    currentUser && hasPermission(currentUser.role, 'staff.manage', currentUser.customPermissions),
  );

  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [groups, setGroups] = useState<CustomerGroupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<'active' | 'suspended'>('active');
  const [role, setRole] = useState<RoleName>('customer');
  const [groupId, setGroupId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [custRes, grpRes] = await Promise.all([
        apiRequest<{
          ok: true;
          customer: CustomerRecord;
          orders: OrderRecord[];
          addresses: SavedAddress[];
        }>(`/api/admin/customers/${id}`),
        apiRequest<{ ok: true; groups: CustomerGroupRecord[] }>('/api/admin/customer-groups'),
      ]);
      setCustomer(custRes.customer);
      setOrders(custRes.orders || []);
      setAddresses(custRes.addresses || []);
      setGroups(grpRes.groups || []);
      setStatus(custRes.customer.status || 'active');
      setRole(custRes.customer.role || 'customer');
      const g = custRes.customer.customerGroupId;
      setGroupId(g && typeof g === 'object' ? g._id : g || '');
      setNotes(custRes.customer.notes || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load customer profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        status,
        customerGroupId: groupId || null,
        notes,
      };
      if (canManageRoles && customer.role !== 'super_admin' && role !== 'super_admin') {
        payload.role = role;
      }
      const res = await apiRequest<{ ok: true; customer: CustomerRecord }>(`/api/admin/customers/${customer.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setCustomer((prev) => (prev ? { ...prev, ...res.customer } : res.customer));
      dispatch(showToast({ variant: 'success', message: 'Customer settings saved.' }));
    } catch (err) {
      dispatch(showToast({ variant: 'error', message: err instanceof Error ? err.message : 'Update failed.' }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <PermissionGuard permission="customers.view">
        <div className="space-y-5 max-w-[1280px] mx-auto">
          <AdminPageHeader
            title={customer ? customer.name : 'Customer Profile'}
            subtitle={customer ? `${customer.email}${customer.phone ? ` · ${customer.phone}` : ''}` : 'Inspect lifetime orders & segmentation'}
            breadcrumbs={[
              { label: 'Customer' },
              { label: 'All Customers', to: '/admin/customers' },
              { label: customer?.name || 'Profile' },
            ]}
            actions={
              <Link
                to="/admin/customers"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-white dark:bg-[#0B1730] px-3.5 py-2 text-xs font-semibold"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
              </Link>
            }
          />

          {error && <ErrorBanner message={error} onRetry={load} />}
          {loading ? (
            <LoadingCards count={3} />
          ) : customer ? (
            <div className="grid gap-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                {/* Summary KPIs */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs">
                    <div className="text-xs text-[#64748B]">Total Orders</div>
                    <div className="font-mono-tabular mt-1 text-2xl font-bold text-[#101B35] dark:text-white">{customer.orderCount}</div>
                  </div>
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs">
                    <div className="text-xs text-[#64748B]">Lifetime Spend</div>
                    <div className="font-mono-tabular mt-1 text-2xl font-bold text-[#145CFF]">
                      ৳{(customer.totalSpent || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs">
                    <div className="text-xs text-[#64748B]">Account &amp; Verification</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusBadge label={customer.status} tone={statusToTone(customer.status)} />
                      <StatusBadge
                        label={customer.isVerified ? 'Verified' : 'Unverified'}
                        tone={customer.isVerified ? 'emerald' : 'amber'}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-4 shadow-xs">
                    <div className="text-xs text-[#64748B]">Provider &amp; Joined</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <StatusBadge
                        label={customer.authProvider === 'google' ? 'Google' : customer.authProvider === 'facebook' ? 'Facebook' : 'Email'}
                        tone={customer.authProvider === 'google' || customer.authProvider === 'facebook' ? 'blue' : 'slate'}
                      />
                    </div>
                    <div className="mt-1 text-[11px] font-mono-tabular text-[#64748B]">
                      {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '—'}
                    </div>
                  </div>
                </div>

                {/* Order History */}
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-[#145CFF]" /> Order History
                  </h3>
                  {orders.length === 0 ? (
                    <p className="text-xs text-[#64748B]">This customer has not placed an order yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-[#E4EAF5] dark:border-slate-800 text-[#64748B]">
                          <tr>
                            <th className="py-2 pr-3">Order #</th>
                            <th className="py-2 pr-3">Date</th>
                            <th className="py-2 pr-3">Payment</th>
                            <th className="py-2 pr-3">Status</th>
                            <th className="py-2 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {orders.map((o) => (
                            <tr key={o.id}>
                              <td className="py-2.5 pr-3">
                                <Link to={`/admin/orders/${o.id}`} className="font-mono-tabular font-bold text-[#145CFF] hover:underline">
                                  {o.orderNumber}
                                </Link>
                              </td>
                              <td className="py-2.5 pr-3 text-[#64748B]">{new Date(o.createdAt).toLocaleDateString()}</td>
                              <td className="py-2.5 pr-3 uppercase">{o.paymentMethod}</td>
                              <td className="py-2.5 pr-3">
                                <StatusBadge label={o.orderStatus} tone={statusToTone(o.orderStatus)} />
                              </td>
                              <td className="py-2.5 text-right font-mono-tabular font-bold">
                                ৳{o.total.toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Saved Addresses */}
                <div className="rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-3">
                  <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#145CFF]" /> Saved Shipping Addresses
                  </h3>
                  {addresses.length === 0 ? (
                    <p className="text-xs text-[#64748B]">No saved shipping addresses.</p>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {addresses.map((a) => (
                        <div key={a.id} className="rounded-xl border border-[#E4EAF5] dark:border-slate-800 p-3 text-xs space-y-1">
                          <div className="flex justify-between font-bold">
                            <span>{a.label}</span>
                            {a.isDefault && <StatusBadge label="Default" tone="blue" />}
                          </div>
                          <div>{a.recipientName} ({a.phone})</div>
                          <div className="text-[#64748B]">
                            {a.house}, {a.area}, {a.upazila}, {a.district}, {a.division}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Segmentation & Controls */}
              <form
                onSubmit={handleSave}
                className="h-fit rounded-2xl border border-[#E4EAF5] dark:border-slate-800 bg-white dark:bg-[#0B1730] p-5 shadow-xs space-y-4"
              >
                <h3 className="font-display text-sm font-bold text-[#101B35] dark:text-white">Account Controls</h3>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Account Status</label>
                  <select
                    value={status}
                    disabled={
                      customer.role === 'super_admin' ||
                      (Boolean(customer.role) && customer.role !== 'customer' && !canManageRoles) ||
                      customer.id === currentUser?.id
                    }
                    onChange={(e) => setStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs disabled:opacity-60"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended (Blocked from checkout)</option>
                  </select>
                </div>
                {canManageRoles && customer.role !== 'super_admin' && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold">User Role (RBAC)</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as RoleName)}
                      className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                    >
                      <option value="customer">Customer</option>
                      <option value="customer_support">Customer Support</option>
                      <option value="order_manager">Order Manager</option>
                      <option value="inventory_manager">Inventory Manager</option>
                      <option value="catalog_manager">Catalog Manager</option>
                      <option value="finance_accounts">Finance &amp; Accounts</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-semibold">Customer Group / Tier</label>
                  <select
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 px-3 text-xs"
                  >
                    <option value="">Standard Customer (No Group)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.discountPercent}% Discount)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">CRM Staff Notes</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="VIP preference, delivery instructions, or risk flag notes..."
                    className="w-full rounded-xl border border-[#E4EAF5] dark:border-slate-700 bg-[#F4F7FF] dark:bg-slate-900 p-3 text-xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#145CFF] py-2.5 text-xs font-semibold text-white hover:bg-[#0E47D9] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Customer Settings'}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </PermissionGuard>
    </AdminLayout>
  );
}
