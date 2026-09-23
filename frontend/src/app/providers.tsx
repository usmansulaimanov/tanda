import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from '../components/ui/Toast';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { authApi } from '../shared/api/auth.api';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes cache
      retry: (failureCount, error: any) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
  },
});

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    // Perform silent authentication initialization on app launch
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('tanda_token');
        if (token) {
          await restoreSession();
        } else {
          // Attempt silent refresh via httpOnly cookie
          const data = await authApi.refresh();
          if (data?.token && data?.user) {
            localStorage.setItem('tanda_token', data.token);
            useAuthStore.setState({
              user: data.user,
              role: data.user.role as 'admin' | 'client',
              isAuthenticated: true,
            });
          }
        }
      } catch {
        // Silent refresh failure is normal for unauthenticated visitors
      } finally {
        useAuthStore.setState({ isAuthInitialized: true });
      }
    };

    initAuth();
  }, [restoreSession]);

  useEffect(() => {
    // Realtime check if currently authenticated user has been blocked
    const checkBlocked = () => {
      const authUser = useAuthStore.getState().user;
      if (authUser && authUser.isActive === false) {
        useAuthStore.getState().logout();
        useToastStore.getState().showToast('Сіздің аккаунтыңыз бұғатталды. Жүйеден шығарылдыңыз.', 'error');
      }
    };

    window.addEventListener('tanda:user-status-changed', checkBlocked);

    return () => {
      window.removeEventListener('tanda:user-status-changed', checkBlocked);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ToastContainer />
    </QueryClientProvider>
  );
};
