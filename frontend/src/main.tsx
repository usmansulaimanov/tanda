import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './app/routes';
import { runMigration } from './utils/migration';
import { useAuthStore } from './store/useAuthStore';
import './index.css';

// 1. Run migration to clean up legacy localStorage mocks
runMigration();

// 2. Restore active JWT session if present
useAuthStore.getState().restoreSession();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
