const MIGRATION_KEY = 'tanda_migrated_v7_clean_all_business_keys';

export function runMigration() {
  if (typeof window === 'undefined') return;

  if (localStorage.getItem(MIGRATION_KEY)) {
    return; // Already migrated
  }

  // Clear legacy localStorage keys containing mock books, users, stats, royalties, shelves
  const legacyKeys = [
    'tanda_auth_storage_v1',
    'tanda_users_registry_v1',
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
    'tanda_my_books_shelf_storage_v1',
    'tanda_royalty_store',
    'tanda_royalty_store_v2',
    'tanda_royalty_store_v3',
    'tanda_quotes_storage_v1',
    'tanda_news_articles_v2',
    'tanda_admin_messages_v1',
    'tanda_audio_player_state_v1',
  ];

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {}
  });

  // Purge any legacy draft keys
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('tanda_royalty_draft_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch {}

  // Clean mock token if present
  const token = localStorage.getItem('tanda_token');
  if (token && token.startsWith('mock-')) {
    localStorage.removeItem('tanda_token');
  }

  localStorage.setItem(MIGRATION_KEY, '1');
}
