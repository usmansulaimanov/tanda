const MIGRATION_KEY = 'tanda_migrated_v2';

export function runMigration() {
  if (localStorage.getItem(MIGRATION_KEY)) {
    return; // Already migrated
  }

  // Clear legacy localStorage keys from the mock version
  const legacyKeys = [
    'tanda_books_storage',
    'tanda_auth_storage',
    'tanda_saved_books_storage',
    'tanda_users',
  ];

  legacyKeys.forEach((key) => localStorage.removeItem(key));

  localStorage.setItem(MIGRATION_KEY, '1');
  console.log('[Tanda] localStorage cleaned up, migrated to server-backed storage.');
}
