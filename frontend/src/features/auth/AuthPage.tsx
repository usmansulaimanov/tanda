import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User as UserIcon, ArrowRight, ArrowLeft, Shield, CheckCircle2, Tag, Gift } from 'lucide-react';
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

  const { isAuthenticated, user, role, isLoading, login, register, sendVerificationCode, loginAsAdmin, loginAsClient, loginWithGoogle } = useAuthStore();
  const { activatePromoCode } = usePromoStore();
  const { showToast } = useToastStore();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [signupStep, setSignupStep] = useState<1 | 2>(1);
  const [cooldown, setCooldown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Countdown timer effect
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

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
    if (mode === 'login') {
      setSignupStep(1);
    }
  }, [location.pathname, email, password, name, promoCode]);

  const handleSendVerificationCode = async (targetEmail: string) => {
    setErrorMessage('');
    try {
      await sendVerificationCode(targetEmail, 'REGISTER');
      setSignupStep(2);
      setCooldown(60);
      showToast(`Растау коды «${targetEmail}» поштасына жіберілді!`, 'success');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Код жіберу кезінде қате орын алды';
      setErrorMessage(msg);
      showToast(msg, 'error');
      throw err;
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0 || isLoading) return;
    try {
      await handleSendVerificationCode(email.trim().toLowerCase());
    } catch {}
  };

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

    // Signup Step 1: Send verification code to email
    if (signupStep === 1) {
      if (!cleanName) {
        setErrorMessage('Аты-жөніңізді енгізіңіз');
        return;
      }
      if (cleanPassword.length < 6) {
        setErrorMessage('Құпиясөз кемінде 6 таңбадан тұруы керек');
        return;
      }
      try {
        await handleSendVerificationCode(cleanEmail);
      } catch {}
      return;
    }

    // Signup Step 2: Verify code and register user
    const cleanCode = verificationCode.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMessage('Поштаға келген 6 таңбалы растау кодын енгізіңіз');
      return;
    }

    try {
      await register(cleanName, cleanEmail, cleanPassword, cleanCode);

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
        showToast(`Қош келдіңіз, ${cleanName}! Аккаунтыңыз сәтті ашылды.`, 'success');
      }

      const updatedRole = useAuthStore.getState().role;
      if (updatedRole === 'admin' && redirectUrl === '/') {
        navigate('/admin');
      } else {
        navigate(redirectUrl);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Тіркелу қатесі. Кодты қайта тексеріңіз';
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
              {mode === 'login'
                ? 'Кіру'
                : signupStep === 2
                ? 'Поштаны растау'
                : 'Тіркелу'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 max-w-xs">
              {mode === 'login'
                ? 'Жеке кабинетке кіру үшін деректеріңізді енгізіңіз.'
                : signupStep === 2
                ? `«${email}» поштасына 6 таңбалы код жіберілді.`
                : 'Жаңа аккаунт ашып, барлық кітаптар мен аудиоларды оқыңыз.'}
            </p>
          </div>

          {/* Quick Demo Login Pill Helper (Only on Step 1 / Login) */}
          {(mode === 'login' || signupStep === 1) && (
            <div className="mb-6 p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                Жылдам кіру (Тесттік режим):
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('admin')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-[#0057A8]/30 hover:border-[#0057A8] text-[#0057A8] text-xs font-bold transition shadow-sm hover:shadow active:scale-[0.98]"
                >
                  <Shield size={14} className="text-[#0057A8]" />
                  <span>Админ</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('client')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-emerald-300 hover:border-emerald-500 text-emerald-700 text-xs font-bold transition shadow-sm hover:shadow active:scale-[0.98]"
                >
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Оқырман</span>
                </button>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Step 2 Verification Code View */}
            {mode === 'signup' && signupStep === 2 ? (
              <div className="space-y-4">
                <div className="p-4 bg-sky-50 border border-sky-100 rounded-2xl text-center">
                  <div className="w-12 h-12 rounded-full bg-[#0057A8]/10 text-[#0057A8] flex items-center justify-center mx-auto mb-2">
                    <Mail size={22} />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Тіркелуді аяқтау үшін <strong>{email}</strong> поштаңызға жіберілген 6 таңбалы кодты енгізіңіз.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide text-center">
                    6 таңбалы растау коды
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoFocus
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full py-3.5 px-4 bg-slate-50 border-2 border-[#0057A8] rounded-xl text-center text-2xl font-black tracking-[0.35em] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:bg-white focus:ring-4 focus:ring-[#0057A8]/15 transition-all font-mono"
                  />
                </div>

                {/* Resend button & change email link */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setSignupStep(1)}
                    className="text-slate-500 hover:text-[#0057A8] font-semibold transition"
                  >
                    ← Поштаны өзгерту
                  </button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={handleResendCode}
                    className="text-[#0057A8] font-bold disabled:text-slate-400 disabled:cursor-not-allowed hover:underline transition"
                  >
                    {cooldown > 0 ? `Қайта жіберу (${cooldown}с)` : 'Кодты қайта жіберу'}
                  </button>
                </div>
              </div>
            ) : (
              /* Step 1 Form / Login Form */
              <>
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

                {/* Promo Code Input */}
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
                      className="text-xs font-semibold text-slate-500 hover:text-[#0057A8] transition-colors"
                    >
                      Құпиясөзді ұмыттыңыз ба?
                    </button>
                  </div>
                )}
              </>
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
                  <span>
                    {mode === 'login'
                      ? 'Кіру'
                      : signupStep === 2
                      ? 'Тіркелуді аяқтау'
                      : 'Код алу және тіркелу'}
                  </span>
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          {/* Divider & Google Login (Only on Step 1 / Login) */}
          {(mode === 'login' || signupStep === 1) && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 uppercase font-bold tracking-wider">
                    немесе
                  </span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <div className="w-full flex justify-center py-1">
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
            </>
          )}

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
