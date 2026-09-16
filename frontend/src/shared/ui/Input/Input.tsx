import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, disabled, ...props }, ref) => {
    return (
      <div className="w-full">
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-white/40 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            disabled={disabled}
            className={twMerge(
              'w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 transition-colors duration-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed',
              leftIcon ? 'pl-10' : '',
              rightIcon ? 'pr-10' : '',
              error ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500' : '',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-white/40 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="mt-1.5 text-xs text-rose-400 pl-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
