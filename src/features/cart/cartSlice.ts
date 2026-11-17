import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CartLine } from '../../types/commerce';
import { apiRequest } from '../../services/api';
import { mergeCartLines } from '../../lib/pricingEngine';

const GUEST_CART_KEY = 'novara_guest_cart_v1';

function loadGuestCart(): CartLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((item) => ({ ...item, selected: item?.selected !== false }))
      : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: CartLine[]) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // Ignore storage quota issues
  }
}

function clearGuestCartStorage() {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
  } catch {
    // Ignore
  }
}

export interface CartState {
  items: CartLine[];
  couponCode: string | null;
  couponMessage: string | null;
  appliedRuleName: string | null;
  subtotal: number;
  discount: number;
  loading: boolean;
  drawerOpen: boolean;
  error: string | null;
}

function recomputeGuestTotals(items: CartLine[]) {
  return items
    .filter((i) => i.selected !== false)
    .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

const initialItems = loadGuestCart();

const initialState: CartState = {
  items: initialItems,
  couponCode: null,
  couponMessage: null,
  appliedRuleName: null,
  subtotal: recomputeGuestTotals(initialItems),
  discount: 0,
  loading: false,
  drawerOpen: false,
  error: null,
};

interface ServerCartResponse {
  ok: true;
  cart: {
    items: CartLine[];
    couponCode: string | null;
    couponMessage?: string | null;
    appliedRuleName?: string | null;
    subtotal: number;
    discount: number;
  };
}

function applyServerCartState(state: CartState, cart: ServerCartResponse['cart']) {
  state.items = (cart.items ?? []).map((item) => ({ ...item, selected: item.selected !== false }));
  state.couponCode = cart.couponCode ?? null;
  state.couponMessage = cart.couponMessage ?? null;
  state.appliedRuleName = cart.appliedRuleName ?? null;
  state.subtotal = cart.subtotal ?? 0;
  state.discount = cart.discount ?? 0;
}

export const fetchServerCart = createAsyncThunk('cart/fetchServer', async () => {
  const res = await apiRequest<ServerCartResponse>('/api/account/cart');
  return res.cart;
});

export const mergeGuestCartOnLogin = createAsyncThunk('cart/mergeGuest', async () => {
  const guestItems = loadGuestCart();
  if (guestItems.length === 0) {
    const res = await apiRequest<ServerCartResponse>('/api/account/cart');
    return res.cart;
  }
  const res = await apiRequest<ServerCartResponse>('/api/account/cart/merge', {
    method: 'POST',
    body: JSON.stringify({
      items: guestItems.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || null,
        quantity: i.quantity,
      })),
    }),
  });
  clearGuestCartStorage();
  return res.cart;
});

export const addToCartAsync = createAsyncThunk(
  'cart/addItem',
  async (
    payload: { item: CartLine; isAuthenticated: boolean },
    { rejectWithValue },
  ) => {
    if (!payload.isAuthenticated) {
      return { mode: 'guest' as const, item: { ...payload.item, selected: true } };
    }
    try {
      const res = await apiRequest<ServerCartResponse>('/api/account/cart/items', {
        method: 'POST',
        body: JSON.stringify({
          productId: payload.item.productId,
          variantId: payload.item.variantId || null,
          quantity: payload.item.quantity,
        }),
      });
      return { mode: 'server' as const, cart: res.cart };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Unable to add item to cart');
    }
  },
);

export const updateCartQtyAsync = createAsyncThunk(
  'cart/updateQty',
  async (
    payload: { productId: string; variantId?: string | null; quantity: number; isAuthenticated: boolean },
    { rejectWithValue },
  ) => {
    if (!payload.isAuthenticated) {
      return {
        mode: 'guest' as const,
        productId: payload.productId,
        variantId: payload.variantId || null,
        quantity: payload.quantity,
      };
    }
    try {
      const res = await apiRequest<ServerCartResponse>('/api/account/cart/items', {
        method: 'PATCH',
        body: JSON.stringify({
          productId: payload.productId,
          variantId: payload.variantId || null,
          quantity: payload.quantity,
        }),
      });
      return { mode: 'server' as const, cart: res.cart };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update cart quantity');
    }
  },
);

export const toggleCartItemSelectionAsync = createAsyncThunk(
  'cart/toggleSelection',
  async (
    payload: {
      productId?: string;
      variantId?: string | null;
      selected: boolean;
      selectAll?: boolean;
      isAuthenticated: boolean;
    },
    { rejectWithValue },
  ) => {
    if (!payload.isAuthenticated) {
      return {
        mode: 'guest' as const,
        productId: payload.productId,
        variantId: payload.variantId || null,
        selected: payload.selected,
        selectAll: Boolean(payload.selectAll),
      };
    }
    try {
      const res = await apiRequest<ServerCartResponse>('/api/account/cart/selection', {
        method: 'PATCH',
        body: JSON.stringify({
          productId: payload.productId,
          variantId: payload.variantId || null,
          selected: payload.selected,
          selectAll: payload.selectAll,
        }),
      });
      return { mode: 'server' as const, cart: res.cart };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to update item selection');
    }
  },
);

