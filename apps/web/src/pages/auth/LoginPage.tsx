import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconAlertCircle,
  IconMail,
  IconUsers,
  IconCalendarEvent,
  IconFileInvoice,
  IconChartPie,
  IconShieldCheck,
  IconCloud,
  IconX,
  IconCheck,
  IconLoader2,
} from '@tabler/icons-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);

  const handleAuth = async (credentials: { login: string; password: string }) => {
    setError(null);
    setLoading(true);

    try {
      const data = await login(credentials);
      if (data.user.mustChangePassword) {
        navigate('/change-password');
      } else if (data.user.role === 'PRODUCT_SUPER_ADMIN') {
        navigate('/super-admin/dashboard');
      } else {
        navigate('/employee/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials or connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleAuth(form);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setForgotLoading(true);
    setForgotError(null);

    try {
      await api.post('/auth/forgot-password', { email: forgotEmail.trim() });
      setForgotSent(true);
    } catch (err: any) {
      setForgotError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to dispatch password recovery email. Please check your address.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // 6 feature badges
  const features = [
    {
      label: 'Employee Management',
      icon: IconUsers,
      bg: 'bg-[#e6fbf4]',
      color: 'text-[#059669]',
      border: 'border-[#d1fae5]',
    },
    {
      label: 'Attendance & Leave',
      icon: IconCalendarEvent,
      bg: 'bg-[#f0edff]',
      color: 'text-[#6366f1]',
      border: 'border-[#e0e7ff]',
    },
    {
      label: 'Payroll & Billing',
      icon: IconFileInvoice,
      bg: 'bg-[#fff8ea]',
      color: 'text-[#d97706]',
      border: 'border-[#fef3c7]',
    },
    {
      label: 'Reports & Analytics',
      icon: IconChartPie,
      bg: 'bg-[#edf5ff]',
      color: 'text-[#2563eb]',
      border: 'border-[#dbeafe]',
    },
    {
      label: 'Role Based Access',
      icon: IconShieldCheck,
      bg: 'bg-[#fff0f2]',
      color: 'text-[#e11d48]',
      border: 'border-[#ffe4e6]',
    },
    {
      label: 'Multi-Tenant SaaS Control',
      icon: IconCloud,
      bg: 'bg-[#eafaf4]',
      color: 'text-[#0d9488]',
      border: 'border-[#ccfbf1]',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f6fe] via-[#f7f9ff] to-[#edf3fd] flex items-center justify-center p-3 sm:p-5 lg:p-6 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">

      {/* Decorative Soft Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center z-10 py-1">
        {/* Left Side: Brand & Feature Showcase */}
        <div className="lg:col-span-7 flex flex-col justify-center items-start lg:pr-4">
          {/* Top Brand Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/Uptrix_logo.png"
              alt="Uptrix Logo"
              className="h-8 max-h-8 w-auto object-contain"
            />
          </div>

          {/* Main Headline */}
          <h1 className="mt-5 sm:mt-6 text-2xl sm:text-3xl lg:text-[36px] font-black text-slate-900 tracking-tight leading-[1.2]">
            Simplify HR <br />
            Management <br />
            for a <span className="text-[#5551ff]">Smarter Workplace</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-3 text-xs sm:text-sm text-slate-500 max-w-md leading-relaxed font-normal">
            Manage employees, attendance, leaves, payments and more — all in one powerful platform.
          </p>

          {/* 6 Feature Badges (2 columns x 3 rows) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-3.5 w-full max-w-lg mt-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div key={feat.label} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${feat.bg} ${feat.color} ${feat.border} shadow-2xs`}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-slate-700 leading-snug">
                    {feat.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Floating Login Card */}
        <div className="lg:col-span-5 w-full flex flex-col items-center">
          <div className="w-full max-w-[380px] bg-white rounded-3xl shadow-[0_15px_50px_-15px_rgba(79,70,229,0.10)] border border-white/90 p-5 sm:p-6 relative backdrop-blur-sm">

            {/* Company Logo Inside Card */}
            <div className="flex justify-center mb-3.5">
              <img
                src="/Uptrix_logo.png"
                alt="Uptrix Logo"
                className="h-8 max-h-8 w-auto object-contain"
              />
            </div>

            {/* Welcome Back Heading */}
            <div className="text-center mb-4">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Welcome Back
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 font-normal mt-0.5">
                Login to your account to continue
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
                <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Username or Email Input */}
              <div className="relative">
                <IconMail className="w-4 h-4 text-slate-500 font-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={form.login}
                  onChange={(e) => setForm({ ...form, login: e.target.value })}
                  placeholder="Username or Email"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <IconLock className="w-4 h-4 text-slate-500 font-medium absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-medium hover:text-slate-600 transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className="text-[11px] sm:text-xs text-slate-600 font-medium">Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] sm:text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-1 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Login</span>
                    <span>→</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Text */}
            <p className="mt-4 text-center text-[11px] text-slate-500 font-medium">
              New to UPTRIX HRMS?{' '}
              <a
                href="mailto:support@uptrix.io"
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Contact your administrator
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl p-6 sm:p-7 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Reset Your Password</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 rounded-lg text-slate-500 font-medium hover:bg-slate-100"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            {forgotSent ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <IconCheck className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Reset Link Dispatched!</h4>
                <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                  If an account exists for <strong className="text-slate-800">{forgotEmail}</strong>, we
                  have sent recovery instructions to your email inbox. Please check your spam or junk folder if it does not appear within a couple of minutes.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotSent(false);
                      setForgotEmail('');
                      setForgotError(null);
                    }}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
                  >
                    Back to Login
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Enter your registered work email address below and we will dispatch a password recovery link.
                </p>

                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                    <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{forgotError}</span>
                  </div>
                )}

                <div className="relative">
                  <IconMail className="w-4 h-4 text-slate-500 font-medium absolute left-3.5 top-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. employee@acme.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotError(null);
                    }}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/30 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <IconLoader2 className="w-4 h-4 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
