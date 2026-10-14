import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import {
  IconUser,
  IconBriefcase,
  IconPhone,
  IconLock,
  IconBuilding,
  IconCheck,
  IconAlertTriangle,
  IconX,
  IconEdit,
  IconCamera,
  IconLoader2,
} from '@tabler/icons-react';

interface FullUserProfile {
  id: number;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  jobTitle?: string;
  profilePhoto?: string | null;
  dateOfBirth?: string;
  joiningDate?: string;
  employmentType?: string;
  workMode?: string;
  emergencyContact?: any;
  department?: { id: number; name: string } | null;
  manager?: { id: number; firstName: string; lastName: string; email: string } | null;
}

export const ProfilePage: React.FC = () => {
  const { user: authUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState<FullUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Photo Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    dateOfBirth: '',
  });
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Password Modal State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState<{
    loading: boolean;
    error: string | null;
    success: string | null;
  }>({
    loading: false,
    error: null,
    success: null,
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/auth/me');
      const u = res.data?.user;
      if (u) {
        setProfile(u);
        setForm({
          firstName: u.firstName || '',
          lastName: u.lastName || '',
          phone: u.phone || '',
          dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '',
        });
      }
    } catch (err) {
      console.error('Failed to load profile details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Image file must be under 5MB');
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoError(null);
    setSaveSuccess(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await api.post('/auth/profile-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.profilePhoto) {
        setProfile((prev) => (prev ? { ...prev, profilePhoto: res.data.profilePhoto } : null));
        setSaveSuccess('Profile image uploaded to AWS S3 (image folder)');
        if (refreshUser) {
          await refreshUser();
        }
      }
    } catch (err: any) {
      console.error('Failed to upload profile photo to AWS:', err);
      setPhotoError(err.response?.data?.message || err.response?.data?.error || 'Failed to upload image to AWS');
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getAvatarUrl = (url?: string | null): string | undefined => {
    if (!url) return undefined;
    if (url.includes('.amazonaws.com/image/')) {
      const filename = url.split('.amazonaws.com/image/')[1];
      return `/image/${filename}`;
    }
    if (url.includes('.amazonaws.com/uploads/')) {
      const filename = url.split('.amazonaws.com/uploads/')[1];
      return `/uploads/${filename}`;
    }
    return url;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const res = await api.patch('/auth/me', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        dateOfBirth: form.dateOfBirth || null,
      });
      setProfile((prev) => (prev ? { ...prev, ...res.data?.user } : prev));
      setSaveSuccess('Profile updated successfully.');
      setIsEditing(false);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.error || err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus({ loading: true, error: null, success: null });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({
        loading: false,
        error: 'New passwords do not match.',
        success: null,
      });
      return;
    }

    try {
      await api.post('/auth/change-password', {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordStatus({
        loading: false,
        error: null,
        success: 'Password updated successfully.',
      });
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordStatus({ loading: false, error: null, success: null });
      }, 1500);
    } catch (err: any) {
      setPasswordStatus({
        loading: false,
        error: err.response?.data?.error || err.response?.data?.message || 'Failed to update password',
        success: null,
      });
    }
  };

  const user = profile || (authUser as any);
  if (!user && isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  const initials = `${user?.firstName?.[0] || user?.email?.[0] || 'U'}${
    user?.lastName?.[0] || user?.email?.[1] || 'P'
  }`.toLowerCase();

  const displayName =
    user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : user?.firstName || user?.email || 'Not provided';

  // Emergency contact data (if stored in JSON or default)
  const emergency =
    typeof user?.emergencyContact === 'object' && user?.emergencyContact !== null
      ? user.emergencyContact
      : {};

  return (
    <div className="max-w-10xl mx-auto space-y-5 pb-12">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage your personal information and work details
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          {saveSuccess}
        </div>
      )}
      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <IconAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          {saveError}
        </div>
      )}

      {photoError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <IconAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          {photoError}
        </div>
      )}

      {/* Main Unified Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Top Header Card Banner */}
        <div className="p-6 bg-gradient-to-r from-blue-50/80 via-indigo-50/30 to-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar Circle with Upload Trigger */}
            <div className="relative group shrink-0">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                className="hidden"
                id="profile-photo-upload"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-bold text-lg border-2 border-white shadow-sm shrink-0 cursor-pointer overflow-hidden relative transition-all group-hover:shadow-md"
                title="Click to change profile image (saved in AWS S3 image folder)"
              >
                {getAvatarUrl(user?.profilePhoto) ? (
                  <img
                    src={getAvatarUrl(user?.profilePhoto)}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="uppercase tracking-wider font-extrabold">{initials}</span>
                )}

                {/* Uploading Spinner */}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center text-white z-10">
                    <IconLoader2 className="w-5 h-5 animate-spin text-white" />
                    <span className="text-[9px] font-semibold mt-1">Uploading...</span>
                  </div>
                )}

                {/* Hover Camera Overlay */}
                {!isUploadingPhoto && (
                  <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <IconCamera className="w-5 h-5 text-white drop-shadow" />
                    <span className="text-[9px] font-medium mt-0.5">Change</span>
                  </div>
                )}
              </div>

              {/* Camera Badge Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                title="Upload Photo to AWS S3"
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-all cursor-pointer group-hover:bg-blue-50"
              >
                <IconCamera className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Profile Info & Pills */}
            <div className="space-y-1">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {displayName}
              </h2>
              <p className="text-xs text-slate-500 font-normal">{user?.email || 'Not provided'}</p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
                  <IconBuilding className="w-3.5 h-3.5 text-slate-400" />
                  {user?.department?.name || 'Department not set'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
                  <IconBriefcase className="w-3.5 h-3.5 text-slate-400" />
                  {user?.jobTitle || 'Job role not set'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Button: Update Password */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <IconEdit className="w-3.5 h-3.5 text-slate-500" />
              {isEditing ? 'Cancel Edit' : 'Edit Profile'}
            </button>
            <button
              type="button"
              onClick={() => {
                setPasswordStatus({ loading: false, error: null, success: null });
                setShowPasswordModal(true);
              }}
              className="px-3.5 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <IconLock className="w-3.5 h-3.5 text-blue-600" />
              Update Password
            </button>
          </div>
        </div>

        {/* Card Body with 3 Sections */}
        <form onSubmit={handleSaveProfile} className="p-6 space-y-7">
          {/* Section 1: Basic Information */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm tracking-tight">
              <IconUser className="w-4 h-4 text-blue-600" />
              <span>Basic Information</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-xs text-slate-800 focus:outline-brand-600"
                    placeholder="First Name"
                  />
                ) : (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                    {user?.firstName || 'Not provided'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-xs text-slate-800 focus:outline-brand-600"
                    placeholder="Last Name"
                  />
                ) : (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                    {user?.lastName || 'Not provided'}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Address</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {user?.email || 'Not provided'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-xs text-slate-800 focus:outline-brand-600"
                    placeholder="Phone Number"
                  />
                ) : (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                    {user?.phone || 'Not provided'}
                  </div>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Date of Birth</label>
                {isEditing ? (
                  <input
                    type="date"
                    value={form.dateOfBirth}
                    onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-blue-300 bg-white text-xs text-slate-800 focus:outline-brand-600"
                  />
                ) : (
                  <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                    {user?.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not provided'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 2: Work Details */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm tracking-tight">
              <IconBriefcase className="w-4 h-4 text-blue-600" />
              <span>Work Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Joining Date</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {user?.joiningDate ? new Date(user.joiningDate).toLocaleDateString() : 'Not provided'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Employment Type</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {user?.employmentType === 'PART_TIME' ? 'Part-time' : 'Full-time'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Work Mode</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {user?.workMode === 'WFH'
                    ? 'Work From Home'
                    : user?.workMode === 'HYBRID'
                    ? 'Hybrid'
                    : 'Work From Office'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Department</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {user?.department?.name || 'Not provided'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Job Role</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {user?.jobTitle || 'Not provided'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Reports To</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {user?.manager
                    ? `${user.manager.firstName || ''} ${user.manager.lastName || ''}`.trim() || user.manager.email
                    : '-'}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          {/* Section 3: Emergency Contact */}
          <div className="space-y-3.5">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm tracking-tight">
              <IconPhone className="w-4 h-4 text-blue-600" />
              <span>Emergency Contact</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Contact Name</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {emergency.name || emergency.contactName || 'Not provided'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Relation</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {emergency.relation || emergency.relationship || 'Not provided'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Phone Number</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {emergency.phone || emergency.phoneNumber || 'Not provided'}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Email Address</label>
                <div className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200/90 bg-[#fafafa] text-xs text-slate-700 font-normal">
                  {emergency.email || 'Not provided'}
                </div>
              </div>
            </div>
          </div>

          {/* Save Button if Editing */}
          {isEditing && (
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* UPDATE PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <IconLock className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Update Password</h3>
              </div>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="py-4 space-y-4">
              {passwordStatus.error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <IconAlertTriangle className="w-4 h-4 shrink-0" />
                  {passwordStatus.error}
                </div>
              )}
              {passwordStatus.success && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <IconCheck className="w-4 h-4 shrink-0" />
                  {passwordStatus.success}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={passwordForm.oldPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password (min. 8 characters)"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-brand-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordStatus.loading}
                  className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  {passwordStatus.loading ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
