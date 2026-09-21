const MIGRATION_KEY = 'tanda_migrated_v5_clean_all_mocks';

export function runMigration() {
  if (localStorage.getItem(MIGRATION_KEY)) {
    return; // Already migrated
  }

  // Clear legacy localStorage keys containing mock books, news, quotes
  const legacyKeys = [
    'tanda_books_storage',
    'tanda_books_storage_v1',
    'tanda_books_storage_v2',
    'tanda_books_storage_v3',
    'tanda_deleted_books_v3',
    'tanda_books_initialized_v3',
    'tanda_news_articles_v1',
    'tanda_quotes_storage_v1',
    'tanda_quotes_v1',
    'tanda_saved_books_storage',
  ];

  legacyKeys.forEach((key) => localStorage.removeItem(key));

  localStorage.setItem(MIGRATION_KEY, '1');
  console.log('[Tanda] localStorage cleaned up, all mock books, quotes, and news removed.');
}
