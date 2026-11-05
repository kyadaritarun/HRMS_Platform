import React, { useState, useRef } from 'react';
import {
  IconX,
  IconLoader2,
  IconCheck,
  IconUser,
  IconMail,
  IconPhone,
  IconBriefcase,
  IconId,
  IconFileText,
  IconUpload,
  IconSparkles,
} from '@tabler/icons-react';
import api from '../../api/client';

interface ReferLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReferLeadModal: React.FC<ReferLeadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    candidateName: '',
    jobRole: '',
    jobId: '',
    mobileNumber: '',
    email: '',
    notes: '',
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('File size exceeds the 10MB limit.');
        return;
      }
      setResumeFile(file);
      if (errorMessage) setErrorMessage(null);
    }
  };

  const handleRemoveFile = () => {
    setResumeFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!formData.candidateName.trim()) {
      setErrorMessage('Employee / Candidate name is required.');
      return;
    }
    if (!formData.jobRole.trim()) {
      setErrorMessage('Job role is required.');
      return;
    }
    if (!formData.jobId.trim()) {
      setErrorMessage('Job ID is required.');
      return;
    }
    if (!formData.mobileNumber.trim()) {
      setErrorMessage('Contact phone number is required.');
      return;
    }
    if (!formData.email.trim()) {
      setErrorMessage('Candidate working email is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalResumeUrl = '';
      if (resumeFile) {
        // Convert file to Base64 data URL so it can be viewed / downloaded by HR directly
        finalResumeUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve(resumeFile.name);
          reader.readAsDataURL(resumeFile);
        });
      }

      const payload: any = {
        candidateName: formData.candidateName.trim(),
        ownerName: formData.candidateName.trim(), // fallback alias
        jobRole: formData.jobRole.trim(),
        businessName: formData.jobRole.trim(), // fallback alias
        jobId: formData.jobId.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        email: formData.email.trim(),
        resumeUrl: finalResumeUrl || (resumeFile ? resumeFile.name : ''),
        notes: formData.notes.trim(),
      };

      await api.post('/referrals', payload);

      setSuccessMessage('Referral submitted successfully! HR and candidate have been notified via email.');
      setTimeout(() => {
        setSuccessMessage(null);
        setFormData({
          candidateName: '',
          jobRole: '',
          jobId: '',
          mobileNumber: '',
          email: '',
          notes: '',
        });
        setResumeFile(null);
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to submit referral. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10 pointer-events-none">
        <div
          className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col h-full animate-in slide-in-from-right duration-300 pointer-events-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center border border-indigo-100 shrink-0">
                <IconBriefcase className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Refer an Employee</h2>
                <p className="text-[11px] text-slate-500 font-medium">
                  Recommend talented peers for open positions &amp; notify HR
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close dialog"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>

          {/* Description Banner */}
          <div className="px-6 pt-4 pb-1 shrink-0">
            <p className="text-xs text-slate-600 leading-relaxed">
              Fill in the employee referral details below. Our HR team will be notified with priority, and the referred employee will receive an email letting them know you referred them.
            </p>
          </div>

          {/* Success Alert */}
          {successMessage && (
            <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shrink-0">
              <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMessage && (
            <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold shrink-0">
              {errorMessage}
            </div>
          )}

          {/* Form with scrollable body & pinned bottom action footer */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Row 1: Candidate Name & Job ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employee Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="candidateName"
                    value={formData.candidateName}
                    onChange={handleChange}
                    placeholder="Enter employee name"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Job ID / Requisition ID <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="jobId"
                    value={formData.jobId}
                    onChange={handleChange}
                    placeholder="e.g. JOB-101"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all font-mono"
                  />
                </div>
              </div>

              {/* Row 2: Job Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Job Role / Position <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="jobRole"
                  value={formData.jobRole}
                  onChange={handleChange}
                  placeholder="e.g. Senior Frontend Developer"
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
                />
              </div>

              {/* Row 3: Contact Details (Mobile & Working Email) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contact Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex rounded-xl overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-[#5E4BE2] transition-all bg-white">
                    <span className="inline-flex items-center px-3 text-xs font-semibold text-slate-600 bg-slate-100 border-r border-slate-200">
                      +91
                    </span>
                    <input
                      type="tel"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      placeholder="Enter mobile number"
                      required
                      className="w-full px-3 py-2 text-xs bg-slate-50/60 text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Working Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter working email"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Row 4: Employee Resume File Upload (Not URL) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Upload Employee Resume <span className="text-slate-400 font-normal">(PDF, DOC, DOCX - Up to 10MB)</span>
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  data-testid="resume-file-input"
                  aria-label="Upload Resume"
                />

                {!resumeFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-[#5E4BE2] bg-slate-50/60 hover:bg-indigo-50/20 rounded-2xl p-5 text-center cursor-pointer transition-all group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-[#5E4BE2] flex items-center justify-center mx-auto mb-2 border border-indigo-100 group-hover:scale-105 transition-transform">
                      <IconUpload className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to upload employee resume
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supported formats: PDF, DOC, DOCX (Up to 10 MB)
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[#5E4BE2] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <IconFileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {resumeFile.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {(resumeFile.size / 1024).toFixed(1)} KB • Ready to submit
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove resume"
                    >
                      <IconX className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Row 5: Referral Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Referral Notes / Fit Recommendation <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Why are they a great fit for this position? (e.g. past projects, expertise, character...)"
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50/60 border border-slate-200 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#5E4BE2] focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Action Footer Buttons pinned at bottom */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <span className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
                <IconSparkles className="w-3.5 h-3.5" />
                <span>Priority review by HR team</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#5E4BE2] hover:bg-[#4d3bcb] active:scale-95 rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <IconLoader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Submit Referral</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReferLeadModal;
