import { AdminPermission, User } from '../types';

export interface PermissionDefinition {
  key: AdminPermission;
  label: string;
  description: string;
  category: 'books' | 'readers' | 'promocodes' | 'quotes' | 'system';
}

export const ALL_PERMISSIONS: PermissionDefinition[] = [
  // Books
  {
    key: 'books_view',
    label: 'Кітаптарды көру',
    description: 'Кітаптар қоры мен тізімін бақылау',
    category: 'books',
  },
  {
    key: 'books_create',
    label: 'Жаңа кітап қосу',
    description: 'Кітаптар базасына жаңа кітап пен аудио жүктеу',
    category: 'books',
  },
  {
    key: 'books_edit',
    label: 'Кітаптарды өңдеу',
    description: 'Кітап сипаттамасын, тарауларын, аудиосын өзгерту',
    category: 'books',
  },
  {
    key: 'books_delete',
    label: 'Кітаптарды өшіру / архивтеу',
    description: 'Кітапты өшіру және жасыру (архивке салу)',
    category: 'books',
  },

  // Readers
  {
    key: 'readers_view',
    label: 'Оқырмандар тізімін көру',
    description: 'Оқырмандар базасын және мәліметтерін көру',
    category: 'readers',
  },
  {
    key: 'readers_manage',
    label: 'Оқырман қосу / өңдеу',
    description: 'Жаңа оқырман тіркеу, құпия сөз ауыстыру, хабарлама жазу, бұғаттау',
    category: 'readers',
  },
  {
    key: 'readers_delete',
    label: 'Оқырманды өшіру',
    description: 'Оқырманды базадан біржолата жою',
    category: 'readers',
  },

  // Promocodes
  {
    key: 'promocodes_manage',
    label: 'Промокодтарды басқару',
    description: 'Жаңа промокод пакеттерін құру, көру, көшіру және өшіру',
    category: 'promocodes',
  },

  // Quotes
  {
    key: 'quotes_manage',
    label: 'Цитаталарды басқару',
    description: 'Күнделікті цитаталарды енгізу, уақытын баптау және оқырмандарға тарату',
    category: 'quotes',
  },

  // System & Analytics
  {
    key: 'analytics_view',
    label: 'Статистика мен көрсеткіштер',
    description: 'Жүйенің жалпы статистикасын көру',
    category: 'system',
  },
  {
    key: 'managers_manage',
    label: 'Басқару (Көмекші тағайындау)',
    description: 'Жаңа көмекшілер қосу және рұқсаттарын өзгерту',
    category: 'system',
  },
];

export const PERMISSION_CATEGORIES = [
  { key: 'books', title: '📚 Кітаптар қоры' },
  { key: 'readers', title: '👥 Оқырмандар мен клиенттер' },
  { key: 'promocodes', title: '🎟️ Промокодтар жүйесі' },
  { key: 'quotes', title: 'Цитаталар мен хабарламалар' },
  { key: 'system', title: '⚙️ Жүйе және басқару' },
] as const;

/**
 * Checks whether a given user has a specific admin permission.
 * - Super Admin (isSuperAdmin: true) has all permissions.
 * - If user is admin and has no specific permissions list defined, grant all.
 * - Otherwise checks if user.permissions includes the permission.
 */
export function hasAdminPermission(user: User | null | undefined, permission: AdminPermission): boolean {
  if (!user || user.role !== 'admin') {
    return false;
  }

  // Super Admin has all permissions
  if (user.isSuperAdmin) {
    return true;
  }

  // Default admin (if permissions not restricted)
  if (!user.permissions || user.permissions.length === 0) {
    return true;
  }

  return user.permissions.includes(permission);
}

/**
 * Returns a human-readable list of permission names in Kazakh
 */
export function getPermissionLabel(key: AdminPermission): string {
  const found = ALL_PERMISSIONS.find((p) => p.key === key);
  return found ? found.label : key;
}
