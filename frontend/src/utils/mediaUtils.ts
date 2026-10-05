/**
 * Utility to resolve relative upload URLs to full URLs using VITE_API_URL in production
 */
export function resolveMediaUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
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
  const trimmed = rawUrl.trim();
  // Raw telegram file ID (e.g. CQACAgIA...)
  if (!trimmed.includes('/') && !trimmed.includes('.') && trimmed.length > 20) {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    return `${apiBase}/api/v1/media/telegram/${trimmed}`;
  }
  // Relative api URL
  if (trimmed.startsWith('/api/')) {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    return `${apiBase}${trimmed}`;
  }
  // Local or uploads URL
  if (trimmed.startsWith('/uploads/')) {
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    if (!import.meta.env.VITE_API_URL) {
      return `https://tanda-backend-7lpj.onrender.com${trimmed}`;
    }
    return `${apiBase}${trimmed}`;
  }
  // If it's an old 489q domain, replace with current 7lpj domain
  if (trimmed.includes('tanda-backend-489q.onrender.com')) {
    return trimmed.replace('tanda-backend-489q.onrender.com', 'tanda-backend-7lpj.onrender.com');
  }
  return trimmed;
}
