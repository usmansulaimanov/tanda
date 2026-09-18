import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { resizeAndCompressImage } from '../../utils/imageUtils';

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

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated, updateProfile, updateAvatar, changePassword, checkUsernameAvailable } = useAuthStore();
  const { showToast } = useToastStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // Navigation mode: 'menu' | 'profile' | 'password'
  const initialMode = (searchParams.get('mode') as 'profile' | 'password' | null) || 'menu';
  const [viewMode, setViewMode] = useState<'menu' | 'profile' | 'password'>(initialMode);

  // Profile Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setIsUploadingAvatar(true);
    try {
      const dataUrl = await resizeAndCompressImage(file, 400, 0.85);
      const res = await updateAvatar(dataUrl);
      if (res.success) {
        showToast('Профиль фотосы сәтті жаңартылды!', 'success');
      } else {
        showToast(res.error || 'Фотоны сақтау мүмкін болмады', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Суретті жүктеу кезінде қате орын алды', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!window.confirm('Профиль фотосын өшіргіңіз келетініне сенімдісіз бе?')) return;
    setIsUploadingAvatar(true);
    try {
      const res = await updateAvatar(null);
      if (res.success) {
        showToast('Профиль фотосы өшірілді', 'info');
      } else {
        showToast(res.error || 'Фотоны өшіру мүмкін болмады', 'error');
      }
    } catch {
      showToast('Фотоны өшіру мүмкін болмады', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone ? formatPhoneNumber(user.phone) : '');
    setUsername(user.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : '');
  }, [isAuthenticated, user]);

  const switchMode = (mode: 'menu' | 'profile' | 'password') => {
    setViewMode(mode);
    if (mode === 'menu') {
      setSearchParams({});
    } else {
      setSearchParams({ mode });
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div style={{ maxWidth: '600px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
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
              background: 'rgba(0, 84, 148, 0.1)',
              color: 'var(--blue)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-dark)', marginBottom: '10px' }}>
            Баптаулар үшін жүйеге кіріңіз
          </h2>
          <p style={{ color: 'var(--text-mid)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Жеке деректерді өңдеу және профильді баптау үшін сайтқа кіріңіз немесе тіркеліңіз.
          </p>
          <Link to="/" className="btn-primary" style={{ padding: '12px 32px', fontSize: '14px', textDecoration: 'none' }}>
            Басты бетке оралу
          </Link>
        </div>
      </div>
    );
  }

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
        setUsernameError(res.error || 'Бұл юзернейм бос емес');
      } else {
        setUsernameError('');
      }
    } else {
      setUsernameError('');
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Аты-жөніңізді енгізіңіз', 'error');
      return;
    }
    if (!email.trim()) {
      showToast('Электронды поштаңызды енгізіңіз', 'error');
      return;
    }

    // Phone validation: either empty or complete 10 digits
    const phoneCount = getPhoneNationalDigitsCount(phone);
    if (phone.trim() && phoneCount < 10) {
      const errMsg = 'Телефон нөмірін толық жазыңыз (+7 (777) 123-45-67) немесе бос қалдырыңыз';
      setPhoneError(errMsg);
      showToast(errMsg, 'error');
      return;
    }

    const rawUser = username.trim().replace(/^@/, '');
    if (rawUser) {
      const check = checkUsernameAvailable(rawUser);
      if (!check.available) {
        setUsernameError(check.error || 'Бұл юзернейм бос емес. Басқа юзернейм таңдаңыз');
        showToast(check.error || 'Бұл юзернейм бос емес. Басқа юзернейм таңдаңыз', 'error');
        return;
      }
    }

    setIsSavingProfile(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        username: rawUser,
      });

      if (res.success) {
        showToast('Ақпарат сәтті сақталды!', 'success');
        setUsernameError('');
        setPhoneError('');
        switchMode('menu');
      } else {
        showToast(res.error || 'Сақтау кезінде қате орын алды', 'error');
      }
    } catch {
      showToast('Ақпаратты сақтау мүмкін болмады', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!currentPassword) {
      setPasswordError('Қазіргі құпиясөзді енгізіңіз');
      showToast('Қазіргі құпиясөзді енгізіңіз', 'error');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('Жаңа құпиясөз кемінде 6 таңбадан тұруы керек');
      showToast('Жаңа құпиясөз кемінде 6 таңбадан тұруы керек', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Жаңа құпиясөздер бір-біріне сәйкес келмейді');
      showToast('Жаңа құпиясөздер сәйкес келмейді', 'error');
      return;
    }

    setIsSavingPassword(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        showToast('Пароль сәтті өзгертілді!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordError('');
        switchMode('menu');
      } else {
        setPasswordError(res.error || 'Парольді өзгерту кезінде қате орын алды');
        showToast(res.error || 'Парольді өзгерту сәтсіз аяқталды', 'error');
      }
    } catch {
      showToast('Парольді өзгерту мүмкін болмады', 'error');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const initialLetter = user.name ? user.name.trim().charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'О');

  return (
    <div style={{ maxWidth: '840px', margin: '40px auto 80px', padding: '0 24px' }}>
      
      {/* Top back button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => {
            if (viewMode !== 'menu') {
              switchMode('menu');
            } else {
              navigate(-1);
            }
          }}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-mid)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← {viewMode !== 'menu' ? 'Баптаулар мәзіріне оралу' : 'Артқа оралу'}
        </button>
      </div>

      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={handleAvatarFileChange}
        style={{ display: 'none' }}
      />

      {/* Main Settings Card */}
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '36px 32px',
          border: '1.5px solid #E2E8F0',
          boxShadow: '0 10px 30px rgba(0, 45, 80, 0.05)',
        }}
      >
        {/* Header section with user summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '24px', borderBottom: '1.5px solid #F1F5F9', marginBottom: '28px', flexWrap: 'wrap' }}>
          {/* Avatar with small camera icon */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              style={{
                width: '70px',
                height: '70px',
                borderRadius: '50%',
                background: user.avatarUrl ? '#F1F5F9' : 'linear-gradient(135deg, var(--blue) 0%, var(--orange) 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '26px',
                fontWeight: 900,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                flexShrink: 0,
                textTransform: 'uppercase',
                border: '2.5px solid #FFFFFF',
                overflow: 'hidden',
              }}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || 'Avatar'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  referrerPolicy="no-referrer"
                />
              ) : (
                initialLetter
              )}
            </div>

            {/* Small camera icon button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingAvatar}
              title="Фотоны ауыстыру"
              style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#0F172A',
                color: '#FFFFFF',
                border: '2px solid #FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                padding: 0,
              }}
            >
              {isUploadingAvatar ? (
                <div style={{ width: '10px', height: '10px', border: '1.5px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                  <circle cx="12" cy="13" r="4"></circle>
                </svg>
              )}
            </button>
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 900, color: '#0F172A', margin: 0 }}>
                {user.name || 'Оқырман'}
              </h1>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: '#0F172A',
                }}
              >
                ID: {user.idNumber || (user.role === 'admin' ? '000 001' : '001 001')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '13px', flexWrap: 'wrap' }}>
              <span style={{ color: '#64748B' }}>{user.email}</span>
              {user.username && (
                <span style={{ color: '#0F172A', fontWeight: 700 }}>
                  @{user.username.replace(/^@/, '')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 1. MENU VIEW: Two Main Action Buttons */}
        {viewMode === 'menu' && (
          <div>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: 0 }}>
                Аккаунт баптаулары
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
              
              {/* Button 1: Ақпаратты өңдеу */}
              <button
                type="button"
                onClick={() => switchMode('profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '22px 24px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blue)';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 84, 148, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(0, 84, 148, 0.1)',
                      color: 'var(--blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 4px 0' }}>
                      Ақпаратты өңдеу
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0, lineHeight: 1.4 }}>
                      Аты-жөні, пошта, телефон және юзернеймді өзгерту
                    </p>
                  </div>
                </div>
                <div style={{ color: 'var(--blue)', paddingLeft: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </button>

              {/* Button 2: Парольді өзгерту */}
              <button
                type="button"
                onClick={() => switchMode('password')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '22px 24px',
                  borderRadius: '16px',
                  background: '#FFFFFF',
                  border: '1.5px solid #CBD5E1',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--blue)';
                  e.currentTarget.style.background = '#F8FAFC';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 84, 148, 0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.04)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'rgba(239, 126, 0, 0.12)',
                      color: 'var(--orange)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 4px 0' }}>
                      Парольді өзгерту
                    </h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0, lineHeight: 1.4 }}>
                      Қауіпсіздік үшін жаңа құпиясөз орнату
                    </p>
                  </div>
                </div>
                <div style={{ color: 'var(--blue)', paddingLeft: '12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </div>
              </button>

            </div>
          </div>
        )}

        {/* 2. SUB-PAGE 1: Ақпаратты өңдеу (Edit Info) */}
        {viewMode === 'profile' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="section-tag" style={{ marginBottom: '8px' }}>Профиль баптаулары</span>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
                  Ақпаратты өңдеу
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0 }}>
                  Аты-жөніңізді, электронды поштаңызды, байланыс нөміріңізді және бірегей юзернейміңізді осы жерден баптаңыз.
                </p>
              </div>

              <button
                type="button"
                onClick={() => switchMode('menu')}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '50px',
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-mid)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ← Баптауларға қайту
              </button>
            </div>

            <form onSubmit={handleProfileSubmit}>
              {/* Avatar Section */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: '16px',
                  padding: '18px 22px',
                  border: '1.5px solid #E2E8F0',
                  marginBottom: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: user.avatarUrl ? '#FFFFFF' : 'linear-gradient(135deg, var(--blue) 0%, var(--orange) 100%)',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                      fontWeight: 900,
                      border: '2px solid #CBD5E1',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name || 'Avatar'}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      initialLetter
                    )}
                  </div>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-dark)', margin: '0 0 2px 0' }}>
                      Профиль фотосы
                    </h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-mid)', margin: 0 }}>
                      JPG, PNG немесе WebP форматы. Көлемі 10 МБ-қа дейін.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    style={{
                      background: 'var(--blue)',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '50px',
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'background 0.2s',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    <span>{user.avatarUrl ? 'Фотоны ауыстыру' : 'Фото жүктеу'}</span>
                  </button>

                  {user.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar}
                      style={{
                        background: '#FFFFFF',
                        color: '#EF4444',
                        border: '1.5px solid #FCA5A5',
                        borderRadius: '50px',
                        padding: '7px 16px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      Өшіру
                    </button>
                  )}
                </div>
              </div>

              {/* Row 1: Name and Username */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px',
                }}
              >
                {/* Full Name */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Аты-жөніңіз <span className="req">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Мысалы: Азамат Серікұлы"
                    className="form-input"
                  />
                  <span className="form-hint">Сайтта және пікірлерде көрсетілетін ресми атыңыз</span>
                </div>

                {/* Username */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Юзернейм (Username) <span className="req">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      placeholder="@azamat_01"
                      className="form-input"
                      style={{
                        borderColor: usernameError ? '#DC2626' : undefined,
                        paddingLeft: '14px',
                        fontWeight: 700,
                      }}
                    />
                  </div>
                  
                  {usernameError ? (
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                      {usernameError}
                    </span>
                  ) : (
                    <span className="form-hint">
                      Бір юзернеймді бір ғана адам тіркей алады (латын әріптері мен сандар)
                    </span>
                  )}
                </div>
              </div>

              {/* Row 2: Email and Phone */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '20px',
                  marginBottom: '28px',
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
                    placeholder="siz@mail.kz"
                    className="form-input"
                  />
                  <span className="form-hint">Сайтқа кіру және хабарламалар үшін қолданылады</span>
                </div>

                {/* Phone number */}
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
                  {phoneError ? (
                    <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#DC2626', marginTop: '6px' }}>
                      {phoneError}
                    </span>
                  ) : (
                    <span className="form-hint">
                      Тек сандар жазылады: +7 (777) 123-45-67 (толық жазыңыз немесе бос қалдырыңыз)
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1.5px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => switchMode('menu')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '50px',
                    background: '#F1F5F9',
                    color: 'var(--text-mid)',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Бас тарту
                </button>

                <button
                  type="submit"
                  disabled={isSavingProfile || Boolean(usernameError) || Boolean(phoneError)}
                  className="btn-primary"
                  style={{
                    padding: '12px 32px',
                    borderRadius: '50px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: 'var(--blue)',
                    opacity: isSavingProfile || Boolean(usernameError) || Boolean(phoneError) ? 0.6 : 1,
                    cursor: isSavingProfile || Boolean(usernameError) || Boolean(phoneError) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSavingProfile ? 'Сақталуда...' : 'Өзгерістерді сақтау'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 3. SUB-PAGE 2: Парольді өзгерту (Change Password) */}
        {viewMode === 'password' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <span className="section-tag" style={{ marginBottom: '8px' }}>Қауіпсіздік</span>
                <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
                  Парольді өзгерту
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0 }}>
                  Аккаунтыңыздың қауіпсіздігі үшін сенімді әрі күрделі құпиясөзді таңдаңыз.
                </p>
              </div>

              <button
                type="button"
                onClick={() => switchMode('menu')}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: '50px',
                  padding: '7px 16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: 'var(--text-mid)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ← Баптауларға қайту
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
                
                {/* Current Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Қазіргі құпиясөз <span className="req">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="form-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={showCurrentPassword ? 'Жасыру' : 'Көрсету'}
                    >
                      {showCurrentPassword ? (
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
                  <span className="form-hint">Жеке аккаунтыңыздың қазіргі құпиясөзі</span>
                </div>

                {/* New Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Жаңа құпиясөз <span className="req">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Кемінде 6 таңба"
                      className="form-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={showNewPassword ? 'Жасыру' : 'Көрсету'}
                    >
                      {showNewPassword ? (
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
                  <span className="form-hint">Кемінде 6 таңбадан тұруы керек</span>
                </div>

                {/* Confirm New Password */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">
                    Жаңа құпиясөзді қайталау <span className="req">*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Жаңа құпиясөзді қайталаңыз"
                      className="form-input"
                      style={{ paddingRight: '42px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: '#64748B',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title={showConfirmPassword ? 'Жасыру' : 'Көрсету'}
                    >
                      {showConfirmPassword ? (
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

                {passwordError && (
                  <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#DC2626', fontSize: '13px', fontWeight: 600 }}>
                    {passwordError}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', paddingTop: '20px', borderTop: '1.5px solid #F1F5F9' }}>
                <button
                  type="button"
                  onClick={() => switchMode('menu')}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '50px',
                    background: '#F1F5F9',
                    color: 'var(--text-mid)',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Бас тарту
                </button>

                <button
                  type="submit"
                  disabled={isSavingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="btn-primary"
                  style={{
                    padding: '12px 32px',
                    borderRadius: '50px',
                    fontSize: '14px',
                    fontWeight: 700,
                    background: 'var(--blue)',
                    opacity: isSavingPassword || !currentPassword || !newPassword || !confirmPassword ? 0.6 : 1,
                    cursor: isSavingPassword || !currentPassword || !newPassword || !confirmPassword ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSavingPassword ? 'Сақталуда...' : 'Парольді жаңарту'}
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

    </div>
  );
};
