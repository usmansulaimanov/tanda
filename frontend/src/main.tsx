import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { router } from './app/routes';
import { AppProviders } from './app/providers';
import { runMigration } from './utils/migration';
import './index.css';

// Run migration to clean up legacy localStorage mocks
runMigration();

// Handle Vite stale chunk dynamic import failures (e.g. after new deployment)
if (typeof window !== 'undefined') {
  const reloadWithCooldown = () => {
    const lastReload = sessionStorage.getItem('chunk_reload_ts');
    const now = Date.now();
    // Prevent reload loops: trigger reload once every 10 seconds max
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem('chunk_reload_ts', String(now));
      window.location.reload();
    }
  };

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadWithCooldown();
  });

  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Loading chunk')
    ) {
      event.preventDefault();
      reloadWithCooldown();
    }
  });

  // Background pre-warm for Render backend instance
  fetch((import.meta.env.VITE_API_URL || '') + '/api/v1/books', { method: 'GET', keepalive: true }).catch(() => {});
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '470329734598-c32dk937vu2hgkbvblqjuvi43noc1mu9.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
