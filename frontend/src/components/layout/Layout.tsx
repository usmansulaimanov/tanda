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
import { MessageNotificationPopup } from '../messages/MessageNotificationPopup';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useAuthStore } from '../../store/useAuthStore';

export const Layout: React.FC = () => {
  const { currentBook } = useAudioPlayerStore();
  const { isAuthenticated, user, role } = useAuthStore();
  const location = useLocation();
  const isListenPage = location.pathname.startsWith('/listen');

  const isAuthorOrStaff = Boolean(
    isAuthenticated && user && (role === 'author' || role === 'admin' || user.role === 'author' || user.role === 'admin' || user.isAuthor || user.isSuperAdmin || Boolean(user.duty))
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-screen">
      {!isAuthorOrStaff && <QuoteNotificationRunner />}
      <NewsNotificationRunner />
      <Header />
      <AppSidebarDrawer />
      <main className={`flex-1 flex flex-col ${isListenPage ? 'pb-10' : !isAuthorOrStaff && isAuthenticated && currentBook ? 'pb-24' : ''}`}>
        <Outlet />
      </main>
      {!isListenPage && <Footer />}
      {!isAuthorOrStaff && <AudioPlayerBar />}
      {!isAuthorOrStaff && <DailyLimitModal />}
      <ToastContainer />
      {!isAuthorOrStaff && <QuoteNotificationPopup />}
      <MessageNotificationPopup />
    </div>
  );
};
