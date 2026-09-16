import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      className={twMerge(
        'animate-pulse rounded-md bg-white/10 dark:bg-white/5',
        className
      )}
      {...props}
    />
  );
};

export const BookCardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-[#1a1a24] p-3 border border-white/5">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between items-center mt-2">
        <Skeleton className="h-4 w-12 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-lg" />
      </div>
    </div>
  );
};

export const BookDetailSkeleton: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
      <div className="flex flex-col md:flex-row gap-8">
        <Skeleton className="w-64 h-96 rounded-2xl shrink-0" />
        <div className="flex-1 flex flex-col gap-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <div className="flex gap-4 mt-6">
            <Skeleton className="h-12 w-36 rounded-xl" />
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>
          <div className="mt-8 flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 rounded-xl bg-white/5 items-center">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-6 w-16 ml-auto rounded-full" />
        </div>
      ))}
    </div>
  );
};
