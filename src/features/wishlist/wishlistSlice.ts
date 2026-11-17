import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ProductItem } from '../../types/commerce';
import { apiRequest } from '../../services/api';
import {
  clearGuestWishlist,
  loadGuestWishlist,
  mergeWishlistIds,
  removeWishlistId,
  saveGuestWishlist,
  toggleWishlistId,
} from '../../lib/wishlist';

export interface WishlistState {
  productIds: string[];
  items: ProductItem[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialGuest = loadGuestWishlist();

const initialState: WishlistState = {
  productIds: initialGuest.productIds,
  items: initialGuest.productIds
    .map((id) => initialGuest.snapshots[id])
    .filter((item): item is ProductItem => Boolean(item)),
  loading: false,
  initialized: false,
  error: null,
};

function orderProductsByIds(ids: string[], products: ProductItem[], fallbackSnapshots: Record<string, ProductItem> = {}) {
  const map = new Map<string, ProductItem>();
  for (const p of products) {
    if (p && p.id) map.set(p.id, p);
  }
  const ordered: ProductItem[] = [];
  for (const id of ids) {
    const found = map.get(id) || fallbackSnapshots[id];
    if (found) ordered.push(found);
  }
  return ordered;
}

export const hydrateGuestWishlist = createAsyncThunk('wishlist/hydrateGuest', async () => {
  const guest = loadGuestWishlist();
  if (guest.productIds.length === 0) {
    return { productIds: [] as string[], items: [] as ProductItem[] };
  }
  const fallbackItems = orderProductsByIds(guest.productIds, [], guest.snapshots);
  try {
    const idsParam = encodeURIComponent(guest.productIds.slice(0, 48).join(','));
    const res = await apiRequest<{ ok: true; products: ProductItem[] }>(
      `/api/products?ids=${idsParam}&limit=48`,
    );
    const freshProducts = Array.isArray(res.products) ? res.products : [];
    if (freshProducts.length > 0) {
      const nextSnapshots: Record<string, ProductItem> = { ...guest.snapshots };
      for (const prod of freshProducts) {
        nextSnapshots[prod.id] = prod;
      }
      saveGuestWishlist({ productIds: guest.productIds, snapshots: nextSnapshots });
      return {
        productIds: guest.productIds,
        items: orderProductsByIds(guest.productIds, freshProducts, nextSnapshots),
      };
    }
  } catch {
    // Gracefully retain local cached snapshots when catalog API / DB is offline
  }
  return { productIds: guest.productIds, items: fallbackItems };
});

export const fetchWishlistAsync = createAsyncThunk(
  'wishlist/fetchServer',
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiRequest<{ ok: true; products: ProductItem[] }>('/api/account/wishlist');
      const products = Array.isArray(res.products) ? res.products : [];
      return products;
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Unable to load wishlist');
    }
  },
);

export const mergeGuestWishlistAsync = createAsyncThunk(
  'wishlist/mergeGuest',
  async (_, { rejectWithValue }) => {
    const guest = loadGuestWishlist();
    try {
      if (guest.productIds.length > 0) {
        const res = await apiRequest<{ ok: true; products: ProductItem[] }>('/api/account/wishlist/merge', {
          method: 'POST',
          body: JSON.stringify({ productIds: guest.productIds }),
        });
        clearGuestWishlist();
        return Array.isArray(res.products) ? res.products : [];
      }
      const res = await apiRequest<{ ok: true; products: ProductItem[] }>('/api/account/wishlist');
      return Array.isArray(res.products) ? res.products : [];
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Unable to sync wishlist');
    }
  },
);

export const toggleWishlistAsync = createAsyncThunk<
  { mode: 'guest' | 'server'; productId: string; wishlisted: boolean; product?: ProductItem },
  { isAuthenticated: boolean; productId: string; product?: ProductItem },
  { rejectValue: string }
