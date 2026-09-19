import React from 'react';
import tandaIcon from '../../assets/tanda-icon.png';

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
    sm: { badge: '22px', icon: '13px', radius: '6px' },
    md: { badge: '28px', icon: '16px', radius: '8px' },
    lg: { badge: '36px', icon: '20px', radius: '10px' },
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div
      className={`tanda-premium-badge ${className}`}
      title="Премиум кітап"
      style={{
        position: 'absolute',
        top: size === 'sm' ? '6px' : '10px',
        right: size === 'sm' ? '6px' : '10px',
        width: currentSize.badge,
        height: currentSize.badge,
        borderRadius: currentSize.radius,
        background: '#FFFFFF',
        boxShadow: '0 2px 8px rgba(0, 40, 80, 0.22)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3,
        pointerEvents: 'none',
        ...style,
      }}
    >
      <img
        src={tandaIcon}
        alt="Premium"
        style={{
          width: currentSize.icon,
          height: 'auto',
          display: 'block',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};
