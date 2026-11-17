import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  variant: ToastVariant;
  title?: string;
  message: string;
  durationMs: number;
  createdAt: number;
}

interface ToastState {
  toasts: ToastMessage[];
}

const initialState: ToastState = {
  toasts: [],
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast(
      state,
      action: PayloadAction<{
        variant: ToastVariant;
        message: string;
        title?: string;
        durationMs?: number;
      }>,
    ) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const durationMs = action.payload.durationMs ?? 4000;
      // Deduplicate identical active toast messages
      const filtered = state.toasts.filter(
        (t) => !(t.message === action.payload.message && t.variant === action.payload.variant),
      );
      const next: ToastMessage = {
        id,
        variant: action.payload.variant,
        title: action.payload.title,
        message: action.payload.message,
        durationMs,
        createdAt: Date.now(),
      };
      // Cap at 4 visible notifications
      state.toasts = [...filtered, next].slice(-4);
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { showToast, dismissToast } = toastSlice.actions;
export default toastSlice.reducer;
