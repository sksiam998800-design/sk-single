import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { apiRequest } from '../../services/api';
import type {
  BannerRecord,
  BrandItem,
  CategoryItem,
  HomepageConfigData,
  NavigationMenuConfig,
  PromotionalAdData,
} from '../../types/commerce';

export interface StorefrontNavigationPayload {
  categories: CategoryItem[];
  brands: BrandItem[];
  settings: Partial<HomepageConfigData> | null;
  megaMenus?: NavigationMenuConfig[];
  banners?: BannerRecord[];
  promotionalAds?: PromotionalAdData[];
}

export interface StorefrontState {
  categories: CategoryItem[];
  brands: BrandItem[];
  settings: Partial<HomepageConfigData> | null;
  megaMenus: NavigationMenuConfig[];
  banners: BannerRecord[];
  promotionalAds: PromotionalAdData[];
  loaded: boolean;
  loading: boolean;
}

const initialState: StorefrontState = {
  categories: [],
  brands: [],
  settings: null,
  megaMenus: [],
  banners: [],
  promotionalAds: [],
  loaded: false,
  loading: false,
};

export const fetchStorefrontNavigation = createAsyncThunk('storefront/fetchNavigation', async () => {
  const res = await apiRequest<{ ok: true } & StorefrontNavigationPayload>('/api/storefront/navigation');
  return res;
});

const storefrontSlice = createSlice({
  name: 'storefront',
  initialState,
  reducers: {
    setStorefrontMetadata(state, action: PayloadAction<Partial<StorefrontNavigationPayload>>) {
      if (action.payload.categories) state.categories = action.payload.categories;
      if (action.payload.brands) state.brands = action.payload.brands;
      if (action.payload.settings !== undefined) state.settings = action.payload.settings;
      if (action.payload.megaMenus) state.megaMenus = action.payload.megaMenus;
      if (action.payload.banners) state.banners = action.payload.banners;
      if (action.payload.promotionalAds) state.promotionalAds = action.payload.promotionalAds;
      state.loaded = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStorefrontNavigation.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchStorefrontNavigation.fulfilled, (state, action) => {
        state.categories = action.payload.categories || [];
        state.brands = action.payload.brands || [];
        state.settings = action.payload.settings || null;
        if (action.payload.megaMenus) state.megaMenus = action.payload.megaMenus;
        if (action.payload.banners) state.banners = action.payload.banners;
        if (action.payload.promotionalAds) state.promotionalAds = action.payload.promotionalAds;
        state.loaded = true;
        state.loading = false;
      })
      .addCase(fetchStorefrontNavigation.rejected, (state) => {
        state.loaded = true;
        state.loading = false;
      });
  },
});

export const { setStorefrontMetadata } = storefrontSlice.actions;
export default storefrontSlice.reducer;
