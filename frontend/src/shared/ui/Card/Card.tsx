import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        'bg-[#1a1a24] border border-white/10 rounded-2xl p-6 transition-all duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