>('wishlist/toggle', async (payload, { rejectWithValue }) => {
  if (!payload.isAuthenticated) {
    const current = loadGuestWishlist();
    const { nextIds, wishlisted } = toggleWishlistId(current.productIds, payload.productId);
    const nextSnapshots = { ...current.snapshots };
    if (wishlisted && payload.product) {
      nextSnapshots[payload.productId] = payload.product;
    } else if (!wishlisted) {
      delete nextSnapshots[payload.productId];
    }
    saveGuestWishlist({ productIds: nextIds, snapshots: nextSnapshots });
    return { mode: 'guest', productId: payload.productId, wishlisted, product: payload.product };
  }

  try {
    const res = await apiRequest<{ ok: true; wishlisted: boolean }>('/api/account/wishlist/toggle', {
      method: 'POST',
      body: JSON.stringify({ productId: payload.productId }),
    });
    return {
      mode: 'server',
      productId: payload.productId,
      wishlisted: Boolean(res.wishlisted),
      product: payload.product,
    };
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Wishlist update failed');
  }
});

export const removeWishlistAsync = createAsyncThunk<
  { mode: 'guest' | 'server'; productId: string },
  { isAuthenticated: boolean; productId: string },
  { rejectValue: string }
>('wishlist/remove', async (payload, { rejectWithValue }) => {
  if (!payload.isAuthenticated) {
    const current = loadGuestWishlist();
    const nextIds = removeWishlistId(current.productIds, payload.productId);
    const nextSnapshots = { ...current.snapshots };
    delete nextSnapshots[payload.productId];
    saveGuestWishlist({ productIds: nextIds, snapshots: nextSnapshots });
    return { mode: 'guest', productId: payload.productId };
  }

  try {
    await apiRequest(`/api/account/wishlist/${payload.productId}`, { method: 'DELETE' });
    return { mode: 'server', productId: payload.productId };
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Unable to remove item');
  }
});

export const clearWishlistAsync = createAsyncThunk<
  { mode: 'guest' | 'server' },
  { isAuthenticated: boolean },
  { rejectValue: string }
>('wishlist/clear', async (payload, { rejectWithValue }) => {
  if (!payload.isAuthenticated) {
    clearGuestWishlist();
    return { mode: 'guest' };
  }
  try {
    await apiRequest('/api/account/wishlist', { method: 'DELETE' });
    return { mode: 'server' };
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Unable to clear wishlist');
  }
});

