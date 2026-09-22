const MIGRATION_KEY = 'tanda_migrated_v6_clean_all_mock_stores';

export function runMigration() {
  if (typeof window === 'undefined') return;

  if (localStorage.getItem(MIGRATION_KEY)) {
    return; // Already migrated
  }

  // Clear legacy localStorage keys containing mock books, users, stats
  const legacyKeys = [
    'tanda_books_storage',
    'tanda_books_storage_v1',
    'tanda_books_storage_v2',
    'tanda_books_storage_v3',
    'tanda_books_storage_v4',
    'tanda_deleted_books_v3',
    'tanda_deleted_books_v4',
    'tanda_books_initialized_v3',
    'tanda_books_initialized_v4',
    'tanda_top_audio_stats_v1',
    'tanda_saved_books_storage',
  ];

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });

  // Clean mock token if present
  const token = localStorage.getItem('tanda_token');
  if (token && token.startsWith('mock-')) {
    localStorage.removeItem('tanda_token');
  }

  localStorage.setItem(MIGRATION_KEY, '1');
}
