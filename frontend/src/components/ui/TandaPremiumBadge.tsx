import React from 'react';
import tandaPremiumWhite from '../../assets/tanda-premium-white.png';

interface TandaPremiumBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  position?: 'left' | 'right';
  className?: string;
  style?: React.CSSProperties;
}

export const TandaPremiumBadge: React.FC<TandaPremiumBadgeProps> = ({
  size = 'md',
  position = 'left',
  className = '',
  style = {},
}) => {
  const sizeMap = {
    sm: { width: '22px', height: '28px', top: '8px', side: '8px' },
    md: { width: '30px', height: '32px', top: '12px', side: '12px' },
    lg: { width: '38px', height: '40px', top: '16px', side: '16px' },
  };

  const current = sizeMap[size] || sizeMap.md;

  const posStyle: React.CSSProperties = position === 'left'
    ? { top: current.top, left: current.side }
    : { top: current.top, right: current.side };

  return (
    <div
      className={`tanda-premium-badge ${className}`}
      title="Премиум кітап"
      style={{
        position: 'absolute',
        ...posStyle,
        width: current.width,
        height: current.height,
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
