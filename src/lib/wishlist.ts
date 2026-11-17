import type { ProductItem } from '../types/commerce';

export const GUEST_WISHLIST_STORAGE_KEY = 'novara_guest_wishlist_v1';

export interface GuestWishlistState {
  productIds: string[];
  snapshots: Record<string, ProductItem>;
}

function isValidProductId(id: string): boolean {
  return typeof id === 'string' && id.trim().length > 0;
}

export function addWishlistId(list: string[], productId: string): string[] {
  if (!isValidProductId(productId)) return list;
  if (list.includes(productId)) return list;
  return [...list, productId];
}

export function removeWishlistId(list: string[], productId: string): string[] {
  if (!isValidProductId(productId)) return list;
  return list.filter((id) => id !== productId);
}

export function toggleWishlistId(list: string[], productId: string): {
  nextIds: string[];
  wishlisted: boolean;
} {
  if (!isValidProductId(productId)) {
    return { nextIds: list, wishlisted: false };
  }
  const exists = list.includes(productId);
  if (exists) {
    return { nextIds: removeWishlistId(list, productId), wishlisted: false };
  }
  return { nextIds: addWishlistId(list, productId), wishlisted: true };
}

export function mergeWishlistIds(existingIds: string[], guestIds: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const id of [...existingIds, ...guestIds]) {
    if (isValidProductId(id) && !seen.has(id)) {
      seen.add(id);
      merged.push(id);
    }
  }
  return merged;
}

export function loadGuestWishlist(): GuestWishlistState {
  if (typeof window === 'undefined') {
    return { productIds: [], snapshots: {} };
  }
  try {
    const raw = window.localStorage.getItem(GUEST_WISHLIST_STORAGE_KEY);
    if (!raw) return { productIds: [], snapshots: {} };
    const parsed = JSON.parse(raw) as Partial<GuestWishlistState> | string[];
    if (Array.isArray(parsed)) {
      const ids = mergeWishlistIds([], parsed.filter((id): id is string => typeof id === 'string'));
      return { productIds: ids, snapshots: {} };
    }
    const ids = Array.isArray(parsed.productIds)
      ? mergeWishlistIds([], parsed.productIds.filter((id): id is string => typeof id === 'string'))
      : [];
    const snapshots: Record<string, ProductItem> = {};
    if (parsed.snapshots && typeof parsed.snapshots === 'object') {
      for (const id of ids) {
        const snap = parsed.snapshots[id];
        if (snap && typeof snap === 'object' && snap.id === id) {
          snapshots[id] = snap;
        }
      }
    }
    return { productIds: ids, snapshots };
  } catch {
    return { productIds: [], snapshots: {} };
  }
}

export function saveGuestWishlist(state: GuestWishlistState): void {
  if (typeof window === 'undefined') return;
  try {
    const uniqueIds = mergeWishlistIds([], state.productIds);
    const filteredSnapshots: Record<string, ProductItem> = {};
    for (const id of uniqueIds) {
      if (state.snapshots[id]) {
        filteredSnapshots[id] = state.snapshots[id];
      }
    }
    window.localStorage.setItem(
      GUEST_WISHLIST_STORAGE_KEY,
      JSON.stringify({ productIds: uniqueIds, snapshots: filteredSnapshots }),
    );
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function clearGuestWishlist(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(GUEST_WISHLIST_STORAGE_KEY);
  } catch {
    // Ignore storage errors cleanly
  }
}

export function extractProductSpecBadges(product: ProductItem, maxCount = 2): string[] {
  const badges: string[] = [];
  if (Array.isArray(product.attributeValues)) {
    for (const attr of product.attributeValues) {
      if (attr.isVisibleToCustomers === false) continue;
      const val = String(attr.value ?? '').trim();
      if (!val || val.toLowerCase() === 'false') continue;
      const unit = attr.unit ? ` ${attr.unit}` : '';
      const formatted = val.toLowerCase() === 'true' ? attr.name || attr.code : `${val}${unit}`;
      if (formatted && !badges.includes(formatted)) {
        badges.push(formatted);
      }
      if (badges.length >= maxCount) return badges;
    }
  }
  if (Array.isArray(product.specifications)) {
    for (const spec of product.specifications) {
      const val = String(spec.value ?? '').trim();
      if (!val) continue;
      if (!badges.includes(val)) {
        badges.push(val);
      }
      if (badges.length >= maxCount) return badges;
    }
  }
  if (Array.isArray(product.features)) {
    for (const feat of product.features) {
      const val = String(feat ?? '').trim();
      if (val && val.length <= 36 && !badges.includes(val)) {
        badges.push(val);
      }
      if (badges.length >= maxCount) return badges;
    }
  }
  return badges;
}
