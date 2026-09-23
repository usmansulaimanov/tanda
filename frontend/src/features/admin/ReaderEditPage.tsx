import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore, validatePasswordComplexity, generateCompliantPassword } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { User } from '../../types';
import { api } from '../../lib/api';

const kazakhMonths = [
  'қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым',
  'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'
];

const toDotFormat = (val?: string): string => {
  if (!val) return '';
  if (val.includes('-')) {
    const p = val.split('-');
    if (p.length === 3) return `${p[2]}.${p[1]}.${p[0]}`;
  }
  return val;
};

const formatDateInput = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
};

const formatKazakhDate = (val: string) => {
  if (!val) return '';
  let day = 0, monthIdx = -1, year = '';
  if (val.includes('.')) {
    const p = val.split('.');
    if (p.length === 3) {
      day = parseInt(p[0], 10);
      monthIdx = parseInt(p[1], 10) - 1;
      year = p[2];
    }
  } else if (val.includes('-')) {
    const p = val.split('-');
    if (p.length === 3) {
      year = p[0];
      monthIdx = parseInt(p[1], 10) - 1;
      day = parseInt(p[2], 10);
    }
  }
  if (monthIdx >= 0 && monthIdx <= 11 && day > 0 && year.length === 4) {
    return `${day} ${kazakhMonths[monthIdx]} ${year} жыл`;
  }
  return val;
};

