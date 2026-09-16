import React from 'react';
import { twMerge } from 'tailwind-merge';

interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name = 'U', size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base font-semibold',
    xl: 'w-20 h-20 text-xl font-bold',
  };

  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={twMerge(
          'rounded-full object-cover border border-white/10',
          sizeClasses[size],
          className
        )}
      />
    );
  }

  return (
    <div
      className={twMerge(
        'rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white border border-white/10 select-none',
        sizeClasses[size],
        className
      )}
    >
      {initials}
    </div>
  );
};
