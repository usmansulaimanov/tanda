// Security and URL sanitization utility
// Strictly no emojis

export function sanitizeInput(input: string | undefined | null): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

export function sanitizeUrl(url: string | undefined | null, fallback = ''): string {
  if (!url) return fallback;
  let trimmed = url.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('//')) {
    trimmed = 'https:' + trimmed;
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  if (trimmed.includes('.') && !trimmed.includes(' ') && !trimmed.startsWith('javascript:')) {
    return 'https://' + trimmed;
  }

  return fallback;
}
