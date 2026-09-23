import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

const formatKazakhDate = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
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

export const ReaderCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const { createReaderByAdmin, checkUsernameAvailable, checkIdNumberAvailable, getNextAvailableIdNumber } = useAuthStore();
  const { showToast } = useToastStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const datePickerInputRef = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [idNumber, setIdNumber] = useState('');
  const [idNumberError, setIdNumberError] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [role, setRole] = useState<'client' | 'admin'>('client');
  const [messageText, setMessageText] = useState('');
  const [messageDays, setMessageDays] = useState(7);
  const [isMessageActive, setIsMessageActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate default next available unique ID Number
  useEffect(() => {
    try {
      const nextId = getNextAvailableIdNumber();
      setIdNumber(nextId);
    } catch {
      setIdNumber('0000 5001');
    }
  }, [getNextAvailableIdNumber]);

  const handleIdNumberChange = (val: string) => {
    setIdNumber(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setIdNumberError('ID нөмірін енгізіңіз');
      return;
    }
    const res = checkIdNumberAvailable(trimmed);
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
      const res = checkUsernameAvailable(raw);
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
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(res);
    setShowPassword(true);
    showToast('Кездейсоқ құпиясөз құрастырылды!', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim()) {
      showToast('Оқырманның атын енгізіңіз', 'error');
      return;
    }
    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

    if (!email.trim()) {
      showToast('Электронды поштасын енгізіңіз', 'error');
      return;
    }
    if (!password.trim() || password.length < 6) {
      showToast('Құпиясөз кемінде 6 таңбадан тұруы керек', 'error');
      return;
    }

    // ID Number validation
    if (!idNumber.trim()) {
      setIdNumberError('ID нөмірін енгізіңіз');
      showToast('ID нөмірін енгізіңіз', 'error');
      return;
    }
    const idCheck = checkIdNumberAvailable(idNumber.trim());
    if (!idCheck.available) {
      setIdNumberError(idCheck.error || 'Бұл ID нөмірі басқа оқырманға тіркелген');
      showToast(idCheck.error || 'Бұл ID нөмірі басқа оқырманға тіркелген', 'error');
      return;
    }

    // Phone validation
    const phoneCount = getPhoneNationalDigitsCount(phone);
    if (phone.trim() && phoneCount < 10) {
      const errMsg = 'Телефон нөмірін толық жазыңыз (+7 (777) 123-45-67) немесе бос қалдырыңыз';
      setPhoneError(errMsg);
      showToast(errMsg, 'error');
      return;
    }

    // Username validation
    const rawUser = username.trim().replace(/^@/, '');
    if (rawUser) {
      const check = checkUsernameAvailable(rawUser);
      if (!check.available) {
        setUsernameError(check.error || 'Бұл пайдаланушы аты (username) тіркеліп қойған');
        showToast(check.error || 'Бұл пайдаланушы аты (username) тіркеліп қойған', 'error');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await createReaderByAdmin({
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phone: phone.trim() || undefined,
        birthDate: birthDate.trim() || undefined,
        password: password.trim(),
        username: rawUser || undefined,
        idNumber: idNumber.trim() || undefined,
        role,
        personalMessage: messageText.trim()
          ? {
              text: messageText.trim(),
              days: messageDays,
              isActive: isMessageActive,
            }
          : undefined,
      });

      if (res.success) {
        showToast(`Жаңа оқырман «${fullName}» сәтті тіркелді! Оқырман өз деректерімен жүйеге кіре алады.`, 'success');
        navigate('/admin/readers');
      } else {
        showToast(res.error || 'Оқырманды тіркеу кезінде қате орын алды', 'error');
      }
    } catch {
      showToast('Оқырманды тіркеу сәтсіз аяқталды', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initialLetter = firstName ? firstName.trim().charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : '+');

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
              Жаңа оқырман қосу
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
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                overflow: 'hidden',
                border: '2px solid #FFFFFF',
                boxShadow: '0 4px 14px rgba(0, 84, 148, 0.15)',
                flexShrink: 0,
                background: '#F1F5F9',
              }}
            >
              <img
                src="/default-reader-avatar.jpg"
                alt="Оқырман"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Жаңа оқырман тіркеу
              </h1>
            </div>
          </div>

          {/* Form Description */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
              Оқырман мәліметтері
            </h2>
          </div>

          {/* Registration Form */}
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
                  placeholder="Мысалы: Азамат"
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
                  placeholder="Мысалы: Серікұлы"
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
                  ID нөмірі <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => handleIdNumberChange(e.target.value)}
                  placeholder="0000 1003"
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
                  placeholder="example@gmail.com"
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
                  placeholder="@azamat"
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
                    onChange={(e) => setBirthDate(formatKazakhDate(e.target.value))}
                    placeholder="кк.аа.жжжж (мысалы: 15.10.1998)"
                    maxLength={10}
                    className="form-input"
                    style={{
                      paddingRight: '40px',
                      fontWeight: birthDate ? 700 : 500,
                      letterSpacing: birthDate ? '0.04em' : 'normal',
                    }}
                  />
                  <input
                    ref={datePickerInputRef}
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
                  <button
                    type="button"
                    onClick={() => {
                      try {
                        datePickerInputRef.current?.showPicker();
                      } catch {
                        datePickerInputRef.current?.focus();
                      }
                    }}
                    title="Күнтізбені ашу"
                    style={{
                      position: 'absolute',
                      right: '10px',
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

              {/* Password */}
              <div className="form-group" style={{ margin: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Құпиясөз <span className="req">*</span>
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
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Кемінде 6 таңба"
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

            {/* Personal Message to Reader (Басты беттегі жеке хабарлама) */}
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
                disabled={isSubmitting || Boolean(usernameError) || Boolean(phoneError)}
                className="btn-primary"
                style={{
                  padding: '12px 32px',
                  borderRadius: '50px',
                  fontSize: '14px',
                  fontWeight: 700,
                  background: 'var(--blue)',
                  opacity: isSubmitting || Boolean(usernameError) || Boolean(phoneError) ? 0.6 : 1,
                  cursor: isSubmitting || Boolean(usernameError) || Boolean(phoneError) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                {isSubmitting ? 'Тіркелуде...' : 'Оқырманды тіркеу'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </section>
  );
};
