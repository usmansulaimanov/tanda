import React, { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () => {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua);
};

const isInStandaloneMode = () =>
  'standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const isMobile = () => window.innerWidth < 768;

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Don't show if already installed or not mobile
    if (isInStandaloneMode() || !isMobile()) return;

    // Don't show if user already dismissed this session
    if (sessionStorage.getItem('pwa_dismissed')) return;

    if (isIOS()) {
      // iOS: show manual guide after short delay
      const timer = setTimeout(() => setShowIOSGuide(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android Chrome: listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pwa_dismissed', '1');
    setShowBanner(false);
    setShowIOSGuide(false);
  };

  // Android install banner
  if (showBanner && deferredPrompt) {
    return (
      <div className="fixed bottom-[calc(56px+max(env(safe-area-inset-bottom,0px),8px))] left-0 right-0 z-[9999] md:hidden">
        <div className="m-3 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <img
              src="/tanda-pwa-icon.png"
              alt="tanda"
              className="w-12 h-12 rounded-xl flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">tanda</p>
              <p className="text-xs text-slate-500 mt-0.5">Телефонға орнату</p>
            </div>
            <button
              onClick={handleInstall}
              className="flex-shrink-0 bg-[#0057A8] text-white text-sm font-medium px-4 py-2 rounded-xl active:opacity-80 transition-opacity"
            >
              Орнату
            </button>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-slate-400 p-1 -mr-1 active:opacity-60"
              aria-label="Жабу"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Safari guide
  if (showIOSGuide) {
    return (
      <div className="fixed bottom-[calc(56px+max(env(safe-area-inset-bottom,0px),8px))] left-0 right-0 z-[9999] md:hidden">
        <div className="m-3 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-start gap-3 p-4">
            <img
              src="/tanda-pwa-icon.png"
              alt="tanda"
              className="w-12 h-12 rounded-xl flex-shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-900 text-sm">Телефонға орнату</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Safari-де төменгі панелдегі{' '}
                <span className="font-medium text-slate-700">«Бөлісу»</span>{' '}
                батырмасын басып,{' '}
                <span className="font-medium text-slate-700">«Негізгі экранға қосу»</span>{' '}
                таңдаңыз.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-slate-400 p-1 -mr-1 -mt-1 active:opacity-60"
              aria-label="Жабу"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

// Sidebar card version — used inside AppSidebarDrawer
export const PWAInstallSidebarCard: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode() || !isMobile()) return;

    if (isIOS()) {
      setReady(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setReady(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS()) {
      // Nothing to do; user sees the guide inline
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setReady(false);
  };

  if (!ready) return null;

  return (
    <div className="mx-4 mb-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
        <div className="flex items-center gap-3">
          <img
            src="/tanda-pwa-icon.png"
            alt="tanda"
            className="w-10 h-10 rounded-xl flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">tanda</p>
            {isIOS() ? (
              <p className="text-xs text-blue-600 leading-tight mt-0.5">
                «Бөлісу» → «Негізгі экранға қосу»
              </p>
            ) : (
              <button
                onClick={handleInstall}
                className="flex items-center gap-1 mt-1 text-xs font-medium text-blue-700 active:opacity-70"
              >
                <Download size={12} />
                Телефонға орнату
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
