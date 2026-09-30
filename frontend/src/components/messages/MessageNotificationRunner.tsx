import React, { useEffect, useRef } from 'react';
import { useMessageStore } from '../../store/useMessageStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePushNotifications } from '../../features/messages/hooks/usePushNotifications';

export const MessageNotificationRunner: React.FC = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { fetchMyMessages } = useMessageStore();
  const { isSupported, permission, subscribe } = usePushNotifications();
  const hasRequestedPermission = useRef(false);

  // Initial fetch and user changes
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      useMessageStore.setState({ isInitialized: false, knownMessageIds: [], activePopupMessage: null });
      fetchMyMessages().catch(() => {});
    } else {
      useMessageStore.setState({ messages: [], activePopupMessage: null, knownMessageIds: [], isInitialized: false });
    }
  }, [isAuthenticated, user?.id, fetchMyMessages]);

  // Periodic polling every 30 seconds
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    const interval = setInterval(() => {
      fetchMyMessages().catch(() => {});
    }, 10000);

    const handleFocus = () => {
      fetchMyMessages().catch(() => {});
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [isAuthenticated, user?.id, fetchMyMessages]);

  // Auto-prompt browser notification permission on first user click if supported and default
  useEffect(() => {
    if (
      isAuthenticated &&
      user?.id &&
      isSupported &&
      permission === 'default' &&
      !hasRequestedPermission.current &&
      typeof window !== 'undefined'
    ) {
      const handleUserClick = () => {
        if (!hasRequestedPermission.current) {
          hasRequestedPermission.current = true;
          subscribe().catch(() => {});
          window.removeEventListener('click', handleUserClick);
        }
      };

      window.addEventListener('click', handleUserClick, { once: true });
      return () => window.removeEventListener('click', handleUserClick);
    }
  }, [isAuthenticated, user?.id, isSupported, permission, subscribe]);

  return null;
};
