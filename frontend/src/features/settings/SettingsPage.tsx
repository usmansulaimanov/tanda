import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

const formatPhoneNumber = (val: string): string => {
  const rawDigits = val.replace(/\D/g, '');
  if (!rawDigits) return '';

  let national = rawDigits;
  if (rawDigits.length > 10 && (rawDigits.startsWith('7') || rawDigits.startsWith('8'))) {
    national = rawDigits.substring(1, 11);
  } else if (rawDigits === '8') {
    return '';
  } else {
    national = rawDigits.substring(0, 10);
  }

  if (national.length === 0) return '';

  let res = '+7 (';
  res += national.substring(0, Math.min(3, national.length));
  if (national.length >= 3) {
    res += ') ';
    res += national.substring(3, Math.min(6, national.length));
  } else {
    return res;
  }
  if (national.length >= 6) {
    res += '-';
    res += national.substring(6, Math.min(8, national.length));
  } else {
    return res;
  }
  if (national.length >= 8) {
    res += '-';
    res += national.substring(8, Math.min(10, national.length));
  }
  return res;
};

const getPhoneNationalDigitsCount = (val: string): number => {
  const rawDigits = val.replace(/\D/g, '');
  if (!rawDigits) return 0;
  if (rawDigits.length > 10 && (rawDigits.startsWith('7') || rawDigits.startsWith('8'))) {
    return rawDigits.substring(1, 11).length;
  }
  if (rawDigits === '8') return 0;
  return Math.min(rawDigits.length, 10);
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile, checkUsernameAvailable } = useAuthStore();
  const { showToast } = useToastStore();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      return;
    }
    setName(user.name || '');
    setEmail(user.email || '');
    setPhone(user.phone ? formatPhoneNumber(user.phone) : '');
    setUsername(user.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : '');
  }, [isAuthenticated, user]);

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        username: rawUser,
      });

      if (res.success) {
        showToast('Баптаулар сәтті сақталды!', 'success');
        setUsernameError('');
        setPhoneError('');
      } else {
        showToast(res.error || 'Сақтау кезінде қате орын алды', 'error');
      }
    } catch {
      showToast('Баптауларды сақтау мүмкін болмады', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const initialLetter = user.name ? user.name.trim().charAt(0).toUpperCase() : (user.email ? user.email.charAt(0).toUpperCase() : 'О');

  return (
    <div style={{ maxWidth: '840px', margin: '40px auto 80px', padding: '0 24px' }}>
      
      {/* Top back button */}
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
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
          ← Артқа оралу
        </button>
      </div>

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', paddingBottom: '28px', borderBottom: '1.5px solid #F1F5F9', marginBottom: '32px', flexWrap: 'wrap' }}>
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
                {user.name || 'Оқырман'}
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  fontFamily: 'monospace',
                  background: 'rgba(0, 84, 148, 0.1)',
                  color: 'var(--blue)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                }}
              >
                ID: {user.idNumber || (user.role === 'admin' ? '000 001' : '001 001')}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', color: 'var(--text-mid)', fontSize: '13px', flexWrap: 'wrap' }}>
              <span>{user.email}</span>
              {user.username && (
                <span style={{ color: 'var(--blue)', fontWeight: 700 }}>
                  @{user.username.replace(/^@/, '')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Section title */}
        <div style={{ marginBottom: '24px' }}>
          <span className="section-tag" style={{ marginBottom: '8px' }}>Профиль баптаулары</span>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-dark)', margin: '4px 0' }}>
            Жеке деректерді өзгерту
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-mid)', margin: 0 }}>
            Аты-жөніңізді, электронды поштаңызды, байланыс нөміріңізді және бірегей юзернейміңізді осы жерден баптаңыз.
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit}>
          
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
                }}
              />
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
              onClick={() => navigate(-1)}
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
              }}
            >
              {isSaving ? 'Сақталуда...' : 'Өзгерістерді сақтау'}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};
