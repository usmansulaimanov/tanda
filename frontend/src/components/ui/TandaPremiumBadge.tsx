import React from 'react';
import tandaPremiumWhite from '../../assets/tanda-premium-white.png';

interface TandaPremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export const TandaPremiumBadge: React.FC<TandaPremiumBadgeProps> = ({
  size = 'md',
  className = '',
  style = {},
}) => {
  const sizeMap = {
    sm: { width: '22px', top: '8px', right: '8px' },
    md: { width: '28px', top: '10px', right: '10px' },
    lg: { width: '38px', top: '14px', right: '14px' },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`tanda-premium-badge ${className}`}
      title="Премиум кітап"
      style={{
        position: 'absolute',
        top: current.top,
        right: current.right,
        width: current.width,
        height: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.45))',
        ...style,
      }}
    >
      <img
        src={tandaPremiumWhite}
        alt="Premium"
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
