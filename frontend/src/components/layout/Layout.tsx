import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AudioPlayerBar } from '../player/AudioPlayerBar';
import { DailyLimitModal } from '../player/DailyLimitModal';
import { ToastContainer } from '../ui/Toast';
import { AppSidebarDrawer } from './AppSidebarDrawer';
import { QuoteNotificationPopup } from '../quotes/QuoteNotificationPopup';
import { QuoteNotificationRunner } from '../quotes/QuoteNotificationRunner';
import { NewsNotificationRunner } from '../news/NewsNotificationRunner';
import { MessageNotificationRunner } from '../messages/MessageNotificationRunner';
import { MessageNotificationPopup } from '../messages/MessageNotificationPopup';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useBookStore } from '../../store/useBookStore';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { PWAInstallBanner } from './PWAInstallBanner';
import { MobileBottomNav } from './MobileBottomNav';


export const Layout: React.FC = () => {
  const { currentBook } = useAudioPlayerStore();
  const { isAuthenticated, isAuthInitialized, user, role } = useAuthStore();
  const location = useLocation();
  const isListenPage = location.pathname.startsWith('/listen');

  const isAuthorOrStaff = Boolean(
    isAuthenticated && user && (role === 'author' || role === 'admin' || user.role === 'author' || user.role === 'admin' || user.isAuthor || user.isSuperAdmin || Boolean(user.duty))
  );

  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('tanda_token'));
  const isEligibleForPlayer = !isAuthorOrStaff && (isAuthenticated || (!isAuthInitialized && hasToken));

  useEffect(() => {
    if (!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/author')) {
      useBookStore.getState().fetchBooks().catch(() => {});
    }
  }, [location.pathname]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthorOrStaff && <QuoteNotificationRunner />}
      <NewsNotificationRunner />
      <MessageNotificationRunner />
      <Header />
      <AppSidebarDrawer />
      <main
        className={`flex-1 flex flex-col ${
          isListenPage
            ? 'pb-10'
            : isEligibleForPlayer && currentBook
            ? 'pb-36 md:pb-24'
            : 'pb-20 md:pb-0'
        }`}
      >
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      {!isListenPage && <Footer />}
      <MobileBottomNav />
      {!isAuthorOrStaff && <AudioPlayerBar />}
      {!isAuthorOrStaff && <DailyLimitModal />}
      <ToastContainer />
      {!isAuthorOrStaff && <QuoteNotificationPopup />}
      <MessageNotificationPopup />
      {!isAuthorOrStaff && <PWAInstallBanner />}
    </div>
  );
};
