import React, { useEffect } from 'react';
import { useNewsStore } from '../../store/useNewsStore';
import { useMessageStore } from '../../store/useMessageStore';

export const NewsNotificationRunner: React.FC = () => {
  const { checkAndTriggerScheduledNewsNotifications } = useNewsStore();

  useEffect(() => {
    // Initial check on mount
    checkAndTriggerScheduledNewsNotifications();

    // Check frequently every 3 seconds for instant response when the minute/second ticks
    const interval = setInterval(() => {
      checkAndTriggerScheduledNewsNotifications();
    }, 3000);

    // Cross-tab synchronization via localStorage events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('tanda_news_articles') || e.key?.includes('tanda_admin_messages')) {
        try {
          useNewsStore.persist?.rehydrate();
          useMessageStore.persist?.rehydrate();
          checkAndTriggerScheduledNewsNotifications();
        } catch {}
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAndTriggerScheduledNewsNotifications]);

  return null;
};
