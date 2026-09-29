import React from 'react';

interface FormattedNoticeTextProps {
  text?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export const FormattedNoticeText: React.FC<FormattedNoticeTextProps> = ({
  text,
  align = 'left',
  className = '',
}) => {
  if (!text || !text.trim()) return null;

  const lines = text.split('\n');

  const alignClass =
    align === 'center'
      ? 'text-center'
      : align === 'right'
      ? 'text-right'
      : 'text-left';

  const formatInline = (str: string) => {
    // Split by **bold** or *italic*
    const parts = str.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={index} className="font-black text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={index} className="italic font-medium">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });
  };

  return (
    <div className={`space-y-1 ${alignClass} ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        return (
          <p key={idx} className="leading-relaxed">
            {formatInline(line)}
          </p>
        );
      })}
    </div>
  );
};
