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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '249161344734-j51fft6shbogf2clnrhofn3l0c1euihl.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
