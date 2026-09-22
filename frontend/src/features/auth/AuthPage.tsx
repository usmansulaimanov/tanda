import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User as UserIcon, ArrowRight, ArrowLeft, Shield, CheckCircle2, Tag } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { useAuthStore } from '../../store/useAuthStore';
import { usePromoStore } from '../../store/usePromoStore';
import { useToastStore } from '../../store/useToastStore';
import tandaLogo from '../../assets/tanda-logo.png';

interface AuthPageProps {
  initialMode?: 'login' | 'signup';
}

export const AuthPage: React.FC<AuthPageProps> = ({ initialMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  // Determine mode from prop or path
  const isSignupPath = location.pathname === '/signup' || location.pathname === '/register';
  const mode: 'login' | 'signup' = initialMode || (isSignupPath ? 'signup' : 'login');

  const { isAuthenticated, user, role, isLoading, login, register, loginAsAdmin, loginAsClient, loginWithGoogle } = useAuthStore();
  const { activatePromoCode } = usePromoStore();
  const { showToast } = useToastStore();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated && user) {
      if (role === 'admin' && redirectUrl === '/') {
        navigate('/admin', { replace: true });
      } else {
        navigate(redirectUrl, { replace: true });
      }
    }
  }, [isAuthenticated, user, role, redirectUrl, navigate]);

  // Clear error when mode or inputs change
  useEffect(() => {
    setErrorMessage('');
  }, [location.pathname, email, password, name, promoCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanName = name.trim();
    const cleanPromo = promoCode.trim().toUpperCase();

    if (!cleanEmail) {
      setErrorMessage(mode === 'login' ? 'Email немесе телефон нөмірін енгізіңіз' : 'Электронды поштаны енгізіңіз');
      return;
    }
    if (!cleanPassword) {
      setErrorMessage('Құпиясөзді енгізіңіз');
      return;
    }

    if (mode === 'login') {
      try {
        await login(cleanEmail, cleanPassword);
        showToast('Жүйеге сәтті кірдіңіз!', 'success');
        const updatedRole = useAuthStore.getState().role;
        if (updatedRole === 'admin' && redirectUrl === '/') {
          navigate('/admin');
        } else {
          navigate(redirectUrl);
        }
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Кіру қатесі. Деректерді қайта тексеріңіз';
        setErrorMessage(msg);
        showToast(msg, 'error');
      }
      return;
    }

    // Direct Instant Signup (Spotify / Netflix style)
    if (!cleanName) {
      setErrorMessage('Аты-жөніңізді енгізіңіз');
      return;
    }
    if (cleanPassword.length < 6) {
      setErrorMessage('Құпиясөз кемінде 6 таңбадан тұруы керек');
      return;
    }

    try {
      await register(cleanName, cleanEmail, cleanPassword);

      // Auto-activate promo code if provided during registration
      if (cleanPromo) {
        const registeredUser = useAuthStore.getState().user;
        const promoRes = activatePromoCode(cleanPromo, {
          id: registeredUser?.id || `user-${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
        });

        if (promoRes.success) {
          showToast(`Қош келдіңіз, ${cleanName}! Промокод сәтті іске қосылды: «${promoRes.rewardTitle}»`, 'success');
        } else {
          showToast(`Қош келдіңіз, ${cleanName}! Промокод қатесі: ${promoRes.error}`, 'info');
        }
      } else {
        showToast(`Қош келдіңіз, ${cleanName}! Тіркелу сәтті аяқталды.`, 'success');
      }

      const updatedRole = useAuthStore.getState().role;
      if (updatedRole === 'admin' && redirectUrl === '/') {
        navigate('/admin');
      } else {
        navigate(redirectUrl);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Тіркелу кезінде қате орын алды';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  const handleQuickLogin = async (targetRole: 'admin' | 'client') => {
    setErrorMessage('');
    try {
      if (targetRole === 'admin') {
        await loginAsAdmin();
        showToast('Әкімші (Admin) аккаунтымен кірдіңіз', 'success');
        navigate('/admin');
      } else {
        await loginAsClient('reader@tanda.kz', 'Оқырман');
        showToast('Оқырман (Reader) аккаунтымен кірдіңіз', 'success');
        navigate(redirectUrl);
      }
    } catch (err: any) {
      const msg = err.message || 'Жүйеге кіру мүмкін болмады';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        await loginWithGoogle(response.credential);
        showToast('Google арқылы сәтті кірдіңіз!', 'success');
        navigate(redirectUrl);
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Google арқылы кіру мүмкін болмады';
        setErrorMessage(msg);
        showToast(msg, 'error');
      }
    }
  };

  const handleGoogleError = () => {
    showToast('Google авторизациясы қатемен аяқталды', 'error');
  };

  const handleAppleClick = () => {
    showToast('Apple ID арқылы кіру жақында қосылады. Google немесе пошта арқылы кіре аласыз.', 'info');
  };

  const handleForgotPassword = () => {
    showToast('Құпиясөзді қалпына келтіру үшін support@tanda.kz хабарласыңыз немесе жедел кіру батырмасын басыңыз.', 'info');
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col justify-between items-center py-6 px-4 relative overflow-hidden selection:bg-[#0057A8] selection:text-white">
      {/* Background Subtle Ambience Glows */}
      <div className="absolute -top-32 -left-32 w-80 h-80 sm:w-96 sm:h-96 bg-[#0057A8]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 sm:w-96 sm:h-96 bg-[#EB823C]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Return to site */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between z-10 mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-[#0057A8] transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-200/50"
        >
          <ArrowLeft size={17} />
          <span>Басты бетке оралу</span>
        </Link>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-md mx-auto my-auto z-10">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/70 border border-slate-100 p-6 sm:p-8 transition-all">
          
          {/* Brand Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5 focus:outline-none">
              <img
                src={tandaLogo}
                alt="Tanda Logo"
                className="h-9 w-auto object-contain"
              />
            </Link>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {mode === 'login' ? 'Кіру' : 'Тіркелу'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-xs">
              {mode === 'login'
                ? 'Жеке кабинетке кіру үшін деректеріңізді енгізіңіз.'
                : 'Жаңа аккаунт ашып, барлық қазақша кітаптар мен аудиоларды оқыңыз.'}
            </p>
          </div>

          {/* Quick Demo Login Pill Helper */}
          <div className="mb-5 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Жылдам кіру (Тесттік режим):
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#0057A8]/30 hover:border-[#0057A8] text-[#0057A8] text-xs font-bold transition shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
              >
                <Shield size={14} className="text-[#0057A8]" />
                <span>Админ</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('client')}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 text-emerald-700 text-xs font-bold transition shadow-sm hover:shadow active:scale-[0.98] cursor-pointer"
              >
                <CheckCircle2 size={14} className="text-emerald-600" />
                <span>Оқырман</span>
              </button>
            </div>
          </div>

          {/* 1-Click Social Sign-In (Google & Apple) */}
          <div className="space-y-2.5 mb-5">
            {/* Google Sign-In Button */}
            <div className="w-full flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                width="100%"
                text={mode === 'login' ? 'signin_with' : 'signup_with'}
                shape="rectangular"
              />
            </div>

            {/* Apple 1-Click Button */}
            <button
              type="button"
              onClick={handleAppleClick}
              className="w-full py-2.5 px-4 bg-black hover:bg-neutral-900 active:bg-neutral-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition shadow-sm cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current mb-0.5" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-5.77-8.81-10.36-19.12-13.78-30.93-3.42-11.81-5.13-23.01-5.13-33.6 0-14.28 3.52-26.17 10.56-35.67 7.04-9.5 15.82-14.35 26.33-14.56 5.26 0 11.03 1.48 17.3 4.44 6.27 2.97 10.14 4.51 11.61 4.63 1.25 0 5.41-1.63 12.47-4.89 7.07-3.26 13.06-4.63 17.97-4.12 13.37 1.06 23.85 5.86 31.44 14.4-11.75 7.09-17.51 16.73-17.29 28.92.21 9.53 3.93 17.47 11.16 23.83 7.23 6.36 15.7 10.05 25.41 11.06-2.12 6.52-4.68 13.37-7.68 20.55zM119.22 33.74c0-7.39 2.68-14.29 8.04-20.7 5.36-6.41 12-10.74 19.92-13.04.22 1.5.33 3.01.33 4.54 0 7.39-2.73 14.4-8.19 21.03-5.46 6.63-12.28 10.9-20.46 12.81-.22-1.5-.33-3.05-.33-4.64z"/>
              </svg>
              <span>{mode === 'login' ? 'Apple арқылы кіру' : 'Apple арқылы тіркелу'}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-slate-400 uppercase font-bold tracking-wider">
                немесе Email арқылы
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name field on Signup */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Аты-жөніңіз
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <UserIcon size={18} />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Мысалы: Азамат Серікұлы"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0057A8] focus:ring-4 focus:ring-[#0057A8]/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email / Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                {mode === 'login' ? 'Email немесе телефон нөмірі' : 'Email (Поштаңыз)'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type={mode === 'login' ? 'text' : 'email'}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={mode === 'login' ? 'example@gmail.com немесе +7 (777)...' : 'example@gmail.com'}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0057A8] focus:ring-4 focus:ring-[#0057A8]/10 transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                Құпиясөз
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0057A8] focus:ring-4 focus:ring-[#0057A8]/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  aria-label={showPassword ? 'Құпиясөзді жасыру' : 'Құпиясөзді көрсету'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Promo Code Input on Signup */}
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Промокод (міндетті емес)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Tag size={18} />
                  </div>
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Промокод"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0057A8] focus:ring-4 focus:ring-[#0057A8]/10 transition-all uppercase tracking-wider font-mono"
                  />
                </div>
              </div>
            )}

            {/* Forgot password link */}
            {mode === 'login' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-semibold text-slate-500 hover:text-[#0057A8] transition-colors cursor-pointer"
                >
                  Құпиясөзді ұмыттыңыз ба?
                </button>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#0057A8] hover:bg-[#00478a] active:bg-[#00386e] text-white text-sm font-bold tracking-wide transition-all shadow-md shadow-[#0057A8]/25 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Кіру' : 'Тіркелу'}</span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Bottom Switcher */}
          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <p>
                Аккаунтыңыз жоқ па?{' '}
                <Link
                  to={redirectUrl !== '/' ? `/signup?redirect=${encodeURIComponent(redirectUrl)}` : '/signup'}
                  className="font-bold text-[#0057A8] hover:underline"
                >
                  Тіркелу
                </Link>
              </p>
            ) : (
              <p>
                Аккаунтыңыз бар ма?{' '}
                <Link
                  to={redirectUrl !== '/' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                  className="font-bold text-[#0057A8] hover:underline"
                >
                  Кіру
                </Link>
              </p>
            )}
          </div>

        </div>
      </div>

      {/* Footer copyright */}
      <div className="max-w-md w-full mx-auto text-center text-xs text-slate-400 py-2 z-10">
        &copy; {new Date().getFullYear()} Tanda. Барлық құқықтар қорғалған.
      </div>
    </div>
  );
};
