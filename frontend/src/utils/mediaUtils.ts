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
