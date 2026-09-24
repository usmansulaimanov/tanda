import { create } from 'zustand';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastState {
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, type = 'success') => {
    set((state) => {
      // Prevent duplicate identical messages currently displayed on screen
      if (state.toasts.some((t) => t.message === message)) {
        return state;
      }
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      setTimeout(() => {
        set((s) => ({
          toasts: s.toasts.filter((t) => t.id !== id),
        }));
      }, 3500);
      // Keep at most 4 latest toasts to prevent screen overflow
      const nextToasts = [...state.toasts, { id, type, message }].slice(-4);
      return { toasts: nextToasts };
    });
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
