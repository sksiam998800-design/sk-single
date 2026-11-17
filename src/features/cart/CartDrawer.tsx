import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { closeCartDrawer, updateCartQtyAsync } from './cartSlice';
import { openAuthModal } from '../auth/authSlice';
import { ResilientImage } from '../../components/ui/ResilientImage';
import { formatStoreCurrency } from '../../lib/dateTime';
import { showToast } from '../notifications/toastSlice';

export function CartDrawer() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, subtotal, discount, couponCode, appliedRuleName, drawerOpen } = useAppSelector((s) => s.cart);
  const { user } = useAppSelector((s) => s.auth);
  const { settings } = useAppSelector((s) => s.storefront);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dispatch(closeCartDrawer());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, dispatch]);

  if (!drawerOpen) return null;

  const freeShippingThreshold = settings?.shippingSettings?.freeShippingThreshold ?? 999;
  const currencyCfg = settings?.currencySettings;
  const remainingForFreeShipping = freeShippingThreshold > 0 ? Math.max(0, freeShippingThreshold - subtotal) : 0;

  const handleCheckoutClick = () => {
    dispatch(closeCartDrawer());
    if (!user) {
      dispatch(
        openAuthModal({
          tab: 'login',
          returnUrl: '/checkout',
          notice: 'Please sign in or register an account to proceed with checkout.',
        }),
      );
      return;
    }
    navigate('/checkout');
  };

  const handleUpdateQty = async (productId: string, variantId: string | null | undefined, nextQty: number) => {
    const res = await dispatch(
      updateCartQtyAsync({
        productId,
        variantId,
        quantity: nextQty,
        isAuthenticated: Boolean(user),
      }),
    );
    if (updateCartQtyAsync.rejected.match(res)) {
      dispatch(showToast({ variant: 'error', message: String(res.payload || 'Unable to update quantity') }));
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-[#071024]/55 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dispatch(closeCartDrawer());
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping Cart"
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="h-5 w-5 text-[#1155EE]" />
            <h2 className="font-display text-lg font-bold text-[#0F1D3A]">
              Shopping Cart ({items.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => dispatch(closeCartDrawer())}
            aria-label="Close cart drawer"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {items.length > 0 && freeShippingThreshold > 0 && (
          <div className="border-b border-slate-100 bg-[#F4F7FE] px-5 py-2.5 text-xs font-medium text-[#0F1D3A]">
            {remainingForFreeShipping === 0
              ? 'You unlocked Free Standard Shipping across Bangladesh!'
              : `Add ${formatStoreCurrency(remainingForFreeShipping, currencyCfg)} more for Free Shipping (Orders over ${formatStoreCurrency(freeShippingThreshold, currencyCfg)})`}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <ShoppingBag className="mb-3 h-12 w-12 text-slate-300" />
              <p className="font-display text-base font-semibold text-[#0F1D3A]">Your cart is empty</p>
              <p className="mt-1 text-sm text-slate-500">Explore our electronics, fashion, and lifestyle catalog.</p>
              <Link
                to="/shop"
                onClick={() => dispatch(closeCartDrawer())}
                className="mt-5 rounded-full bg-[#1155EE] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li
                  key={`${item.productId}-${item.variantId || 'default'}`}
                  className="flex gap-3.5 rounded-xl border border-slate-200 p-3"
                >
                  <Link
                    to={`/product/${item.slug}`}
                    onClick={() => dispatch(closeCartDrawer())}
                    className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-white p-1"
                  >
                    <ResilientImage src={item.imageUrl} alt={item.name} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => dispatch(closeCartDrawer())}
                      className="line-clamp-2 text-sm font-semibold text-[#0F1D3A] hover:text-[#1155EE]"
                    >
                      {item.name}
                    </Link>
                    {item.variantTitle && (
                      <p className="mt-0.5 text-xs text-slate-500">{item.variantTitle}</p>
                    )}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, item.variantId, item.quantity - 1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="font-mono-tabular px-2.5 text-xs font-semibold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(item.productId, item.variantId, item.quantity + 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-tabular text-sm font-bold text-[#1155EE]">
                          ৳{(item.unitPrice * item.quantity).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(item.productId, item.variantId, 0)}
                        aria-label={`Remove ${item.name}`}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 bg-slate-50 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Subtotal</span>
              <span className="font-mono-tabular font-bold text-[#0F1D3A]">{formatStoreCurrency(subtotal, currencyCfg)}</span>
            </div>
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm text-emerald-700">
                <span>{couponCode ? `Coupon (${couponCode})` : appliedRuleName ? `Promo (${appliedRuleName})` : 'Discount'}</span>
                <span className="font-mono-tabular font-semibold">-{formatStoreCurrency(discount, currencyCfg)}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                to="/cart"
                onClick={() => dispatch(closeCartDrawer())}
                className="flex items-center justify-center rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-[#0F1D3A] hover:bg-slate-100"
              >
                View Cart
              </Link>
              <button
                type="button"
                onClick={handleCheckoutClick}
                className="rounded-xl bg-[#1155EE] py-2.5 text-sm font-semibold text-white hover:bg-[#0B44CC]"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
