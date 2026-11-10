import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../../api/client';
import {
  IconLock,
  IconEye,
  IconEyeOff,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconArrowRight,
  IconLoader2,
  IconShieldCheck,
} from '@tabler/icons-react';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password rules validation (matches backend ResetPasswordSchema)
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

    if (!token) {
      setError('Missing or invalid reset token. Please request a new password reset link.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!rules.every((r) => r.valid)) {
      setError('Please satisfy all password security requirements.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3500);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Failed to reset password. Your reset link may have expired.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-[#4f46e5] mb-3 shadow-2xs">
            <IconShieldCheck className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create a secure new password for your Uptrix account
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8">
          {!token ? (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <IconAlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                Invalid or Missing Reset Link
              </h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                This password reset link is invalid or has expired. Please return to the login page and request a new password reset email.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
                >
                  <span>Go to Login</span>
                  <IconArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="space-y-4 text-center py-4 animate-in fade-in">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <IconCheck className="w-7 h-7 stroke-[2.5]" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                Password Reset Successful!
              </h2>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                Your password has been securely updated. You will be automatically redirected to the login page in a few seconds.
              </p>
              <div className="pt-3">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#4338ca] text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/25"
                >
                  <span>Log in with New Password</span>
                  <IconArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2.5 animate-in fade-in">
                  <IconAlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IconLock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new strong password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showNew ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <IconLock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 focus:bg-white focus:outline-hidden focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showConfirm ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className={`text-[11px] font-semibold mt-1 flex items-center gap-1 ${
                      passwordsMatch ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {passwordsMatch ? (
                      <>
                        <IconCheck className="w-3.5 h-3.5" />
                        <span>Passwords match</span>
                      </>
                    ) : (
                      <>
                        <IconX className="w-3.5 h-3.5" />
                        <span>Passwords do not match</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Password Requirements
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {passedRulesCount}/{rules.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                  {rules.map((rule) => (
                    <div
                      key={rule.label}
                      className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                        rule.valid ? 'text-emerald-600' : 'text-slate-500'
                      }`}
                    >
                      {rule.valid ? (
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 stroke-[2.5]" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span>{rule.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !allRulesPassed}
                className="w-full py-2.5 px-5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] active:scale-[0.99] transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <IconLoader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Update Password</span>
                    <IconArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <Link
                  to="/login"
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Return to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

