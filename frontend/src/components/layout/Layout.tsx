import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AudioPlayerBar } from '../player/AudioPlayerBar';
import { ToastContainer } from '../ui/Toast';
import { AppSidebarDrawer } from './AppSidebarDrawer';
import { QuoteNotificationPopup } from '../quotes/QuoteNotificationPopup';
import { QuoteNotificationRunner } from '../quotes/QuoteNotificationRunner';
import { MessageNotificationPopup } from '../messages/MessageNotificationPopup';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';
import { useAuthStore } from '../../store/useAuthStore';

export const Layout: React.FC = () => {
  const { currentBook } = useAudioPlayerStore();
  const { isAuthenticated } = useAuthStore();
  const location = useLocation();
  const isListenPage = location.pathname.startsWith('/listen');

  return (
    <div className={`flex flex-col ${isListenPage ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
      <QuoteNotificationRunner />
      <Header />
      <AppSidebarDrawer />
      <main className={`flex-1 ${isListenPage ? 'h-[calc(100vh-65px)] overflow-hidden flex flex-col' : isAuthenticated && currentBook ? 'pb-24' : ''}`}>
        <Outlet />
      </main>
      {!isListenPage && <Footer />}
      <AudioPlayerBar />
      <ToastContainer />
      <QuoteNotificationPopup />
      <MessageNotificationPopup />
    </div>
  );
};
