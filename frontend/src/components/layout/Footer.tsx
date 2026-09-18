import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="tanda-footer">
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="footer-bottom">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 900, color: '#FFF', fontSize: '18px' }}>
              tanda<span style={{ color: 'var(--orange)' }}>.</span>
            </span>
            <span>— Қазақша аудио және электронды кітаптар платформасы</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>&copy; {new Date().getFullYear()} tanda.kz. Барлық құқықтар қорғалған.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