export const clearCartAsync = createAsyncThunk(
  'cart/clearCart',
  async (payload: { isAuthenticated: boolean }, { rejectWithValue }) => {
    if (!payload.isAuthenticated) {
      clearGuestCartStorage();
      return { mode: 'guest' as const };
    }
    try {
      const res = await apiRequest<ServerCartResponse>('/api/account/cart', {
        method: 'DELETE',
      });
      return { mode: 'server' as const, cart: res.cart };
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Unable to clear cart');
    }
  },
);

export const applyCouponAsync = createAsyncThunk(
  'cart/applyCoupon',
  async (code: string, { rejectWithValue }) => {
    try {
      const res = await apiRequest<ServerCartResponse>('/api/account/cart/coupon', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      return res.cart;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Invalid or ineligible coupon');
    }
  },
);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    openCartDrawer(state) {
      state.drawerOpen = true;
    },
    closeCartDrawer(state) {
      state.drawerOpen = false;
    },
    clearCartAfterOrder(state) {
      const remaining = state.items.filter((i) => i.selected === false);
      state.items = remaining;
      state.couponCode = null;
      state.couponMessage = null;
      state.appliedRuleName = null;
      state.subtotal = recomputeGuestTotals(remaining);
      state.discount = 0;
      state.error = null;
      if (remaining.length === 0) {
        clearGuestCartStorage();
      } else {
        saveGuestCart(remaining);
      }
    },
    resetToGuestCart(state) {
      const items = loadGuestCart();
      state.items = items;
      state.couponCode = null;
      state.couponMessage = null;
      state.appliedRuleName = null;
      state.subtotal = recomputeGuestTotals(items);
      state.discount = 0;
    },
    setCartError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServerCart.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchServerCart.fulfilled, (state, action) => {
        if (action.payload) {
          applyServerCartState(state, action.payload);
        }
        state.loading = false;
      })
      .addCase(fetchServerCart.rejected, (state) => {
        state.loading = false;
      })
      .addCase(mergeGuestCartOnLogin.fulfilled, (state, action) => {
        if (action.payload) {
          applyServerCartState(state, action.payload);
        }
        state.loading = false;
      })
      .addCase(addToCartAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCartAsync.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.mode === 'server') {
          if (action.payload.cart) {
            applyServerCartState(state, action.payload.cart);
          }
        } else {
          const incoming = action.payload.item;
          const merged = mergeCartLines(
            state.items.map((x) => ({ ...x, maxStock: x.availableStock })),
            [{ ...incoming, maxStock: incoming.availableStock, selected: true }],
          ).map((item) => ({ ...item, selected: item.selected !== false }));
          state.items = merged;
          state.subtotal = recomputeGuestTotals(merged);
          saveGuestCart(merged);
        }
      })
      .addCase(addToCartAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = String(action.payload || 'Unable to add item');
      })
      .addCase(updateCartQtyAsync.fulfilled, (state, action) => {
        if (action.payload.mode === 'server') {
          if (action.payload.cart) {
            applyServerCartState(state, action.payload.cart);
          }
        } else {
          const { productId, variantId, quantity } = action.payload;
          const vKey = variantId || null;
          if (quantity <= 0) {
            state.items = state.items.filter(
              (i) => !(i.productId === productId && (i.variantId || null) === vKey),
            );
          } else {
            state.items = state.items.map((i) =>
              i.productId === productId && (i.variantId || null) === vKey
                ? { ...i, quantity: Math.min(quantity, Math.max(1, i.availableStock)) }
                : i,
            );
          }
          state.subtotal = recomputeGuestTotals(state.items);
          saveGuestCart(state.items);
        }
      })
      .addCase(toggleCartItemSelectionAsync.fulfilled, (state, action) => {
        if (action.payload.mode === 'server') {
          if (action.payload.cart) {
            applyServerCartState(state, action.payload.cart);
          }
        } else {
          const { productId, variantId, selected, selectAll } = action.payload;
          if (selectAll) {
            state.items = state.items.map((i) => ({ ...i, selected }));
          } else if (productId) {
            const vKey = variantId || null;
            state.items = state.items.map((i) =>
              i.productId === productId && (i.variantId || null) === vKey
                ? { ...i, selected }
                : i,
            );
          }
          state.subtotal = recomputeGuestTotals(state.items);
          saveGuestCart(state.items);
        }
      })
      .addCase(clearCartAsync.fulfilled, (state, action) => {
        if (action.payload.mode === 'server' && action.payload.cart) {
          applyServerCartState(state, action.payload.cart);
        } else {
          state.items = [];
          state.couponCode = null;
          state.couponMessage = null;
          state.appliedRuleName = null;
          state.subtotal = 0;
          state.discount = 0;
          clearGuestCartStorage();
        }
        state.error = null;
      })
      .addCase(applyCouponAsync.fulfilled, (state, action) => {
        if (action.payload) {
          applyServerCartState(state, action.payload);
        }
        state.error = null;
      })
      .addCase(applyCouponAsync.rejected, (state, action) => {
        state.error = String(action.payload || 'Coupon error');
      });
  },
});

export const {
  openCartDrawer,
  closeCartDrawer,
  clearCartAfterOrder,
  resetToGuestCart,
  setCartError,
} = cartSlice.actions;

// Cart badge MUST reflect unique cart lines, not total item quantity
export const selectCartLineCount = (state: { cart: CartState }) => state.cart.items.length;

export default cartSlice.reducer;

