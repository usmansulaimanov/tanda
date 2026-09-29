import React, { useMemo } from 'react';

interface FormattedNoticeTextProps {
  text?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

function sanitizeAndFormat(input: string): string {
  if (!input) return '';

  // If input contains HTML tags (WYSIWYG format)
  if (/<[a-z][\s\S]*>/i.test(input)) {
    // Strip dangerous tags and attributes
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');
  }

  // Fallback for markdown format
  return input
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-black text-slate-900">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic font-medium">$1</em>')
    .replace(/\n/g, '<br>');
}

export const FormattedNoticeText: React.FC<FormattedNoticeTextProps> = ({
  text,
  align = 'left',
  className = '',
}) => {
  if (
    !text ||
    !text.trim() ||
    text === '<br>' ||
    text === '<div><br></div>' ||
    text === '<p><br></p>'
  ) {
    return null;
  }

  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'right'
      ? 'text-right'
      : 'text-left';

  const htmlContent = useMemo(() => sanitizeAndFormat(text), [text]);

  if (!htmlContent) return null;

  return (
    <div
      className={`leading-relaxed text-slate-800 break-words ${alignClass} ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

