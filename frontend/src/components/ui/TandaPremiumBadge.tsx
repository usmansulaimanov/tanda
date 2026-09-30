import React from 'react';
import tandaPremiumWhite from '../../assets/tanda-premium-white.png';

interface TandaPremiumBadgeProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  position?: 'left' | 'right' | 'bottom-center' | 'bottom-left' | 'bottom-right';
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
    xs: { width: '14px', height: '16px', top: '5px', side: '5px', bottom: '5px' },
    sm: { width: '18px', height: '21px', top: '8px', side: '8px', bottom: '6px' },
    md: { width: '24px', height: '27px', top: '10px', side: '10px', bottom: '8px' },
    lg: { width: '32px', height: '36px', top: '14px', side: '14px', bottom: '12px' },
  };

  const current = sizeMap[size] || sizeMap.md;

  let posStyle: React.CSSProperties;
  if (position === 'bottom-center') {
    posStyle = { bottom: current.bottom, left: '50%', transform: 'translateX(-50%)' };
  } else if (position === 'bottom-left') {
    posStyle = { bottom: current.bottom, left: current.side };
  } else if (position === 'bottom-right') {
    posStyle = { bottom: current.bottom, right: current.side };
  } else if (position === 'right') {
    posStyle = { top: current.top, right: current.side };
  } else {
    posStyle = { top: current.top, left: current.side };
  }

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
        zIndex: 10,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.75))',
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

