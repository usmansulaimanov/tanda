import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Footer } from './Footer';
import { AudioPlayerBar } from '../player/AudioPlayerBar';
import { ToastContainer } from '../ui/Toast';
import { AppSidebarDrawer } from './AppSidebarDrawer';
import { useAudioPlayerStore } from '../../store/useAudioPlayerStore';

export const Layout: React.FC = () => {
  const { currentBook } = useAudioPlayerStore();

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <AppSidebarDrawer />
      <main className={`flex-1 ${currentBook ? 'pb-24' : ''}`}>
        <Outlet />
      </main>
      <Footer />
      <AudioPlayerBar />
      <ToastContainer />
    </div>
  );
};
