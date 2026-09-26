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

  const CERT_NUMBER_PATTERN = /^TND-\d{4}-\d{6}$/;

  const formatDateKz = (dateStr?: string) => {
    if (!dateStr) return '';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}.${match[2]}.${match[1]}`;
    }
    return dateStr;
  };

  const isValidDate = (dateStr: string) => {
    if (!dateStr) return false;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (year < 2020 || year > 2099) return false;
    if (month < 1 || month > 12) return false;
    const d = new Date(year, month - 1, day);
    return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
  };

  // Check number availability on blur or change
  const handleNumberChange = async (val: string) => {
    const upper = val.toUpperCase().trim();
    setFormNumber(upper);
    if (!upper) {
      setNumberAvailability(null);
      return;
    }
    if (!CERT_NUMBER_PATTERN.test(upper)) {
      setNumberAvailability({
        available: false,
        message: 'Қате формат! Нөмір соңында міндетті түрде 6 сан болуы керек (мысалы: TND-2026-000001)',
      });
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
    setFormTitle('');
    setFormDescription('');
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
    if (!formIssuedAt || !isValidDate(formIssuedAt)) {
      showToast('Берілген күні қате! Күнді 12.09.2026 форматында таңдаңыз (жыл 2020 мен 2099 аралығында)', 'error');
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
    <div style={{ maxWidth: '1380px', width: '100%', margin: '0 auto', padding: '32px 40px 80px' }}>
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
              placeholder="Сертификаттарды іздеу..."
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
              <option value="SPONSOR">Демеушілерге</option>
              <option value="PARTNER">Серіктестерге</option>
              <option value="AUTHOR">Авторларға</option>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--blue)', marginBottom: '14px' }}>
                      {cert.title}
                    </div>

                    {/* Meta info: Date & Issuer */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748B', marginBottom: '16px' }}>
                      <span>Берілген күні: <strong style={{ color: '#0F172A' }}>{formatDateKz(cert.issuedAt)}</strong></span>
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
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          background: '#F8FAFC',
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCertToDelete(cert)}
                        title="Өшіру"
                        style={{
                          padding: '8px 10px',
                          borderRadius: '10px',
                          border: '1px solid #FECACA',
                          background: '#FEF2F2',
                          color: '#DC2626',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
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
                        background: '#EFF6FF',
                        border: '1px solid #DBEAFE',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        color: 'var(--blue, #005494)',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      Автоматты нөмір қою
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

                {/* 2. Recipient Name */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Алушының аты-жөні <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
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
                </div>

                {/* 3. Title */}
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: '6px' }}>
                    Сертификат атауы <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
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
                    Не үшін берілді
                  </label>
                  <textarea
                    rows={3}
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
                      <option value="SPONSOR">Демеушілерге</option>
                      <option value="PARTNER">Серіктестерге</option>
                      <option value="AUTHOR">Авторларға</option>
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
                      min="2020-01-01"
                      max="2099-12-31"
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
                      Сертификат құжатын бекіту
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: fileSourceTab === 'upload' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                      </svg>
                      Файл жүктеу (PDF / Сурет)
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
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: fileSourceTab === 'link' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      Сілтеме қою (Telegram / URL)
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
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="17 8 12 3 7 8"></polyline>
                            <line x1="12" y1="3" x2="12" y2="15"></line>
                          </svg>
                          {isUploadingFile ? 'Жүктелуде...' : 'Компьютерден / Телефоннан таңдау'}
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
                        Телеграм каналдағы посттың сілтемесін немесе Google Drive / бұлттық қоймадағы файл сілтемесін қойыңыз.
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  QR-кодты сурет ретінде жүктеп алу (PNG)
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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                  </svg>
                  Тексеру сілтемесін көшіру
                </button>

                <a
                  href={qrModalCert.verificationUrl || `/verify/cert/${qrModalCert.certificateNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '11px',
                    borderRadius: '12px',
                    background: '#F1F5F9',
                    color: '#475569',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Тексеру беті қалай көрінетінін ашу
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
