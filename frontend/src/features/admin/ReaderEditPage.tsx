import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { User } from '../../types';

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
  const { getUserById, updateUserByAdmin, checkUsernameAvailable } = useAuthStore();
  const { showToast } = useToastStore();

  const [reader, setReader] = useState<User | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [role, setRole] = useState<'client' | 'admin'>('client');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [messageText, setMessageText] = useState('');
  const [messageDays, setMessageDays] = useState(7);
  const [isMessageActive, setIsMessageActive] = useState(true);
  const [existingExpiresAt, setExistingExpiresAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    const found = getUserById(id);
    if (found) {
      setReader(found);
      setName(found.name || '');
      setEmail(found.email || '');
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
  }, [id, getUserById]);

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
    if (raw && id) {
      const res = checkUsernameAvailable(raw, id);
      if (!res.available) {
        setUsernameError(res.error || 'Бұл юзернейм бос емес');
      } else {
        setUsernameError('');
      }
    } else {
      setUsernameError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !reader) return;

    if (!name.trim()) {
      showToast('Аты-жөнін енгізіңіз', 'error');
      return;
    }
    if (!email.trim()) {
      showToast('Электронды поштасын енгізіңіз', 'error');
      return;
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
        setUsernameError(check.error || 'Бұл юзернейм бос емес. Басқа юзернейм таңдаңыз');
        showToast(check.error || 'Бұл юзернейм бос емес. Басқа юзернейм таңдаңыз', 'error');
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await updateUserByAdmin(id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
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

  const initialLetter = name ? name.trim().charAt(0).toUpperCase() : (email ? email.charAt(0).toUpperCase() : 'О');
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
          style={{
            background: '#FFFFFF',
            borderRadius: '20px',
            padding: '36px 32px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 10px 30px rgba(0, 45, 80, 0.05)',
          }}
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
                background: 'linear-gradient(135deg, var(--blue) 0%, var(--orange) 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 900,
                boxShadow: '0 6px 18px rgba(0, 84, 148, 0.25)',
                flexShrink: 0,
                textTransform: 'uppercase',
              }}
            >
              {initialLetter}
            </div>

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                  {reader.name || 'Оқырман'}
                </h1>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: 'var(--text-dark)',
                    letterSpacing: '0.04em',
                  }}
                >
                  ID: {reader.idNumber || '001 001'}
                </span>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>•</span>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-dark)',
                  }}
                >
                  {role === 'admin' ? 'Әкімші' : 'Оқырман'}
                </span>
              </div>

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
            <span className="section-tag" style={{ marginBottom: '8px' }}>Оқырман профилі</span>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
              Оқырман деректерін өзгерту
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0 }}>
              Енгізілген өзгерістер ортақ деректер қорында және осы оқырманның жеке аккаунтында автоматты түрде жаңартылады.
            </p>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit}>
            
            {/* Row 1: Full Name and ID Number */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
              {/* Name */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Аты-жөні <span className="req">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Мысалы: Usman Sulaimanov"
                  className="form-input"
                />
              </div>

              {/* ID Number */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  ID нөмірі
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="001 002"
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontWeight: 700 }}
                />
              </div>
            </div>

            {/* Row 2: Email and Username */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '20px',
              }}
            >
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

              {/* Username */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Юзернейм (Username)
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
            </div>

            {/* Row 3: Phone */}
            <div
              style={{
                marginBottom: '28px',
              }}
            >
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
                  ⏳ Қазіргі жағдайы: <strong style={{ color: new Date(existingExpiresAt).getTime() < Date.now() ? '#DC2626' : '#059669' }}>
                    {new Date(existingExpiresAt).getTime() < Date.now()
                      ? 'Мерзімі аяқталған'
                      : `Белсенді (${new Date(existingExpiresAt).toLocaleDateString('kk-KZ')} дейін)`}
                  </strong>
                </div>
              )}
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
    </section>
  );
};