const formatDisplayDate = (d?: string | null) => {
  if (!d) return '—';
  try {
    if (d.includes('.')) {
      const p = d.split('.');
      if (p.length === 3) {
        const dt = new Date(parseInt(p[2], 10), parseInt(p[1], 10) - 1, parseInt(p[0], 10));
        if (!isNaN(dt.getTime())) {
          return dt.toLocaleDateString('kk-KZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      }
    }
    return new Date(d).toLocaleDateString('kk-KZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return d;
  }
};

const formatPhoneNumber = (val: string): string => {
  if (!val) return '';

  const isPrefixed = val.trim().startsWith('+');
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';

  let national = '';
  if (isPrefixed) {
    national = digits.substring(1, 11);
  } else if ((digits.startsWith('8') || digits.startsWith('7')) && digits.length === 11) {
    national = digits.substring(1, 11);
  } else if (digits === '8' && digits.length === 1) {
    return '';
  } else {
    national = digits.substring(0, 10);
  }

  if (!national) return '';

  let res = '+7 (';
  res += national.substring(0, Math.min(3, national.length));
  if (national.length > 3) {
    res += ') ' + national.substring(3, Math.min(6, national.length));
  }
  if (national.length > 6) {
    res += '-' + national.substring(6, Math.min(8, national.length));
  }
  if (national.length > 8) {
    res += '-' + national.substring(8, Math.min(10, national.length));
  }
  return res;
};

const getPhoneNationalDigitsCount = (val: string): number => {
  if (!val) return 0;
  const isPrefixed = val.trim().startsWith('+');
  const digits = val.replace(/\D/g, '');
  if (!digits) return 0;

  if (isPrefixed) {
    return digits.substring(1, 11).length;
  }
  if ((digits.startsWith('8') || digits.startsWith('7')) && digits.length === 11) {
    return digits.substring(1, 11).length;
  }
  if (digits === '8' && digits.length === 1) return 0;
  return Math.min(digits.length, 10);
};

export const ReaderEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getUserById,
    updateUserByAdmin,
    checkUsernameAvailable,
    checkIdNumberAvailable,
    grantBirthdayGiftManually,
    resetBirthdayGiftHistory,
  } = useAuthStore();
  const { showToast } = useToastStore();

  const birthDateInputRef = useRef<HTMLInputElement>(null);

  const [reader, setReader] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [idNumberError, setIdNumberError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [role, setRole] = useState<'client' | 'admin' | 'author'>('client');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [messageText, setMessageText] = useState('');
  const [messageDays, setMessageDays] = useState(7);
  const [isMessageActive, setIsMessageActive] = useState(true);
  const [existingExpiresAt, setExistingExpiresAt] = useState<string | null>(null);
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const loadUser = async () => {
      let found = getUserById(id);
      if (!found) {
        try {
          const { data } = await api.get(`/api/v1/admin/users/${id}`);
          if (data) found = data;
        } catch {}
      }

      if (found) {
        setReader(found);
        if (found.firstName || found.lastName) {
          setFirstName(found.firstName || '');
          setLastName(found.lastName || '');
        } else if (found.name) {
          const parts = found.name.trim().split(/\s+/);
          if (parts.length > 1) {
            setFirstName(parts[0]);
            setLastName(parts.slice(1).join(' '));
          } else {
            setFirstName(found.name);
            setLastName('');
          }
        } else {
          setFirstName('');
          setLastName('');
        }
        setEmail(found.email || '');
        setBirthDate(toDotFormat(found.birthDate) || '');
        setPassword(found.password || '123456');
        setIdNumber(found.idNumber || '');
        setPhone(found.phone ? formatPhoneNumber(found.phone) : '');
        setUsername(found.username ? (found.username.startsWith('@') ? found.username : `@${found.username}`) : '');
        setRole(found.role || 'client');
        setIsActive(found.isActive !== false);

        if (found.personalMessage) {
          setMessageText(found.personalMessage.text || '');
          setMessageDays(found.personalMessage.days || 7);
          setIsMessageActive(found.personalMessage.isActive !== false);
          setExistingExpiresAt(found.personalMessage.expiresAt || null);
        }
      }
      setIsLoading(false);
    };

    loadUser();
  }, [id, getUserById]);

  const handleIdNumberChange = (val: string) => {
    setIdNumber(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setIdNumberError('');
      return;
    }
    const res = checkIdNumberAvailable(trimmed, id);
    if (!res.available) {
      setIdNumberError(res.error || 'Бұл ID нөмірі тіркеліп қойған');
    } else {
      setIdNumberError('');
    }
  };

  const handlePhoneChange = (val: string) => {
    const formatted = formatPhoneNumber(val);
    setPhone(formatted);

    if (!formatted.trim()) {
      setPhoneError('');
      return;
    }

    const count = getPhoneNationalDigitsCount(formatted);
    if (count > 0 && count < 10) {
      setPhoneError('Телефон нөмірін толық жазыңыз (+7 (777) 123-45-67) немесе бос қалдырыңыз');
    } else {
      setPhoneError('');
    }
  };

  const handleUsernameChange = (val: string) => {
    let clean = val.trim().toLowerCase();
    if (!clean.startsWith('@') && clean.length > 0) {
      clean = `@${clean}`;
    }
    setUsername(clean);

    const raw = clean.replace(/^@/, '');
    if (raw) {
      const res = checkUsernameAvailable(raw, id);
      if (!res.available) {
        setUsernameError(res.error || 'Бұл пайдаланушы аты (username) тіркеліп қойған');
      } else {
        setUsernameError('');
      }
    } else {
      setUsernameError('');
    }
  };

  const generateRandomPassword = () => {
    const res = generateCompliantPassword(10);
    setPassword(res);
    setShowPassword(true);
    showToast('Ережеге сай кездейсоқ құпиясөз құрастырылды!', 'info');
  };

  const handleGrantBirthdayGift = async () => {
    if (!id || !reader) return;
    const res = await grantBirthdayGiftManually(id);
    if (res.success) {
      const updated = getUserById(id);
      if (updated) setReader(updated);
      showToast('Оқырманға 1 айлық Премиум сыйлығы сәтті қосылды және хабарландыру жіберілді!', 'success');
    } else {
      showToast(res.error || 'Сыйлық қосу кезінде қате орын алды', 'error');
    }
  };

  const handleResetBirthdayGift = async () => {
    if (!id || !reader) return;
    const res = await resetBirthdayGiftHistory(id);
    if (res.success) {
      const updated = getUserById(id);
      if (updated) setReader(updated);
      showToast('Туған күн сыйлық тарихы тазартылды. Енді оқырман осы жылы сыйлықты қайта ала алады.', 'info');
    } else {
      showToast(res.error || 'Тазарту кезінде қате орын алды', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reader) return;

    if (!firstName.trim()) {
      showToast('Оқырманның атын енгізіңіз', 'error');
      return;
    }
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

    if (!email.trim()) {
      showToast('Электронды поштасын енгізіңіз', 'error');
      return;
    }

    if (password.trim()) {
      const passValidation = validatePasswordComplexity(password.trim());
      if (!passValidation.valid) {
        showToast(passValidation.error || 'Құпиясөз кемінде 8 таңбадан тұруы керек', 'error');
        return;
      }
    }

    // ID Number validation
    if (idNumber.trim()) {
      const idCheck = checkIdNumberAvailable(idNumber.trim(), id);
      if (!idCheck.available) {
        setIdNumberError(idCheck.error || 'Бұл ID нөмірі басқа оқырманға тіркелген');
        showToast(idCheck.error || 'Бұл ID нөмірі басқа оқырманға тіркелген', 'error');
        return;
      }
    }

    // Phone validation: either empty or 10 digits
    const phoneCount = getPhoneNationalDigitsCount(phone);
    if (phone.trim() && phoneCount < 10) {
      const errMsg = 'Телефон нөмірін толық жазыңыз (+7 (777) 123-45-67) немесе бос қалдырыңыз';
      setPhoneError(errMsg);
      showToast(errMsg, 'error');
      return;
    }

    const rawUser = username.trim().replace(/^@/, '');
    if (rawUser) {
      const check = checkUsernameAvailable(rawUser, id);
      if (!check.available) {
        setUsernameError(check.error || 'Бұл пайдаланушы аты (username) тіркеліп қойған');
        showToast(check.error || 'Бұл пайдаланушы аты (username) тіркеліп қойған', 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updateUserByAdmin(id, {
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        birthDate: birthDate || undefined,
        phone: phone.trim(),
        password: password.trim() || undefined,
        username: rawUser,
        idNumber: idNumber.trim() || undefined,
        role,
        isActive,
        personalMessage: messageText.trim()
          ? {
              text: messageText.trim(),
              days: messageDays,
              isActive: isMessageActive,
            }
          : null,
      });

      if (res.success) {
        showToast('Оқырман мәліметтері сәтті сақталды!', 'success');
        navigate('/admin/readers');
      } else {
        showToast(res.error || 'Сақтау кезінде қате орын алды', 'error');
      }
    } catch {
      showToast('Оқырман мәліметтерін сақтау сәтсіз аяқталды', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '860px', margin: '40px auto', padding: '0 24px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-mid)', fontSize: '15px' }}>Оқырман деректері жүктелуде...</p>
      </div>
    );
  }

  if (!reader) {
    return (
      <div style={{ maxWidth: '600px', margin: '60px auto', padding: '0 24px', textAlign: 'center' }}>
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '48px 32px',
            boxShadow: '0 12px 36px rgba(0, 84, 148, 0.08)',
            border: '1px solid #E2E8F0',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#FEF2F2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>
            Оқырман табылмады
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Ізделінген оқырман тізімде жоқ немесе жүйеден өшірілген болуы мүмкін.
          </p>
          <Link
            to="/admin/readers"
            className="btn-primary"
            style={{ padding: '12px 32px', fontSize: '14px', textDecoration: 'none' }}
          >
            Оқырмандар тізіміне оралу
          </Link>
        </div>
      </div>
    );
  }

  const initialLetter = firstName ? firstName.trim().charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'О');
  const dateStr = reader.createdAt ? new Date(reader.createdAt).toLocaleDateString('kk-KZ') : '2026-09-01';

  return (
    <section className="admin-page-section" style={{ padding: '32px 16px 80px', backgroundColor: '#F8FAFC', minHeight: 'calc(100vh - 80px)' }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        
        {/* Top Breadcrumb & Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#64748B' }}>
            <Link to="/admin" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              Басқару панелі
            </Link>
            <span>/</span>
            <Link to="/admin/readers" style={{ color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
              Оқырмандар тізімі
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--text-dark)', fontWeight: 700 }}>
              Оқырманды өңдеу
            </span>
          </div>

          <Link
            to="/admin/readers"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--blue)',
              textDecoration: 'none',
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1.5px solid #CBD5E1',
              transition: 'all 0.15s',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Оқырмандар тізіміне қайту
          </Link>
        </div>

        {/* Main Card */}
        <div
          className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-7 md:p-9 border border-slate-200 shadow-sm"
        >
          {/* Header Summary Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              paddingBottom: '28px',
              borderBottom: '1.5px solid #F1F5F9',
              marginBottom: '32px',
              flexWrap: 'wrap',
            }}
          >
            <div
              onClick={() => setIsAvatarModalOpen(true)}
              title="Суретті ашып көру үшін басыңыз"
              style={{
                position: 'relative',
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(0, 84, 148, 0.2)',
                flexShrink: 0,
                cursor: 'pointer',
                border: '2.5px solid #FFFFFF',
                outline: '2px solid var(--blue)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={reader.avatarUrl || '/default-reader-avatar.jpg'}
                  alt={reader.name || 'Оқырман'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              {/* Magnifying glass badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--blue)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  border: '2px solid #FFFFFF',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                {reader.name || 'Оқырман'}
              </h1>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '6px',
                  color: 'var(--text-mid)',
                  fontSize: '13px',
                  flexWrap: 'wrap',
                }}
              >
                <span>{reader.email}</span>
                <span>•</span>
                <span>Тіркелген күні: <strong>{dateStr}</strong></span>
              </div>
            </div>
          </div>

          {/* Form Section Header */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
              Оқырман деректерін өзгерту
            </h2>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit}>
            
            {/* Row 1: First Name and Last Name */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              {/* First Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Аты <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Мысалы: Usman"
                  className="form-input"
                />
              </div>

              {/* Last Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Фамилиясы
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Мысалы: Sulaimanov"
                  className="form-input"
                />
              </div>
            </div>

            {/* Row 2: ID Number and Email */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              {/* ID Number */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  ID нөмірі
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => handleIdNumberChange(e.target.value)}
                  placeholder="0000 1002"
                  className="form-input"
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    borderColor: idNumberError ? '#DC2626' : undefined,
                    boxShadow: idNumberError ? '0 0 0 3px rgba(220, 38, 38, 0.12)' : undefined,
                  }}
                />
                {idNumberError && (
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                    {idNumberError}
                  </span>
                )}
              </div>

              {/* Email */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Электронды пошта (Email) <span className="req">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="reader@tanda.kz"
                  className="form-input"
                />
              </div>
            </div>

            {/* Row 3: Username and Phone */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              {/* Username */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="@usman"
                  className="form-input"
                  style={{
                    borderColor: usernameError ? '#DC2626' : undefined,
                    fontWeight: 700,
                  }}
                />
                {usernameError && (
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                    {usernameError}
                  </span>
                )}
              </div>

              {/* Phone */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Телефон нөмірі
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    placeholder="+7 (777) 123-45-67"
                    className="form-input"
                    style={{
                      borderColor: phoneError ? '#DC2626' : undefined,
                      fontWeight: phone ? 700 : 500,
                      letterSpacing: phone ? '0.03em' : 'normal',
                      paddingRight: phone ? '36px' : undefined,
                    }}
                  />
                  {phone && (
                    <button
                      type="button"
                      onClick={() => handlePhoneChange('')}
                      title="Нөмірді өшіру"
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: '#E2E8F0',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#475569',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {phoneError && (
                  <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                    {phoneError}
                  </span>
                )}
              </div>
            </div>

            {/* Row 4: Birth Date and Password */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '28px',
              }}
            >
              {/* Birth Date */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Туған күні
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={birthDate}
                    onChange={(e) => setBirthDate(formatDateInput(e.target.value))}
                    placeholder="кк.аа.жжжж (мысалы: 15.10.1998)"
                    maxLength={10}
                    className="form-input"
                    style={{
                      paddingRight: birthDate ? '68px' : '40px',
                      fontWeight: birthDate ? 700 : 500,
                      letterSpacing: birthDate ? '0.04em' : 'normal',
                    }}
                  />
                  <input
                    ref={birthDateInputRef}
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        const p = val.split('-');
                        if (p.length === 3) setBirthDate(`${p[2]}.${p[1]}.${p[0]}`);
                      }
                    }}
                    tabIndex={-1}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      pointerEvents: 'none',
                      width: '1px',
                      height: '1px',
                      bottom: 0,
                      right: 0,
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {birthDate && (
                      <button
                        type="button"
                        onClick={() => setBirthDate('')}
                        title="Күнді өшіру"
                        style={{
                          background: '#E2E8F0',
                          border: 'none',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#475569',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          birthDateInputRef.current?.showPicker();
                        } catch {
                          birthDateInputRef.current?.focus();
                        }
                      }}
                      title="Күнтізбені ашу"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Құпиясөз
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--blue)',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Авто-құрастыру
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Кемінде 8 таңба"
                    className="form-input"
                    style={{ paddingRight: '42px', fontWeight: 600 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748B',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={showPassword ? 'Жасыру' : 'Көрсету'}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                        <line x1="1" y1="1" x2="23" y2="23"></line>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Row: Reader Status (Белсенді / Блокталған) */}
            <div
              style={{
                background: isActive ? '#F0FDF4' : '#FEF2F2',
                border: `1.5px solid ${isActive ? '#BBF7D0' : '#FECACA'}`,
                borderRadius: '16px',
                padding: '18px 22px',
                marginBottom: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                transition: 'all 0.2s',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: isActive ? '#10B981' : '#DC2626',
                    }}
                  />
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                    Оқырман мәртебесі: <span style={{ color: isActive ? '#15803D' : '#B91C1C' }}>{isActive ? 'Белсенді' : 'Блокталған'}</span>
                  </h3>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-mid)' }}>
                  {isActive
                    ? 'Оқырман жүйеге еркін кіріп, кітаптарды оқи алады.'
                    : 'Оқырман бұғатталған: жүйеге кіре алмайды және бұл деректерге жаңа аккаунт ашылмайды.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  border: `1.5px solid ${isActive ? '#FCA5A5' : '#86EFAC'}`,
                  background: isActive ? '#FEF2F2' : '#F0FDF4',
                  color: isActive ? '#DC2626' : '#15803D',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isActive ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                    </svg>
                    Оқырманды блоктау
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    Блоктан шығару
                  </>
                )}
              </button>
            </div>

            {/* Row 4: Personal Message to Reader (Басты беттегі жеке хабарлама) */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid #E2E8F0',
                borderRadius: '16px',
                padding: '20px 24px',
                marginBottom: '28px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>
                    Оқырманға арналған жеке хабарлама
                  </h3>
                </div>

                {/* Toggle Enable */}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: isMessageActive ? 'var(--blue)' : '#64748B' }}>
                  <input
                    type="checkbox"
                    checked={isMessageActive}
                    onChange={(e) => setIsMessageActive(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--blue)', cursor: 'pointer' }}
                  />
                  <span>Басты бетте көрсету</span>
                </label>
              </div>

              {/* Message Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label" style={{ fontSize: '12px' }}>
                  Хабарлама мәтіні
                </label>
                <textarea
                  rows={2}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Мысалы: Қош келдіңіз! Сізге кітаптарды оқуға арналған 30 күндік арнайы сыйлық берілді."
                  className="form-input"
                  style={{ resize: 'vertical', minHeight: '64px', fontSize: '13px', lineHeight: 1.5 }}
                />
              </div>

              {/* Message Duration (Days) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '180px' }}>
                  <label className="form-label" style={{ fontSize: '12px', marginBottom: '6px' }}>
                    Көріну мерзімі (күнмен):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={messageDays}
                      onChange={(e) => setMessageDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="form-input"
                      style={{ width: '90px', textAlign: 'center', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)' }}>күн</span>
                  </div>
                </div>

                {/* Quick day presets */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '18px' }}>
                  {[1, 3, 7, 14, 30].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setMessageDays(d)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: messageDays === d ? '1.5px solid var(--blue)' : '1px solid #CBD5E1',
                        background: messageDays === d ? 'rgba(0, 87, 168, 0.1)' : '#FFFFFF',
                        color: messageDays === d ? 'var(--blue)' : '#475569',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {d} күн
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Note */}
              {existingExpiresAt && messageText.trim() && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1', fontSize: '12px', color: '#64748B' }}>
                  Қазіргі жағдайы: <strong style={{ color: new Date(existingExpiresAt).getTime() < Date.now() ? '#DC2626' : '#059669' }}>
                    {new Date(existingExpiresAt).getTime() < Date.now()
                      ? 'Мерзімі аяқталған'
                      : `Белсенді (${new Date(existingExpiresAt).toLocaleDateString('kk-KZ')} дейін)`}
                  </strong>
                </div>
              )}
            </div>

            {/* Birthday Gift & 1-Month Premium Management */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
                border: '1.5px solid #FCD34D',
                borderRadius: '16px',
                padding: '22px 24px',
                marginBottom: '28px',
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#92400E" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 12 20 22 4 22 4 12"></polyline>
                    <rect x="2" y="7" width="20" height="5"></rect>
                    <line x1="12" y1="22" x2="12" y2="7"></line>
                    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path>
                    <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>
                  </svg>
                  <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#92400E', margin: 0 }}>
                    Туған күн сыйлығы (1 айлық Премиум)
                  </h3>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    background: '#FEF3C7',
                    border: '1px solid #F59E0B',
                    color: '#B45309',
                  }}
                >
                  Жылына 1 рет
                </span>
              </div>

              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#78350F', lineHeight: 1.6 }}>
                Оқырман туған күнінде жүйеге кіргенде немесе осы панель арқылы жылына 1 рет автоматты түрде <strong>30 күндік тегін Премиум подписка</strong> мен арнайы құттықтау хабарламасы беріледі. Оқырман жеке кабинетінде туған күнін ауыстырса да, жүйе бір күнтізбелік жылда екінші рет сыйлық бермейді. <em>(Бұл басқару панелі тек әкімшіге көрінеді)</em>.
              </p>

              {/* Status details grid */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.85)',
                  borderRadius: '12px',
                  padding: '14px 18px',
                  border: '1px solid #FDE68A',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>
                    Оқырманның туған күні:
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E293B' }}>
                    {birthDate ? formatKazakhDate(birthDate) : 'Белгіленбеген'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>
                    {new Date().getFullYear()} жылғы сыйлық мәртебесі:
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: reader.lastBirthdayGiftYear === new Date().getFullYear() ? '#15803D' : '#D97706' }}>
                    {reader.lastBirthdayGiftYear === new Date().getFullYear()
                      ? `Берілді (${formatDisplayDate(reader.lastBirthdayGiftDate)})`
                      : 'Әлі берілмеген'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400E', marginBottom: '2px' }}>
                    Премиум мерзімі:
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: reader.isPremium ? '#15803D' : '#64748B' }}>
                    {reader.isPremium
                      ? `Белсенді (${formatDisplayDate(reader.premiumExpiresAt)})`
                      : 'Премиум жоқ'}
                  </div>
                </div>
              </div>

              {/* Action Buttons for Admin */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleGrantBirthdayGift}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #D97706',
                    background: '#D97706',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  Сыйлықты қазір қосу (+30 күн Премиум)
                </button>

                {reader.lastBirthdayGiftYear && (
                  <button
                    type="button"
                    onClick={handleResetBirthdayGift}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: '#FFFFFF',
                      color: '#64748B',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s',
                    }}
                    title="Осы жылғы сыйлық тарихын тазартып, оқырманға қайта сыйлық алуға рұқсат беру"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                      <path d="M21 3v5h-5"></path>
                      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                      <path d="M8 16H3v5"></path>
                    </svg>
                    Тарихты тазарту
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
                paddingTop: '20px',
                borderTop: '1.5px solid #F1F5F9',
                flexWrap: 'wrap',
              }}
            >
              <Link
                to="/admin/readers"
                style={{
                  padding: '12px 24px',
                  borderRadius: '50px',
                  background: '#F1F5F9',
                  color: 'var(--text-mid)',
                  border: 'none',
                  fontSize: '14px',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                Бас тарту
              </Link>

              <button
                type="submit"
                disabled={isSaving || Boolean(usernameError) || Boolean(phoneError)}
                className="btn-primary"
                style={{
                  padding: '12px 32px',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: 'var(--blue)',
                  opacity: isSaving || Boolean(usernameError) || Boolean(phoneError) ? 0.6 : 1,
                  cursor: isSaving || Boolean(usernameError) || Boolean(phoneError) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                {isSaving ? 'Сақталуда...' : 'Өзгерістерді сақтау'}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Avatar Preview Modal */}
      {isAvatarModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(13, 27, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1400,
            padding: '24px',
          }}
          onClick={() => setIsAvatarModalOpen(false)}
        >
          <div
            style={{
              position: 'relative',
              background: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '460px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 22px',
                borderBottom: '1px solid #F1F5F9',
                boxSizing: 'border-box',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)' }}>
                  {reader.name || 'Оқырман'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-mid)' }}>
                  Оқырманның профиль суреті
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvatarModalOpen(false)}
                title="Жабу"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#F1F5F9',
                  color: '#64748B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Image Body */}
            <div
              style={{
                width: '100%',
                padding: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#F8FAFC',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: '320px',
                  maxWidth: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 32px rgba(0, 84, 148, 0.15)',
                  border: '3px solid #FFFFFF',
                  background: '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={reader.avatarUrl || '/default-reader-avatar.jpg'}
                  alt={reader.name || 'Оқырман суреті'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </div>

            {/* Modal Footer / Info */}
            <div
              style={{
                width: '100%',
                padding: '14px 22px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #F1F5F9',
                boxSizing: 'border-box',
                background: '#FFFFFF',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  background: 'rgba(0, 84, 148, 0.08)',
                  color: 'var(--blue)',
                  padding: '3px 10px',
                  borderRadius: '4px',
                }}
              >
                ID: {reader.idNumber || reader.id}
              </span>

              {reader.avatarUrl && (
                <a
                  href={reader.avatarUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: 'var(--blue)',
                    textDecoration: 'none',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <line x1="10" y1="14" x2="21" y2="3"></line>
                  </svg>
                  Түпнұсқасын ашу
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
