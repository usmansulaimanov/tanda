import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { router } from './app/routes';
import { runMigration } from './utils/migration';
import { useAuthStore } from './store/useAuthStore';
import './index.css';

// 1. Run migration to clean up legacy localStorage mocks
runMigration();

// 2. Restore active JWT session if present
useAuthStore.getState().restoreSession();

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '249161344734-j51fft6shbogf2clnrhofn3l0c1euihl.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
