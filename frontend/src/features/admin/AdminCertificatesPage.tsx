import React, { useState, useEffect, useMemo, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { certificatesApi, CertificateItem, CertificateFormData } from '../../shared/api/certificates.api';
import { mediaApi } from '../../shared/api/media.api';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

export const AdminCertificatesPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { showToast } = useToastStore();

  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingCert, setEditingCert] = useState<CertificateItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [formNumber, setFormNumber] = useState<string>('');
  const [formRecipientName, setFormRecipientName] = useState<string>('');
  const [formRecipientUserId, setFormRecipientUserId] = useState<string>('');
  const [formRecipientIdNumber, setFormRecipientIdNumber] = useState<string>('');
  const [formTitle, setFormTitle] = useState<string>('Үздік оқырман сертификаты');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('READER_TOP_10');
  const [formIssuedAt, setFormIssuedAt] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formIssuerName, setFormIssuerName] = useState<string>('Tanda Platform');
  const [formPdfUrl, setFormPdfUrl] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('ACTIVE');

  // Duplicate Number Check State
  const [numberAvailability, setNumberAvailability] = useState<{ available: boolean; message: string } | null>(null);
  const [isCheckingNumber, setIsCheckingNumber] = useState<boolean>(false);

  // QR Modal State
  const [qrModalCert, setQrModalCert] = useState<CertificateItem | null>(null);

  // Delete Confirmation State
  const [certToDelete, setCertToDelete] = useState<CertificateItem | null>(null);

  // Readers list for quick selection
  const [readers, setReaders] = useState<any[]>([]);
  const [readerSearchQuery, setReaderSearchQuery] = useState<string>('');
  const [showReaderDropdown, setShowReaderDropdown] = useState<boolean>(false);
  const readerDropdownRef = useRef<HTMLDivElement>(null);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [fileSourceTab, setFileSourceTab] = useState<'upload' | 'link'>('upload');

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      const data = await certificatesApi.getAll();
      setCertificates(data);
    } catch (err: any) {
      showToast(err.message || 'Сертификаттарды жүктеу кезінде қате орын алды', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
    api.get('/api/v1/admin/users', { params: { role: 'client' } })
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setReaders(data);
        }
      })
      .catch(() => {});
  }, []);

  // Close reader dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (readerDropdownRef.current && !readerDropdownRef.current.contains(e.target as Node)) {
        setShowReaderDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-generate next certificate number
  const handleAutoGenerateNumber = async () => {
    try {
      const res = await certificatesApi.getNextNumber();
      setFormNumber(res.nextNumber);
      setNumberAvailability({ available: true, message: '✓ Нөмір бос, қолдануға болады' });
    } catch {
      const fallback = `TND-${new Date().getFullYear()}-${String(certificates.length + 1).padStart(6, '0')}`;
      setFormNumber(fallback);
    }
  };

  // Check number availability on blur or change
  const handleNumberChange = async (val: string) => {
    const upper = val.toUpperCase();
    setFormNumber(upper);
    if (!upper.trim()) {
      setNumberAvailability(null);
      return;
    }
    setIsCheckingNumber(true);
    try {
      const res = await certificatesApi.checkNumber(upper, editingCert?.id);
      setNumberAvailability(res);
    } catch {
      setNumberAvailability(null);
    } finally {
      setIsCheckingNumber(false);
    }
  };

  const openCreateModal = async () => {
    setEditingCert(null);
    setFormRecipientName('');
    setFormRecipientUserId('');
    setFormRecipientIdNumber('');
    setFormTitle('Үздік оқырман сертификаты');
    setFormDescription('39-аптадағы белсенді тыңдалымы және жоғары нәтижесі үшін');
    setFormCategory('READER_TOP_10');
    setFormIssuedAt(new Date().toISOString().split('T')[0]);
    setFormIssuerName('Tanda Platform');
    setFormPdfUrl('');
    setFormStatus('ACTIVE');
    setReaderSearchQuery('');
    setShowReaderDropdown(false);
    setFileSourceTab('upload');
    setIsModalOpen(true);
    await handleAutoGenerateNumber();
  };

  const openEditModal = (cert: CertificateItem) => {
    setEditingCert(cert);
    setFormNumber(cert.certificateNumber);
    setFormRecipientName(cert.recipientName);
    setFormRecipientUserId(cert.recipientUserId || '');
    setFormRecipientIdNumber(cert.recipientIdNumber || '');
    setFormTitle(cert.title);
    setFormDescription(cert.description || '');
    setFormCategory(cert.category || 'READER_TOP_10');
    setFormIssuedAt(cert.issuedAt || new Date().toISOString().split('T')[0]);
    setFormIssuerName(cert.issuerName || 'Tanda Platform');
    setFormPdfUrl(cert.pdfUrl || '');
    setFormStatus(cert.status || 'ACTIVE');
    setNumberAvailability({ available: true, message: '✓ Бұл осы сертификаттың нөмірі' });
    
    // Auto detect tab based on URL format
    if (cert.pdfUrl && (cert.pdfUrl.includes('t.me') || cert.pdfUrl.includes('telegram') || (!cert.pdfUrl.includes('/uploads/') && cert.pdfUrl.startsWith('http')))) {
      setFileSourceTab('link');
    } else {
      setFileSourceTab('upload');
    }

    setIsModalOpen(true);
  };

  const handleSelectReader = (reader: any) => {
    setFormRecipientName(reader.name || '');
    setFormRecipientUserId(reader.id || '');
    setFormRecipientIdNumber(reader.idNumber || '');
    setShowReaderDropdown(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      showToast('Файл көлемі 50MB-тан аспауы тиіс', 'error');
      return;
    }

    setIsUploadingFile(true);
    try {
      const category = file.type === 'application/pdf' ? 'books' : 'covers';
      const res = await mediaApi.uploadFile(file, category);
      setFormPdfUrl(res.url);
      showToast('Файл сәтті жүктелді!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Файлды жүктеу қатесі', 'error');
    } finally {
      setIsUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formNumber.trim()) {
      showToast('Сертификат нөмірін енгізіңіз', 'error');
      return;
    }
    if (!formRecipientName.trim()) {
      showToast('Алушының аты-жөнін жазыңыз', 'error');
      return;
    }
    if (!formTitle.trim()) {
      showToast('Сертификат атауын көрсетіңіз', 'error');
      return;
    }
    if (numberAvailability && !numberAvailability.available) {
      showToast('Бұл сертификат нөмірі бұрыннан тіркелген! Басқа нөмір таңдаңыз', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CertificateFormData = {
        certificateNumber: formNumber.trim().toUpperCase(),
        recipientName: formRecipientName.trim(),
        recipientUserId: formRecipientUserId || undefined,
        recipientIdNumber: formRecipientIdNumber || undefined,
        title: formTitle.trim(),
        description: formDescription.trim() || undefined,
        category: formCategory,
        issuedAt: formIssuedAt,
        issuerName: formIssuerName.trim(),
        pdfUrl: formPdfUrl || undefined,
        status: formStatus,
      };

      if (editingCert) {
        await certificatesApi.update(editingCert.id, payload);
        showToast('Сертификат сәтті жаңартылды!', 'success');
      } else {
        await certificatesApi.create(payload);
        showToast('Жаңа сертификат сәтті жасалды!', 'success');
      }
      setIsModalOpen(false);
      loadCertificates();
    } catch (err: any) {
      showToast(err.response?.data?.message || err.message || 'Сертификатты сақтау кезінде қате орын алды', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!certToDelete) return;
    try {
      await certificatesApi.delete(certToDelete.id);
      showToast('Сертификат өшірілді', 'info');
      setCertToDelete(null);
      loadCertificates();
    } catch (err: any) {
      showToast(err.message || 'Өшіру сәтсіз аяқталды', 'error');
    }
  };

  const copyToClipboard = (text: string, msg: string = 'Сілтеме көшірілді') => {
    navigator.clipboard.writeText(text);
    showToast(msg, 'success');
  };

  // Download QR Code as PNG
  const downloadQrCodePng = (cert: CertificateItem) => {
    const svg = document.getElementById(`qr-svg-${cert.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 1000;
      canvas.height = 1000;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 100, 100, 800, 800);
      }
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${cert.certificateNumber}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      showToast(`«${cert.certificateNumber}» QR-коды жүктелді!`, 'success');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      if (categoryFilter !== 'ALL' && c.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const numMatch = c.certificateNumber.toLowerCase().includes(q);
        const nameMatch = c.recipientName.toLowerCase().includes(q);
        const titleMatch = c.title.toLowerCase().includes(q);
        const idMatch = c.recipientIdNumber ? c.recipientIdNumber.toLowerCase().includes(q) : false;
        return numMatch || nameMatch || titleMatch || idMatch;
      }
      return true;
    });
  }, [certificates, categoryFilter, searchQuery]);

  const filteredReaders = useMemo(() => {
    if (!readerSearchQuery.trim()) return readers.slice(0, 15);
    const q = readerSearchQuery.toLowerCase().trim();
    return readers
      .filter((r) => r.name?.toLowerCase().includes(q) || r.email?.toLowerCase().includes(q) || r.idNumber?.toLowerCase().includes(q))
      .slice(0, 15);
  }, [readers, readerSearchQuery]);

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 1. Header & Create Button */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '24px 28px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 4px 20px rgba(0, 84, 148, 0.04)',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '24px' }}>🏆</span>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Сертификаттарды басқару
              </h1>
              <span
                style={{
                  background: '#EFF6FF',
                  color: 'var(--blue)',
                  fontSize: '12px',
                  fontWeight: 800,
                  padding: '3px 10px',
                  borderRadius: '12px',
                }}
              >
                Барлығы: {certificates.length}
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '13.5px', color: '#64748B' }}>
              Оқырмандарға ресми сертификат жасау, бірегей нөмір беру, QR-код арқылы растау және PDF жүктеу
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            style={{
              padding: '12px 24px',
              borderRadius: '14px',
              border: 'none',
              background: 'linear-gradient(135deg, var(--blue) 0%, #0284C7 100%)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 16px rgba(0, 84, 148, 0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Жаңа сертификат жасау
          </button>
        </div>

        {/* 2. Filters & Search */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '18px',
            padding: '18px 22px',
            border: '1.5px solid #E2E8F0',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          {/* Search */}
          <div style={{ flex: '1', minWidth: '260px', position: 'relative' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#94A3B8"
              strokeWidth="2.5"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Сертификат нөмірі (TND-...), аты-жөні немесе атауы..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: '12px',
                border: '1.5px solid #CBD5E1',
                background: '#F8FAFC',
                fontSize: '13.5px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748B' }}>Санаты:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                border: '1.5px solid #CBD5E1',
                background: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">Барлық санаттар</option>
              <option value="READER_TOP_10">Үздік оқырман (Топ 10)</option>
              <option value="MONTHLY_MARATHON">Айлық марафон</option>
              <option value="SPECIAL_AWARD">Арнайы марапат</option>
              <option value="HONOR">Құрмет грамотасы</option>
            </select>
          </div>
        </div>

        {/* 3. Certificates Cards List */}
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748B', fontSize: '15px' }}>
            Сертификаттар жүктелуде...
          </div>
        ) : filteredCertificates.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '60px 20px',
              textAlign: 'center',
              border: '1.5px dashed #CBD5E1',
            }}
          >
            <div style={{ fontSize: '42px', marginBottom: '12px' }}>📜</div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
              {searchQuery ? 'Іздеу бойынша сертификат табылмады' : 'Әлі бірде-бір сертификат жасалмаған'}
            </h3>
            <p style={{ color: '#64748B', fontSize: '13.5px', marginTop: '6px' }}>
              Үздік оқырмандар мен жеңімпаздарға жаңа ресми сертификат жасау үшін «+ Жаңа сертификат жасау» батырмасын басыңыз.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredCertificates.map((cert) => {
              const verifyUrl = cert.verificationUrl || `https://tanda-xi.vercel.app/verify/cert/${cert.certificateNumber}`;
              return (
                <div
                  key={cert.id}
                  style={{
                    background: '#FFFFFF',
                    borderRadius: '20px',
                    border: '1.5px solid #E2E8F0',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {/* Top Bar: Certificate Number Badge & Status */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: '#0F172A',
                          fontSize: '13px',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          letterSpacing: '0.3px',
                        }}
                      >
                        <span>№</span>
                        <span>{cert.certificateNumber}</span>
                      </div>

                      {cert.status === 'ACTIVE' ? (
                        <span
                          style={{
                            background: '#DCFCE7',
                            color: '#16A34A',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '8px',
                          }}
                        >
                          ✓ Жарамды
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '8px',
                          }}
                        >
                          Тоқтатылған
                        </span>
                      )}
                    </div>

                    {/* Recipient Name & Title */}
                    <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: '0 0 4px' }}>
                      {cert.recipientName}
                    </h3>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--blue)', marginBottom: '8px' }}>
                      {cert.title}
                    </div>

                    {cert.description && (
                      <p
                        style={{
                          fontSize: '12.5px',
                          color: '#475569',
                          margin: '0 0 14px',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {cert.description}
                      </p>
                    )}

                    {/* Meta info: Date & Issuer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11.5px', color: '#64748B', marginBottom: '16px' }}>
                      <span>📅 Берілген күні: <strong>{cert.issuedAt}</strong></span>
                      {cert.pdfUrl && (
                        <span
                          style={{
                            color: cert.pdfUrl.includes('t.me') || cert.pdfUrl.includes('telegram') ? '#0284C7' : '#16A34A',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: cert.pdfUrl.includes('t.me') || cert.pdfUrl.includes('telegram') ? '#E0F2FE' : '#DCFCE7',
                            padding: '2px 8px',
                            borderRadius: '6px',
                          }}
                        >
                          {cert.pdfUrl.includes('t.me') || cert.pdfUrl.includes('telegram') ? '✈️ Telegram' : '📄 PDF / Файл'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom: QR Code Section & Action Buttons */}
                  <div
                    style={{
                      borderTop: '1px solid #F1F5F9',
                      paddingTop: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    {/* QR Code thumbnail */}
                    <div
                      onClick={() => setQrModalCert(cert)}
                      title="QR-кодты үлкейту және жүктеп алу"
                      style={{
                        background: '#F8FAFC',
                        padding: '6px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <QRCodeSVG id={`qr-svg-${cert.id}`} value={verifyUrl} size={48} level="M" />
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setQrModalCert(cert)}
                        style={{
                          padding: '7px 12px',
                          borderRadius: '10px',
                          border: '1.5px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#0F172A',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        QR & Сілтеме
                      </button>

                      {cert.pdfUrl && (
                        <a
                          href={cert.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Жүктелген PDF-ті көру"
                          style={{
                            padding: '7px 10px',
                            borderRadius: '10px',
                            background: '#EFF6FF',
                            color: 'var(--blue)',
                            fontSize: '12px',
                            fontWeight: 800,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                        >
                          PDF ↗
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={() => openEditModal(cert)}
                        title="Сертификатты өңдеу"
                        style={{
                          padding: '7px 10px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#F1F5F9',
                          color: '#475569',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        ✏️
                      </button>

                      <button
                        type="button"
                        onClick={() => setCertToDelete(cert)}
                        title="Өшіру"
                        style={{
                          padding: '7px 10px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#FEE2E2',
                          color: '#DC2626',
                          fontSize: '12px',
                          fontWeight: 800,
                          cursor: 'pointer',
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: CREATE / EDIT CERTIFICATE                                        */}
        {/* ========================================================================= */}
        {isModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '620px',
                maxHeight: '92vh',
                overflowY: 'auto',
                padding: '30px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  {editingCert ? 'Сертификатты өңдеу' : 'Жаңа сертификат жасау'}
                </h2>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '16px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* 1. Certificate Number with Auto-generate & Live Check */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Сертификат нөмірі <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateNumber}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--blue)',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      🔄 Автоматты нөмір қою
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="TND-2026-000001"
                    value={formNumber}
                    onChange={(e) => handleNumberChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: numberAvailability && !numberAvailability.available ? '2px solid #EF4444' : '1.5px solid #CBD5E1',
                      background: '#F8FAFC',
                      fontSize: '14px',
                      fontWeight: 800,
                      fontFamily: 'monospace',
                      color: '#0F172A',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* Availability Message */}
                  {isCheckingNumber ? (
                    <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px' }}>Тексерілуде...</div>
                  ) : numberAvailability ? (
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        marginTop: '4px',
                        color: numberAvailability.available ? '#16A34A' : '#DC2626',
                      }}
                    >
                      {numberAvailability.message}
                    </div>
                  ) : null}
                </div>

                {/* 2. Recipient Name + Option to choose from Readers */}
                <div style={{ position: 'relative' }} ref={readerDropdownRef}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Алушының аты-жөні <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowReaderDropdown(!showReaderDropdown)}
                      style={{
                        background: '#EFF6FF',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '3px 8px',
                        color: 'var(--blue)',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      👤 Оқырмандар тізімінен таңдау
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Мысалы: Айдос Нұрланұлы"
                    value={formRecipientName}
                    onChange={(e) => setFormRecipientName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />

                  {/* Reader Dropdown Picker */}
                  {showReaderDropdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: '#FFFFFF',
                        borderRadius: '14px',
                        border: '1.5px solid #CBD5E1',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                        marginTop: '6px',
                        padding: '10px',
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Оқырманды іздеу..."
                        value={readerSearchQuery}
                        onChange={(e) => setReaderSearchQuery(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                          fontSize: '12.5px',
                          outline: 'none',
                          marginBottom: '8px',
                          boxSizing: 'border-box',
                        }}
                      />
                      {filteredReaders.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => handleSelectReader(r)}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 700,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span>{r.name}</span>
                          <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                            {r.idNumber || r.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Title */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Сертификат атауы <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Үздік оқырман сертификаты"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 700,
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* 4. Description / Reason */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Не үшін берілді (Жетістік сипаттамасы)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="39-аптадағы белсенді тыңдалымы және 1-орын алған жоғары нәтижесі үшін"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13.5px',
                      outline: 'none',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* 5. Category & Issued Date (2 Columns) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                      Санаты
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '11px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="READER_TOP_10">Үздік оқырман (Топ 10)</option>
                      <option value="MONTHLY_MARATHON">Айлық марафон</option>
                      <option value="SPECIAL_AWARD">Арнайы марапат</option>
                      <option value="HONOR">Құрмет грамотасы</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                      Берілген күні <span style={{ color: '#EF4444' }}>*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formIssuedAt}
                      onChange={(e) => setFormIssuedAt(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '12px',
                        border: '1.5px solid #CBD5E1',
                        background: '#FFFFFF',
                        fontSize: '13.5px',
                        fontWeight: 700,
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* 6. PDF / File / Telegram Attachment Section */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1.5px solid #CBD5E1',
                    borderRadius: '16px',
                    padding: '16px 20px',
                  }}
                >
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                      Сертификат құжатын бекіту (PDF, Сурет немесе Telegram сілтемесі)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                      Оқырман сканерлегенде түпнұсқаны тікелей жүктей алады немесе Telegram арнадан көре алады
                    </div>
                  </div>

                  {/* Mode Tabs */}
                  <div
                    style={{
                      display: 'flex',
                      background: '#E2E8F0',
                      borderRadius: '10px',
                      padding: '3px',
                      marginBottom: '14px',
                      gap: '4px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setFileSourceTab('upload')}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: fileSourceTab === 'upload' ? '#FFFFFF' : 'transparent',
                        color: fileSourceTab === 'upload' ? 'var(--blue)' : '#64748B',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: fileSourceTab === 'upload' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      📁 Файл жүктеу (PDF / Сурет)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFileSourceTab('link')}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: fileSourceTab === 'link' ? '#FFFFFF' : 'transparent',
                        color: fileSourceTab === 'link' ? 'var(--blue)' : '#64748B',
                        fontSize: '12.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: fileSourceTab === 'link' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      🔗 Сілтеме қою (Telegram / URL)
                    </button>
                  </div>

                  {/* TAB 1: FILE UPLOAD */}
                  {fileSourceTab === 'upload' ? (
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,image/png,image/jpeg,image/webp"
                        style={{ display: 'none' }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                          type="button"
                          disabled={isUploadingFile}
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            padding: '9px 18px',
                            borderRadius: '10px',
                            border: '1.5px solid var(--blue)',
                            background: '#FFFFFF',
                            color: 'var(--blue)',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          {isUploadingFile ? 'Жүктелуде...' : '📁 Компьютерден / Телефоннан таңдау'}
                        </button>
                        <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                          PDF, PNG, JPG (макс 50MB)
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* TAB 2: DIRECT LINK (TELEGRAM / EXTERNAL) */
                    <div>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="url"
                          placeholder="https://t.me/tanda_kz/... немесе кез келген файл сілтемесі"
                          value={formPdfUrl}
                          onChange={(e) => setFormPdfUrl(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid #CBD5E1',
                            background: '#FFFFFF',
                            fontSize: '13px',
                            color: '#0F172A',
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '6px' }}>
                        💡 Телеграм каналдағы посттың сілтемесін немесе Google Drive / бұлттық қоймадағы файл сілтемесін қойыңыз.
                      </div>
                    </div>
                  )}

                  {/* Attached URL status indicator */}
                  {formPdfUrl && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#FFFFFF',
                        padding: '8px 12px',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        marginTop: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <span style={{ fontSize: '12.5px', color: '#16A34A', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          ✓ Тіркелді:
                        </span>
                        <a
                          href={formPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '12px',
                            color: 'var(--blue)',
                            textDecoration: 'underline',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '320px',
                          }}
                        >
                          {formPdfUrl}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormPdfUrl('')}
                        style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: '12px', fontWeight: 800, cursor: 'pointer', flexShrink: 0 }}
                      >
                        Өшіру
                      </button>
                    </div>
                  )}
                </div>

                {/* Submit / Cancel Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{
                      padding: '11px 20px',
                      borderRadius: '12px',
                      border: '1.5px solid #CBD5E1',
                      background: '#FFFFFF',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: '#475569',
                      cursor: 'pointer',
                    }}
                  >
                    Бас тарту
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting || Boolean(numberAvailability && !numberAvailability.available)}
                    style={{
                      padding: '11px 24px',
                      borderRadius: '12px',
                      border: 'none',
                      background: 'var(--blue)',
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      cursor: isSubmitting || Boolean(numberAvailability && !numberAvailability.available) ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || Boolean(numberAvailability && !numberAvailability.available) ? 0.6 : 1,
                    }}
                  >
                    {isSubmitting ? 'Сақталуда...' : editingCert ? 'Өзгерістерді сақтау' : 'Сертификатты жасау'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: QR CODE VIEW & DOWNLOAD                                          */}
        {/* ========================================================================= */}
        {qrModalCert && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '460px',
                padding: '30px',
                textAlign: 'center',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  Ресми QR-код
                </h3>
                <button
                  type="button"
                  onClick={() => setQrModalCert(null)}
                  style={{
                    background: '#F1F5F9',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    fontSize: '16px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    color: '#64748B',
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  background: '#FFFFFF',
                  padding: '20px',
                  borderRadius: '20px',
                  border: '2px solid #E2E8F0',
                  display: 'inline-block',
                  marginBottom: '16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                }}
              >
                <QRCodeSVG
                  id={`qr-modal-svg-${qrModalCert.id}`}
                  value={qrModalCert.verificationUrl || `https://tanda-xi.vercel.app/verify/cert/${qrModalCert.certificateNumber}`}
                  size={220}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '4px' }}>
                {qrModalCert.recipientName}
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#B45309', fontFamily: 'monospace', marginBottom: '20px' }}>
                № {qrModalCert.certificateNumber}
              </div>

              {/* Action buttons inside QR Modal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => downloadQrCodePng(qrModalCert)}
                  style={{
                    padding: '12px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'linear-gradient(135deg, var(--blue) 0%, #0284C7 100%)',
                    color: '#FFFFFF',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  📥 QR-кодты сурет ретінде жүктеп алу (PNG)
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(qrModalCert.verificationUrl || `https://tanda-xi.vercel.app/verify/cert/${qrModalCert.certificateNumber}`)}
                  style={{
                    padding: '11px',
                    borderRadius: '14px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    color: '#0F172A',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🔗 Тексеру сілтемесін көшіру
                </button>

                <a
                  href={`/verify/cert/${qrModalCert.certificateNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'block',
                  }}
                >
                  ↗️ Тексеру беті қалай көрінетінін ашу
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: DELETE CONFIRMATION                                              */}
        {/* ========================================================================= */}
        {certToDelete && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
            }}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '440px',
                padding: '28px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#DC2626', margin: '0 0 10px' }}>
                Сертификатты өшіру
              </h3>
              <p style={{ fontSize: '13.5px', color: '#475569', margin: '0 0 20px', lineHeight: '1.5' }}>
                <strong>«{certToDelete.recipientName}»</strong> алушысына берілген <strong>№ {certToDelete.certificateNumber}</strong> сертификатын өшіруге сенімдісіз бе?
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCertToDelete(null)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    background: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Бас тарту
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Өшіру
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
