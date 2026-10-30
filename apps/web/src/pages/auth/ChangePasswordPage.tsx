import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  IconShieldLock,
  IconShieldCheck,
  IconLock,
  IconKey,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX,
  IconArrowRight,
  IconSparkles,
  IconFingerprint,
  IconUser,
  IconAlertCircle,
} from '@tabler/icons-react';

export const ChangePasswordPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Password rules validation
  const rules = [
    { label: 'At least 10 characters', valid: newPassword.length >= 10 },
    { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'One numerical digit (0-9)', valid: /[0-9]/.test(newPassword) },
  ];

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const allRulesPassed = rules.every((r) => r.valid) && passwordsMatch;
  const passedRulesCount = rules.filter((r) => r.valid).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (!rules.every((r) => r.valid)) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', { oldPassword, newPassword });
      setSuccess(true);
      await refreshUser();

      setTimeout(() => {
        if (user?.role === 'PRODUCT_SUPER_ADMIN') {
          navigate('/super-admin/dashboard');
        } else {
          navigate('/employee/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update password. Please check your current temporary password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f2f6fe] via-[#f7f9ff] to-[#edf3fd] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Decorative Soft Background Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center z-10 py-4">
        {/* Left Side: Brand & Security Showcase */}
        <div className="lg:col-span-6 flex flex-col justify-center items-start lg:pr-4 space-y-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5">
            <img
              src="/Uptrix_logo.png"
              alt="Uptrix Logo"
              className="h-9 max-h-9 w-auto object-contain"
            />
          </div>

          {/* Security Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold">
            <IconSparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>First-Time Security Activation</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-[1.2]">
            Secure Your <br />
            Workspace Account <br />
            <span className="text-[#5E4BE2]">In One Quick Step</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md">
            To ensure zero-trust workspace security and protect your employee profile, you must replace your temporary initial password with a private secure password.
          </p>

          {/* Current User Pill */}
          {user && (
            <div className="w-full max-w-md p-3.5 bg-white/90 backdrop-blur-xs border border-slate-200/80 rounded-2xl shadow-2xs flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] font-bold text-sm shrink-0">
                {user.firstName ? user.firstName.charAt(0).toUpperCase() : <IconUser className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">
                  {user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email}
                </p>
                <p className="text-[11px] font-mono text-slate-500 truncate">{user.email}</p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase shrink-0">
                {user.role.replace('_', ' ')}
              </span>
            </div>
          )}

          {/* Security Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-1">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <IconShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">256-bit Encrypted</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/60 border border-slate-200/60">
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <IconFingerprint className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-slate-700">Zero-Trust Protected</span>
            </div>
          </div>
        </div>

        {/* Right Side: Professional Card Form */}
        <div className="lg:col-span-6 w-full">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-indigo-500/5 p-6 sm:p-8 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200/80 shrink-0">
                <IconShieldLock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Security Update Required</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Set your new private password to unlock your workspace.
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-start gap-2 animate-in fade-in">
                <IconAlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2 animate-in fade-in">
                <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Password updated successfully! Redirecting to workspace...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Current Temporary Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Current Temporary Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IconKey className="w-4 h-4" />
                  </div>
                  <input
                    type={showOld ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter your current temporary password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-50 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showOld ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 2. New Secure Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Secure Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-500">
                    <IconLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 10 characters"
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-50 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNew ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {newPassword.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                      <span>Strength</span>
                      <span className={passedRulesCount === 4 ? 'text-emerald-600' : passedRulesCount >= 2 ? 'text-amber-600' : 'text-rose-500'}>
                        {passedRulesCount === 4 ? 'Strong' : passedRulesCount >= 2 ? 'Moderate' : 'Weak'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-full rounded-full transition-all duration-300 ${
                            step <= passedRulesCount
                              ? passedRulesCount === 4
                                ? 'bg-emerald-500'
                                : passedRulesCount >= 2
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <IconLock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new secure password"
                    className="w-full pl-10 pr-10 py-2.5 text-xs font-semibold text-slate-900 bg-[#f8fafc] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-50 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirm ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${passwordsMatch ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {passwordsMatch ? <IconCheck className="w-3.5 h-3.5" /> : <IconX className="w-3.5 h-3.5" />}
                    <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                  </p>
                )}
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200/80 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block">
                  Password Security Rules
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rules.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 text-xs p-1.5 rounded-lg transition-colors ${
                        r.valid ? 'bg-emerald-50/80 text-emerald-800 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${
                          r.valid ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        {r.valid ? '✓' : '•'}
                      </div>
                      <span>{r.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <button
                type="submit"
                disabled={!allRulesPassed || loading || success}
                className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] active:scale-[0.99] transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Updating Password...'
                ) : (
                  <>
                    <span>Save Password & Continue</span>
                    <IconArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors text-center cursor-pointer"
              >
                Cancel and Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordPage;
