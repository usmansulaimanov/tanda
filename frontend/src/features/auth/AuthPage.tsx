import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User as UserIcon, ArrowRight, ArrowLeft, Tag } from 'lucide-react';
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

  const { isAuthenticated, user, role, isLoading, login, register, loginWithGoogle } = useAuthStore();
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
        navigate('/admin/home', { replace: true });
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
        const updatedUser = useAuthStore.getState().user;
        if (updatedRole === 'author' || updatedUser?.isAuthor) {
          navigate('/author/stats');
        } else if (updatedRole === 'admin' || (updatedUser?.permissions && updatedUser.permissions.length > 0)) {
          navigate('/admin/home');
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
        const promoRes = await activatePromoCode(cleanPromo, {
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
      const updatedUser = useAuthStore.getState().user;
      if (updatedRole === 'author' || updatedUser?.isAuthor) {
        navigate('/author/stats');
      } else if (updatedRole === 'admin' || (updatedUser?.permissions && updatedUser.permissions.length > 0)) {
        navigate('/admin/home');
      } else {
        navigate(redirectUrl);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Тіркелу кезінде қате орын алды';
      setErrorMessage(msg);
      showToast(msg, 'error');
    }
  };

  const handleGoogleSuccess = async (response: CredentialResponse) => {
    if (response.credential) {
      try {
        await loginWithGoogle(response.credential);
        showToast('Google арқылы сәтті кірдіңіз!', 'success');
        const updatedRole = useAuthStore.getState().role;
        const updatedUser = useAuthStore.getState().user;
        if (updatedRole === 'author' || updatedUser?.isAuthor) {
          navigate('/author/stats');
        } else if (updatedRole === 'admin' || (updatedUser?.permissions && updatedUser.permissions.length > 0)) {
          navigate('/admin/home');
        } else {
          navigate(redirectUrl);
        }
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
    showToast('Құпиясөзді қалпына келтіру үшін support@tanda.kz хабарласыңыз.', 'info');
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

          {/* 1-Click Social Sign-In (Google) */}
          <div className="mb-2">
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
          </div>

          {/* On Signup: Show friendly explanation */}
          {mode === 'signup' && (
            <div className="mt-4 p-4 rounded-2xl bg-gradient-to-b from-blue-50/60 to-slate-50 border border-blue-100 text-center">
              <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                Tanda платформасына тіркелу тек сенімді <span className="text-[#0057A8] font-bold">Google аккаунты</span> арқылы жылдам әрі қауіпсіз жүргізіледі.
              </p>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                Пароль ойлап тауып әуре болмайсыз. Қаласаңыз, кейін баптаулардан жеке құпиясөз орнатып алуға болады.
              </p>
            </div>
          )}

          {/* On Login: Divider and Email/Password Form */}
          {mode === 'login' && (
            <>
              {/* Divider */}
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400 uppercase font-bold tracking-wider">
                    немесе Email мен құпиясөз арқылы
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email / Phone Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Email немесе телефон нөмірі
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={18} />
                    </div>
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com немесе +7 (777)..."
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
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                      aria-label={showPassword ? 'Құпиясөзді жасыру' : 'Құпиясөзді көрсету'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Forgot password link */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-slate-500 hover:text-[#0057A8] transition-colors cursor-pointer"
                  >
                    Құпиясөзді ұмыттыңыз ба?
                  </button>
                </div>

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
                      <span>Кіру</span>
                      <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>
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
