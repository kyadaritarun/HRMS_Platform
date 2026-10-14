import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { IconShieldLock, IconCheck, IconX, IconArrowRight } from '@tabler/icons-react';

export const ChangePasswordPage: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const allRulesPassed = rules.every((r) => r.valid) && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
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
        } else if (user?.role === 'COMPANY_ADMIN' || user?.role === 'HR') {
          navigate('/company/dashboard');
        } else {
          navigate('/employee/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 selection:bg-brand-500 selection:text-white">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-200">
            <IconShieldLock className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Security Update Required</h2>
          <p className="text-xs text-slate-500 mt-1">
            Please change your initial or temporary password to activate your account.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium flex items-center gap-2">
            <IconCheck className="w-4 h-4" /> Password updated! Redirecting to your workspace...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Current Temporary Password</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">New Secure Password</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-brand-500 outline-hidden"
            />
          </div>

          {/* Policy Checklist */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 border border-slate-100">
            <div className="text-[11px] font-bold text-slate-600 mb-1">Password Requirements:</div>
            {rules.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {r.valid ? (
                  <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <IconX className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className={r.valid ? 'text-emerald-700 font-medium' : 'text-slate-500'}>
                  {r.label}
                </span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={!allRulesPassed || loading || success}
            className="w-full py-3 px-4 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 active:scale-[0.99] transition-all shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Updating Password...' : 'Save Password & Continue'}
            <IconArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 text-center"
          >
            Cancel and Sign Out
          </button>
        </form>
      </div>
    </div>
  );
};
