import React, { useState } from 'react';
import api from '../../api/client';
import {
  IconShieldLock,
  IconUserPlus,
  IconCheck,
  IconAlertCircle,
  IconKey,
  IconMail,
  IconUser,
} from '@tabler/icons-react';

export const AddSuperAdminPage: React.FC = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await api.post('/superadmin/super-admins', {
        firstName: form.firstName.trim() || 'Super',
        lastName: form.lastName.trim() || 'Admin',
        email: form.email.trim().toLowerCase(),
        username: form.username.trim(),
        password: form.password,
      });

      setSuccessMsg(`Super Admin account "${res.data?.user?.email}" successfully provisioned!`);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        username: '',
        password: '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to create Super Admin');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <IconShieldLock className="w-7 h-7 text-brand-600" />
          Provision Platform Super Administrator
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Grant full platform-wide administrative privileges with tenant lifecycle management authority.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2 animate-in fade-in">
          <IconCheck className="w-5 h-5 shrink-0 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2 animate-in fade-in">
          <IconAlertCircle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 sm:p-8 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
            <input
              type="text"
              placeholder="e.g. Maya"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
            <input
              type="text"
              placeholder="e.g. Thorne"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email *</label>
          <div className="relative">
            <IconMail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              placeholder="admin@uptrix.io"
              value={form.email}
              onChange={(e) => {
                const email = e.target.value;
                const user = email.split('@')[0];
                setForm({ ...form, email, username: form.username || user });
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">System Username *</label>
          <div className="relative">
            <IconUser className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              placeholder="maya.thorne"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Temporary Initial Password *</label>
          <div className="relative">
            <IconKey className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-brand-500"
            />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Minimum 8 characters. Administrator will be prompted to reset upon first login.
          </span>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm shadow-sm transition-all shadow-brand-500/20 active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <IconUserPlus className="w-4 h-4" />
            {isSubmitting ? 'Provisioning...' : 'Provision Super Admin'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddSuperAdminPage;
