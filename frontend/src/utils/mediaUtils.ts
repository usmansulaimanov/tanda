/**
 * Utility to resolve relative upload URLs to full URLs using VITE_API_URL in production
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  let trimmed = url.trim();

  // Replace old Render domains with tandamen.kz
  if (trimmed.includes('tanda-backend-7lpj.onrender.com') || trimmed.includes('tanda-backend-489q.onrender.com')) {
    trimmed = trimmed
      .replace('https://tanda-backend-7lpj.onrender.com', 'https://tandamen.kz')
      .replace('http://tanda-backend-7lpj.onrender.com', 'https://tandamen.kz')
      .replace('https://tanda-backend-489q.onrender.com', 'https://tandamen.kz')
      .replace('http://tanda-backend-489q.onrender.com', 'https://tandamen.kz');
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const apiBase = (import.meta.env.VITE_API_URL || 'https://tandamen.kz').replace(/\/$/, '');
  if (trimmed.startsWith('/')) {
    return `${apiBase}${trimmed}`;
  }
  return `${apiBase}/${trimmed}`;
}

export function isTelegramLink(url: string | undefined | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase().trim();
  return lower.includes('t.me/') || lower.includes('telegram.me/') || lower.startsWith('tg://');
}

export function formatAudioUrl(rawUrl?: string | null): string {
  if (!rawUrl) return '';
  let trimmed = rawUrl.trim();

  // Replace old Render domains with tandamen.kz
  if (trimmed.includes('tanda-backend-7lpj.onrender.com') || trimmed.includes('tanda-backend-489q.onrender.com')) {
    trimmed = trimmed
      .replace('https://tanda-backend-7lpj.onrender.com', 'https://tandamen.kz')
      .replace('http://tanda-backend-7lpj.onrender.com', 'https://tandamen.kz')
      .replace('https://tanda-backend-489q.onrender.com', 'https://tandamen.kz')
      .replace('http://tanda-backend-489q.onrender.com', 'https://tandamen.kz');
  }

  // Raw telegram file ID (e.g. CQACAgIA...)
  if (!trimmed.includes('/') && !trimmed.includes('.') && trimmed.length > 20) {
    const apiBase = (import.meta.env.VITE_API_URL || 'https://tandamen.kz').replace(/\/$/, '');
    return `${apiBase}/api/v1/media/telegram/${trimmed}`;
  }
  // Relative api URL
  if (trimmed.startsWith('/api/')) {
    const apiBase = (import.meta.env.VITE_API_URL || 'https://tandamen.kz').replace(/\/$/, '');
    return `${apiBase}${trimmed}`;
  }
  // Local or uploads URL
  if (trimmed.startsWith('/uploads/')) {
    const apiBase = (import.meta.env.VITE_API_URL || 'https://tandamen.kz').replace(/\/$/, '');
    return `${apiBase}${trimmed}`;
  }
  return trimmed;
}
