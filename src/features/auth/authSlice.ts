import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { UserProfile } from '../../types/commerce';
import { ApiError, apiRequest, clearAuthToken, setAuthToken } from '../../services/api';
import { mergeGuestCartOnLogin, resetToGuestCart } from '../cart/cartSlice';
import { mergeGuestWishlistAsync, resetToGuestWishlist } from '../wishlist/wishlistSlice';

export type AuthModalTab = 'login' | 'forgot';

export interface AuthRejectPayload {
  message: string;
  code?: string;
  details?: {
    unverified?: boolean;
    emailConfigured?: boolean;
  };
}

export interface RegisterFulfilledPayload {
  user: UserProfile;
  requiresVerification: boolean;
  message?: string;
}

export interface AuthState {
  user: UserProfile | null;
  initialized: boolean;
  loading: boolean;
  modalOpen: boolean;
  modalTab: AuthModalTab;
  returnUrl: string | null;
  authNotice: string | null;
  authErrorCode: string | null;
}

const initialState: AuthState = {
  user: null,
  initialized: false,
  loading: false,
  modalOpen: false,
  modalTab: 'login',
  returnUrl: null,
  authNotice: null,
  authErrorCode: null,
};

export const fetchCurrentUser = createAsyncThunk('auth/me', async () => {
  try {
    const res = await apiRequest<{ ok: true; user: UserProfile }>('/api/auth/me');
    return { user: res.user, errorCode: null as string | null };
  } catch (err) {
    const code = err instanceof ApiError ? err.code : 'NETWORK_ERROR';
    if (err instanceof ApiError && err.status === 401) {
      clearAuthToken();
    }
    return { user: null, errorCode: code };
  }
});

export const loginUser = createAsyncThunk<
  UserProfile,
  { email: string; password: string },
  { rejectValue: AuthRejectPayload }
>('auth/login', async (payload, { dispatch, rejectWithValue }) => {
  try {
    const res = await apiRequest<{ ok: true; user: UserProfile; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) setAuthToken(res.token);
    await Promise.all([dispatch(mergeGuestCartOnLogin()), dispatch(mergeGuestWishlistAsync())]);
    return res.user;
  } catch (err) {
    if (err instanceof ApiError) {
      return rejectWithValue({ message: err.message, code: err.code });
    }
    return rejectWithValue({ message: err instanceof Error ? err.message : 'Login failed' });
  }
});

export const registerUser = createAsyncThunk<
  RegisterFulfilledPayload,
  { name: string; email: string; phone?: string; password: string },
  { rejectValue: AuthRejectPayload }
>('auth/register', async (payload, { dispatch, rejectWithValue }) => {
  try {
    const res = await apiRequest<{
      ok: true;
      user: UserProfile;
      token?: string;
      requiresVerification?: boolean;
      message?: string;
    }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const requiresVerification = Boolean(res.requiresVerification);
    if (res.token && !requiresVerification) {
      setAuthToken(res.token);
      await Promise.all([dispatch(mergeGuestCartOnLogin()), dispatch(mergeGuestWishlistAsync())]);
    }
    return {
      user: res.user,
      requiresVerification,
      message: res.message,
    };
  } catch (err) {
    if (err instanceof ApiError) {
      return rejectWithValue({
        message: err.message,
        code: err.code,
        details: (err.details as AuthRejectPayload['details']) || undefined,
      });
    }
    return rejectWithValue({ message: err instanceof Error ? err.message : 'Registration failed' });
  }
});

export const completeOAuthSession = createAsyncThunk(
  'auth/oauthComplete',
  async (payload: { user: UserProfile; token?: string }, { dispatch }) => {
    if (payload.token) {
      setAuthToken(payload.token);
    }
    await Promise.all([dispatch(mergeGuestCartOnLogin()), dispatch(mergeGuestWishlistAsync())]);
    return payload.user;
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  clearAuthToken();
  await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
  dispatch(resetToGuestCart());
  dispatch(resetToGuestWishlist());
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    openAuthModal(
      state,
      action: PayloadAction<{ tab?: AuthModalTab; returnUrl?: string | null; notice?: string | null } | undefined>,
    ) {
      state.modalOpen = true;
      state.modalTab = action.payload?.tab === 'forgot' ? 'forgot' : 'login';
      state.returnUrl = action.payload?.returnUrl ?? null;
      state.authNotice = action.payload?.notice ?? null;
    },
    closeAuthModal(state) {
      state.modalOpen = false;
      state.authNotice = null;
    },
    setAuthModalTab(state, action: PayloadAction<AuthModalTab>) {
      state.modalTab = action.payload;
    },
    setUserProfile(state, action: PayloadAction<UserProfile | null>) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.authErrorCode = action.payload.errorCode;
        state.initialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.authErrorCode = 'NETWORK_ERROR';
        state.initialized = true;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.authErrorCode = null;
        state.modalOpen = false;
        state.authNotice = null;
      })
      .addCase(loginUser.rejected, (state) => {
        state.loading = false;
      })
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        if (!action.payload.requiresVerification) {
          state.user = action.payload.user;
          state.authErrorCode = null;
        }
        state.modalOpen = false;
        state.authNotice = null;
      })
      .addCase(registerUser.rejected, (state) => {
        state.loading = false;
      })
      .addCase(completeOAuthSession.fulfilled, (state, action) => {
        state.user = action.payload;
        state.authErrorCode = null;
        state.modalOpen = false;
        state.authNotice = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { openAuthModal, closeAuthModal, setAuthModalTab, setUserProfile } = authSlice.actions;

export default authSlice.reducer;
