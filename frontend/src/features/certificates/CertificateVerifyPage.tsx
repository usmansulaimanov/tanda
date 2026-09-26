import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { certificatesApi, CertificateItem } from '../../shared/api/certificates.api';

export const CertificateVerifyPage: React.FC = () => {
  const { certNumber } = useParams<{ certNumber: string }>();
  const [searchParams] = useSearchParams();
  const key = searchParams.get('key');

  const [cert, setCert] = useState<CertificateItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!certNumber) {
      setError('Сертификат нөмірі көрсетілмеген');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    certificatesApi
      .verify(certNumber.trim(), key)
      .then((data) => {
        setCert(data);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
          'Сертификат табылмады немесе тексеру кілті қате. Түпнұсқалықты тексеру үшін ресми QR-кодты сканерлеңіз.'
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [certNumber, key]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #F8FAFC 0%, #EEF2F6 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 16px 60px',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 1. Brand Logo */}
      <Link to="/" style={{ textDecoration: 'none', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img src="/assets/tanda-logo.png" alt="Tanda" style={{ height: '36px', objectFit: 'contain' }} onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
        <span style={{ fontSize: '24px', fontWeight: 900, color: 'var(--blue, #005494)', letterSpacing: '-0.5px' }}>
          tanda
        </span>
      </Link>

      {/* 2. Loading State */}
      {isLoading ? (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '50px 30px',
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
            border: '1.5px solid #E2E8F0',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
            Сертификат түпнұсқалығы тексерілуде...
          </h2>
        </div>
      ) : error || !cert ? (
        /* 3. Error / Not Found State */
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '50px 32px',
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0,0,0,0.06)',
            border: '2px solid #FCA5A5',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 18px',
            }}
          >
            ✕
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0F172A', margin: '0 0 8px' }}>
            Сертификат табылмады немесе қолжетімсіз
          </h2>
          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', margin: '0 0 24px' }}>
            {error || `«${certNumber}» нөмірлі сертификат жүйеде тіркелмеген немесе тексеру кілті көрсетілмеген.`}
          </p>
          <Link
            to="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: '12px',
              background: 'var(--blue, #005494)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Басты бетке оралу
          </Link>
        </div>
      ) : (
        /* 4. Verified Certificate Document Card */
        <div style={{ maxWidth: '640px', width: '100%' }}>
          {/* Status Header Badge */}
          <div
            style={{
              background: cert.status === 'ACTIVE' ? '#DCFCE7' : '#FEE2E2',
              border: `1.5px solid ${cert.status === 'ACTIVE' ? '#86EFAC' : '#FCA5A5'}`,
              borderRadius: '16px',
              padding: '14px 20px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: cert.status === 'ACTIVE' ? '#15803D' : '#DC2626',
              }}
            >
              {cert.status === 'ACTIVE'
                ? 'Сертификаттың түпнұсқа екені расталады'
                : 'Сертификаттың қолданылу мерзімі тоқтатылған'}
            </span>
          </div>

          {/* Certificate Main Card */}
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              border: '2px solid #E2E8F0',
              boxShadow: '0 12px 40px rgba(0, 84, 148, 0.08)',
              padding: '36px 32px',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Decorative Top Border Bar */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                background: 'linear-gradient(90deg, #EF7E00 0%, #005494 50%, #0284C7 100%)',
              }}
            />

            {/* Header: Certificate Number */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                marginBottom: '24px',
                paddingBottom: '16px',
                borderBottom: '1px solid #F1F5F9',
              }}
            >
              <div
                style={{
                  color: '#0F172A',
                  fontSize: '14px',
                  fontWeight: 900,
                  fontFamily: 'monospace',
                  letterSpacing: '0.5px',
                }}
              >
                № {cert.certificateNumber}
              </div>
            </div>

            {/* Certificate Title */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                МАРАПАТТАУ ҚҰЖАТЫ
              </span>
              <h1
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: 'var(--blue, #005494)',
                  margin: 0,
                  letterSpacing: '-0.3px',
                }}
              >
                {cert.title}
              </h1>
            </div>

            {/* Recipient Name Box */}
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: '18px',
                padding: '20px',
                textAlign: 'center',
                border: '1.5px solid #E2E8F0',
                marginBottom: '20px',
              }}
            >
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '6px' }}>
                Сертификат табысталады:
              </span>
              <div style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A' }}>
                {cert.recipientName}
              </div>
              {cert.recipientIdNumber && (
                <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace', marginTop: '4px' }}>
                  ID: {cert.recipientIdNumber}
                </div>
              )}
            </div>

            {/* Description / Achievement */}
            {cert.description && (
              <div style={{ textAlign: 'center', marginBottom: '24px', padding: '0 10px' }}>
                <p style={{ fontSize: '14.5px', color: '#334155', lineHeight: '1.6', margin: 0 }}>
                  {cert.description}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                background: '#FAFAFA',
                padding: '16px 20px',
                borderRadius: '14px',
                marginBottom: '28px',
                fontSize: '13px',
              }}
            >
              <div>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>Берілген күні:</span>
                <strong style={{ color: '#0F172A' }}>{cert.issuedAt}</strong>
              </div>
              <div>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '2px' }}>Берген ұйым:</span>
                <strong style={{ color: '#0F172A' }}>{cert.issuerName || 'Tanda Platform'}</strong>
              </div>
            </div>

            {/* Download Certificate PDF / Image or View in Telegram Button */}
            {cert.pdfUrl ? (() => {
              const isTelegram = cert.pdfUrl.includes('t.me') || cert.pdfUrl.includes('telegram');
              return (
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <a
                    href={cert.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...(!isTelegram ? { download: true } : {})}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px',
                      width: '100%',
                      padding: '15px 24px',
                      borderRadius: '16px',
                      background: isTelegram
                        ? 'linear-gradient(135deg, #229ED9 0%, #0088cc 100%)'
                        : 'linear-gradient(135deg, #16A34A 0%, #15803D 100%)',
                      color: '#FFFFFF',
                      fontSize: '15px',
                      fontWeight: 800,
                      textDecoration: 'none',
                      boxShadow: isTelegram
                        ? '0 6px 20px rgba(34, 158, 217, 0.3)'
                        : '0 6px 20px rgba(22, 163, 74, 0.3)',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isTelegram ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                    )}
                    {isTelegram
                      ? 'Сертификатты көру / Жүктеу (Telegram)'
                      : 'Түпнұсқа сертификатты жүктеп алу (PDF)'}
                  </a>
                </div>
              );
            })() : null}

            {/* Footer QR Code & Security Stamp */}
            <div
              style={{
                borderTop: '1px solid #E2E8F0',
                paddingTop: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    background: '#FFFFFF',
                    padding: '6px',
                    borderRadius: '8px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <QRCodeSVG
                    value={cert.verificationUrl || `https://tanda-xi.vercel.app/verify/cert/${cert.certificateNumber}`}
                    size={64}
                    level="M"
                  />
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                  <div style={{ fontWeight: 800, color: '#0F172A' }}>Цифрлық қолтаңба</div>
                  <div>Түпнұсқалық QR-кодпен қорғалған</div>
                </div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#94A3B8' }}>
                <div>tanda.kz</div>
                <div>Қазақша аудио және электронды кітаптар</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
