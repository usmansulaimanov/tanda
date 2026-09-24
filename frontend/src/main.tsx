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

// Background pre-warm for Render backend instance
if (typeof window !== 'undefined') {
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
