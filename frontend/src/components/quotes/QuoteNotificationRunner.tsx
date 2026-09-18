import React, { useEffect, useRef } from 'react';
import { useQuoteStore } from '../../store/useQuoteStore';

export const QuoteNotificationRunner: React.FC = () => {
  const { checkAndTriggerScheduledQuotes, settings } = useQuoteStore();
  const hasRequestedPermission = useRef(false);

  // Request browser Notification permission on initial user interaction if push is enabled
  useEffect(() => {
    if (
      settings.isEnabled &&
      settings.browserPushEnabled &&
      !hasRequestedPermission.current &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      const handleUserClick = () => {
        if (!hasRequestedPermission.current) {
          hasRequestedPermission.current = true;
          try {
            Notification.requestPermission().catch(() => {});
          } catch {}
          window.removeEventListener('click', handleUserClick);
        }
      };

      window.addEventListener('click', handleUserClick, { once: true });
      return () => window.removeEventListener('click', handleUserClick);
    }
  }, [settings.isEnabled, settings.browserPushEnabled]);

  // Periodic schedule checker
  useEffect(() => {
    // Initial check
    checkAndTriggerScheduledQuotes();

    // Check every 25 seconds for precise time match
    const interval = setInterval(() => {
      checkAndTriggerScheduledQuotes();
    }, 25000);

    return () => clearInterval(interval);
  }, [checkAndTriggerScheduledQuotes, settings.isEnabled, settings.scheduledTimes]);

  return null;
};