// Track rollback snapshots for optimistic updates
const optimisticRollbacks = new Map<string, { productIds: string[]; items: ProductItem[] }>();

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState,
  reducers: {
    resetToGuestWishlist(state) {
      const guest = loadGuestWishlist();
      state.productIds = guest.productIds;
      state.items = orderProductsByIds(guest.productIds, [], guest.snapshots);
      state.loading = false;
      state.error = null;
    },
    setWishlistError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateGuestWishlist.pending, (state) => {
        state.loading = true;
      })
      .addCase(hydrateGuestWishlist.fulfilled, (state, action) => {
        state.productIds = action.payload.productIds;
        state.items = action.payload.items;
        state.loading = false;
        state.initialized = true;
      })
      .addCase(hydrateGuestWishlist.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
      })
      .addCase(fetchWishlistAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWishlistAsync.fulfilled, (state, action) => {
        state.items = action.payload;
        state.productIds = action.payload.map((p) => p.id);
        state.loading = false;
        state.initialized = true;
      })
      .addCase(fetchWishlistAsync.rejected, (state, action) => {
        state.loading = false;
        state.initialized = true;
        state.error = String(action.payload || 'Unable to load wishlist');
      })
      .addCase(mergeGuestWishlistAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(mergeGuestWishlistAsync.fulfilled, (state, action) => {
        state.items = action.payload;
        state.productIds = action.payload.map((p) => p.id);
        state.loading = false;
        state.initialized = true;
        state.error = null;
      })
      .addCase(mergeGuestWishlistAsync.rejected, (state) => {
        state.loading = false;
        state.initialized = true;
      })
      .addCase(toggleWishlistAsync.pending, (state, action) => {
        const { isAuthenticated, productId, product } = action.meta.arg;
        if (!isAuthenticated) return;
        optimisticRollbacks.set(action.meta.requestId, {
          productIds: state.productIds.slice(),
          items: state.items.slice(),
        });
        const { nextIds, wishlisted } = toggleWishlistId(state.productIds, productId);
        state.productIds = nextIds;
        if (!wishlisted) {
          state.items = state.items.filter((it) => it.id !== productId);
        } else if (product && !state.items.some((it) => it.id === productId)) {
          state.items = [...state.items, product];
        }
      })
      .addCase(toggleWishlistAsync.fulfilled, (state, action) => {
        optimisticRollbacks.delete(action.meta.requestId);
        const { productId, wishlisted, product } = action.payload;
        if (wishlisted) {
          state.productIds = mergeWishlistIds(state.productIds, [productId]);
          if (product && !state.items.some((it) => it.id === productId)) {
            state.items = [...state.items, product];
          }
        } else {
          state.productIds = removeWishlistId(state.productIds, productId);
          state.items = state.items.filter((it) => it.id !== productId);
        }
      })
      .addCase(toggleWishlistAsync.rejected, (state, action) => {
        const rollback = optimisticRollbacks.get(action.meta.requestId);
        if (rollback) {
          state.productIds = rollback.productIds;
          state.items = rollback.items;
          optimisticRollbacks.delete(action.meta.requestId);
        }
        state.error = String(action.payload || 'Wishlist update failed');
      })
      .addCase(removeWishlistAsync.pending, (state, action) => {
        const { isAuthenticated, productId } = action.meta.arg;
        if (!isAuthenticated) return;
        optimisticRollbacks.set(action.meta.requestId, {
          productIds: state.productIds.slice(),
          items: state.items.slice(),
        });
        state.productIds = removeWishlistId(state.productIds, productId);
        state.items = state.items.filter((it) => it.id !== productId);
      })
      .addCase(removeWishlistAsync.fulfilled, (state, action) => {
        optimisticRollbacks.delete(action.meta.requestId);
        state.productIds = removeWishlistId(state.productIds, action.payload.productId);
        state.items = state.items.filter((it) => it.id !== action.payload.productId);
      })
      .addCase(removeWishlistAsync.rejected, (state, action) => {
        const rollback = optimisticRollbacks.get(action.meta.requestId);
        if (rollback) {
          state.productIds = rollback.productIds;
          state.items = rollback.items;
          optimisticRollbacks.delete(action.meta.requestId);
        }
        state.error = String(action.payload || 'Remove failed');
      })
      .addCase(clearWishlistAsync.pending, (state, action) => {
        if (!action.meta.arg.isAuthenticated) return;
        optimisticRollbacks.set(action.meta.requestId, {
          productIds: state.productIds.slice(),
          items: state.items.slice(),
        });
        state.productIds = [];
        state.items = [];
      })
      .addCase(clearWishlistAsync.fulfilled, (state, action) => {
        optimisticRollbacks.delete(action.meta.requestId);
        state.productIds = [];
        state.items = [];
      })
      .addCase(clearWishlistAsync.rejected, (state, action) => {
        const rollback = optimisticRollbacks.get(action.meta.requestId);
        if (rollback) {
          state.productIds = rollback.productIds;
          state.items = rollback.items;
          optimisticRollbacks.delete(action.meta.requestId);
        }
        state.error = String(action.payload || 'Unable to clear wishlist');
      });
  },
});

export const { resetToGuestWishlist, setWishlistError } = wishlistSlice.actions;

export const selectWishlistIds = (state: { wishlist: WishlistState }) => state.wishlist.productIds;
export const selectWishlistItems = (state: { wishlist: WishlistState }) => state.wishlist.items;
export const selectWishlistCount = (state: { wishlist: WishlistState }) => state.wishlist.productIds.length;
export const selectIsWishlisted = (state: { wishlist: WishlistState }, productId: string) =>
  Boolean(productId) && state.wishlist.productIds.includes(productId);
export const selectWishlistLoading = (state: { wishlist: WishlistState }) => state.wishlist.loading;

export default wishlistSlice.reducer;
