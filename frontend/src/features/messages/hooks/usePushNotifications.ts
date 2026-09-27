import { useState, useEffect, useCallback } from 'react';
import { pushApi } from '../../../shared/api/push.api';
import { useAuthStore } from '../../../store/useAuthStore';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);

  // Check support and current subscription status on mount + auto-sync with backend
  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);

      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        try {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            setIsSubscribed(true);
            // Ensure subscription is synced with backend for this active user session
            const json = sub.toJSON();
            if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
              await pushApi.subscribe({
                endpoint: json.endpoint,
                keys: {
                  p256dh: json.keys.p256dh,
                  auth: json.keys.auth,
                },
                userAgent: navigator.userAgent,
              });
            }
          } else {
            setIsSubscribed(false);
          }
        } catch (err) {
          console.warn('Service Worker subscription sync failed:', err);
        }
      }).catch((err) => {
        console.warn('Service Worker registration failed:', err);
      });
    }
  }, [user?.id]);

  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('Браузер push-уведомлениелерді қолдамайды');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        setError('Хабарламаларға рұқсат берілмеді');
        setIsLoading(false);
        return false;
      }

      // 2. Fetch VAPID public key
      const { publicKey } = await pushApi.getPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(publicKey);

      // 3. Register SW & Subscribe via PushManager
      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        try {
          await subscription.unsubscribe();
        } catch (e) {
          console.warn('Unsubscribe previous subscription before renewal:', e);
        }
      }

      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });

      // 4. Send subscription to backend
      const json = subscription.toJSON();
      if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
        await pushApi.subscribe({
          endpoint: json.endpoint,
          keys: {
            p256dh: json.keys.p256dh,
            auth: json.keys.auth,
          },
          userAgent: navigator.userAgent,
        });
        setIsSubscribed(true);
        setIsLoading(false);
        return true;
      } else {
        throw new Error('Push subscription keys missing');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Push-уведомление қосылмады';
      setError(msg);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return false;
    setIsLoading(true);
    setError(null);

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await pushApi.unsubscribe(endpoint);
      }

      setIsSubscribed(false);
      setIsLoading(false);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Жазылуды тоқтату кезінде қате шықты';
      setError(msg);
      setIsLoading(false);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
