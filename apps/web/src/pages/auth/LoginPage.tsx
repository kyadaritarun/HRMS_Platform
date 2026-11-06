import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  IconSparkles,
} from '@tabler/icons-react';

interface DemoPersona {
  id: string;
  name: string;
  roleTag: string;
  role: string;
  dept: string;
  login: string;
  pass: string;
  icon: string;
}

const DEMO_PERSONAS: DemoPersona[] = [
  {
    id: 'uptrix_admin',
    name: 'Srikanth',
    roleTag: 'Company Administrator',
    role: 'Admin',
    dept: 'Administration',
    login: 'srikanth@uptrixglobal.com',
    pass: 'Password@123',
    icon: '🚀',
  },
  {
    id: 'uptrix_hr',
    name: 'Alekhya',
    roleTag: 'HR Manager',
    role: 'HR',
    dept: 'Human Resources',
    login: 'alekhya@uptrixglobal.com',
    pass: 'Password@123',
    icon: '📋',
  },
  {
    id: 'uptrix_it_team',
    name: 'Kyadari Tarun',
    roleTag: 'IT Manager (Team 1)',
    role: 'Manager',
    dept: 'IT Team',
    login: 'tarun@uptrixglobal.com',
    pass: 'Password@123',
    icon: '💻',
  },
  {
    id: 'uptrix_it_team_karan',
    name: 'Karan',
    roleTag: 'IT Associate (Team 1)',
    role: 'Employee',
    dept: 'IT Team',
    login: 'karan@uptrixglobal.com',
    pass: 'Password@123',
    icon: '💻',
  },
  {
    id: 'uptrix_it_tickets',
    name: 'Raju Kali',
    roleTag: 'IT Tickets Manager (Team 2)',
    role: 'Manager',
    dept: 'IT Tickets',
    login: 'rajukali@uptrixglobal.com',
    pass: 'Password@123',
    icon: '🎫',
  },
  {
    id: 'uptrix_it_tickets_greeshma',
    name: 'Greeshma Devi',
    roleTag: 'IT Tickets Associate (Team 2)',
    role: 'Employee',
    dept: 'IT Tickets',
    login: 'greeshmadevi@uptrixglobal.com',
    pass: 'Password@123',
    icon: '🎫',
  },
  {
    id: 'uptrix_manager',
    name: 'Chandra Kali',
    roleTag: 'Marketing Manager (Team 3)',
    role: 'Manager',
    dept: 'Digital Marketing',
    login: 'chandrakali@uptrixglobal.com',
    pass: 'Password@123',
    icon: '💼',
  },
  {
    id: 'uptrix_employee',
    name: 'Hari Karan',
    roleTag: 'Marketing Executive (Team 3)',
    role: 'Employee',
    dept: 'Digital Marketing',
    login: 'harikaran@uptrixglobal.com',
    pass: 'Password@123',
    icon: '💼',
  },
  {
    id: 'uptrix_finance',
    name: 'Sushanth',
    roleTag: 'Finance Manager (Team 4)',
    role: 'Manager',
    dept: 'Finance',
    login: 'sushanth@uptrixglobal.com',
    pass: 'Password@123',
    icon: '💰',
  },
  {
    id: 'uptrix_finance_kiran',
    name: 'Tumpelle Kiran',
    roleTag: 'Finance Associate (Team 4)',
    role: 'Employee',
    dept: 'Finance',
    login: 'tumpellekiran@uptrixglobal.com',
    pass: 'Password@123',
    icon: '💰',
  },
  {
    id: 'superadmin',
    name: 'Super Admin',
    roleTag: 'SaaS Platform Owner',
    role: 'Superadmin',
    dept: 'Platform',
    login: 'superadmin@uptrix.io',
    pass: 'SuperAdmin@123',
    icon: '👑',
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ login: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [showDemoPersonas, setShowDemoPersonas] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

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
      setActivePersonaId(null);
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleAuth(form);
  };

  const handle1ClickLogin = (persona: DemoPersona) => {
    setForm({ login: persona.login, password: persona.pass });
    setActivePersonaId(persona.id);
    handleAuth({ login: persona.login, password: persona.pass });
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSent(true);
    setTimeout(() => {
      setShowForgotModal(false);
      setForgotSent(false);
      setForgotEmail('');
    }, 2500);
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
                {loading && !activePersonaId ? (
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

            {/* Or Separator */}
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200/70" />
              </div>
              <span className="relative px-2.5 bg-white text-[10px] sm:text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                or
              </span>
            </div>

            {/* Continue with Google Button */}
            <button
              type="button"
              onClick={() => setError('Google Single Sign-On is not configured for your workspace. Please sign in with your username or work email.')}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 transition-colors text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 shadow-2xs cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Footer Text */}
            <p className="mt-3.5 text-center text-[11px] text-slate-500 font-medium">
              New to UPTRIX HRMS?{' '}
              <a
                href="mailto:support@uptrix.io"
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Contact your administrator
              </a>
            </p>
          </div>

          {/* Quick Demo Credentials Toggle (Expandable Helper) */}
          <div className="w-full max-w-[380px] sm:max-w-md lg:max-w-xl mt-2 transition-all">
            <button
              onClick={() => setShowDemoPersonas(!showDemoPersonas)}
              className="w-full text-center py-1 text-[11px] font-semibold text-slate-500 hover:text-indigo-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <IconSparkles className="w-3 h-3 text-indigo-500" />
              <span>{showDemoPersonas ? 'Hide Quick Demo Logins' : '1-Click Demo Logins (All 10 Employees & Super Admin)'}</span>
            </button>

            {showDemoPersonas && (
              <div className="mt-2.5 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden animate-in fade-in duration-200">
                <div className="px-3.5 py-2.5 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                    <IconSparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Uptrix Technologies • All 10 Employees</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">Click Login to sign in instantly</span>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#f1f5f9] text-[10px] uppercase font-bold text-slate-600 tracking-wider sticky top-0 backdrop-blur-xs z-10 border-b border-slate-200/70">
                      <tr>
                        <th className="py-2 pl-3 pr-2 text-center w-8">#</th>
                        <th className="py-2 px-2">Employee &amp; Role</th>
                        <th className="py-2 px-2 hidden sm:table-cell">Department</th>
                        <th className="py-2 pr-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {DEMO_PERSONAS.map((persona, idx) => (
                        <tr
                          key={persona.id}
                          onClick={() => handle1ClickLogin(persona)}
                          className="hover:bg-indigo-50/60 cursor-pointer transition-colors group"
                        >
                          <td className="py-2 pl-3 pr-2 text-[11px] text-slate-400 font-mono text-center">
                            {idx + 1}
                          </td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm shrink-0">{persona.icon}</span>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                  <span>{persona.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-colors">
                                    {persona.role}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono truncate">
                                  {persona.login}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-[11px] text-slate-600 font-medium whitespace-nowrap hidden sm:table-cell">
                            <span className="inline-block px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[10px] font-semibold text-slate-700">
                              {persona.dept}
                            </span>
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handle1ClickLogin(persona);
                              }}
                              disabled={loading}
                              className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg border border-indigo-200 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                            >
                              Login &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                  have sent recovery instructions via email.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Enter your registered work email address below and we will dispatch a password recovery link.
                </p>

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
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/30"
                  >
                    Send Reset Link
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
