import React from 'react';

interface StarRatingProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  interactive?: boolean;
  onChange?: (val: number) => void;
  showValue?: boolean;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  max = 5,
  size = 'md',
  interactive = false,
  onChange,
  showValue = false,
  className = '',
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const starSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }, (_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= displayValue;
          const isHalf = !isFilled && starNumber - 0.5 <= displayValue;

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onChange && onChange(starNumber)}
              onMouseEnter={() => interactive && setHoverValue(starNumber)}
              onMouseLeave={() => interactive && setHoverValue(null)}
              className={`${
                interactive ? 'cursor-pointer transform transition-transform active:scale-125 hover:scale-110 p-0.5' : 'cursor-default'
              } focus:outline-none`}
              aria-label={`${starNumber} жұлдыз`}
            >
              <svg
                className={`${starSizes[size]} transition-colors duration-150 ${
                  isFilled
                    ? 'text-amber-400 fill-amber-400 drop-shadow-[0_1px_2px_rgba(251,191,36,0.3)]'
                    : isHalf
                    ? 'text-amber-400 fill-amber-400/50'
                    : 'text-slate-200 fill-slate-200'
                }`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={isFilled ? '0' : '1.5'}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          );
        })}
      </div>

      {showValue && (
        <span className="font-bold text-slate-800 text-sm ml-1">
          {Number(value).toFixed(1)}
        </span>
      )}
    </div>
  );
};
