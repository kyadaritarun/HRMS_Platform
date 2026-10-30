import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  IconUserPlus,
  IconCheck,
  IconAlertCircle,
  IconBriefcase,
  IconBuilding,
  IconCash,
  IconShieldLock,
  IconMail,
  IconPhone,
  IconCalendar,
  IconUser,
  IconBuildingSkyscraper,
  IconUpload,
  IconId,
  IconX,
  IconAt,
  IconFileCheck,
  IconPaperclip,
  IconHeartHandshake,
  IconFileSpreadsheet,
  IconDownload,
  IconArrowRight,
  IconClock,
  IconMapPin,
  IconExternalLink,
} from '@tabler/icons-react';
import BulkEmployeeImport from './BulkEmployeeImport';
import { ShiftTiming, formatShiftOption } from '../../utils/shifts';

interface Department {
  id: number;
  name: string;
}

interface Manager {
  id: number;
  firstName: string;
  lastName: string;
  jobTitle: string;
}

interface UploadedDoc {
  file: File | null;
  name: string;
  size: string;
  previewUrl?: string;
}


export const NewEmployeePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isCompanyAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'PRODUCT_SUPER_ADMIN';
  const isHr = user?.role === 'HR';
  const [departments, setDepartments] = useState<Department[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [companyShifts, setCompanyShifts] = useState<ShiftTiming[]>([]);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    title: string;
    message: string;
    type: 'error' | 'success' | 'warning';
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);
  const [onboardingMode, setOnboardingMode] = useState<'single' | 'bulk'>('single');
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  // Auto dismiss toast after 7 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 7000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleDownloadTemplate = async () => {
    setIsDownloadingTemplate(true);
    try {
      const res = await api.get('/employees/template', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Employee_Bulk_Import_Template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download template. Please try again.');
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    personalEmail: '',
    employeeNumber: '',
    dateOfBirth: '',
    username: '',
    phone: '',
    role: 'EMPLOYEE',
    jobTitle: '',
    departmentId: '',
    managerId: '',
    workMode: 'WFO',
    workType: 'PERMANENT',
    shiftTiming: '',
    address: '',
    workingAddress: '',
    joiningDate: new Date().toISOString().split('T')[0],
    monthlySalary: '',
    currency: 'INR',
    emergencyContactName: '',
    emergencyContactRelationship: '',
    emergencyContactPhone: '',
    canManagePerformance: false,
  });

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const maxDobDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    return d.toISOString().split('T')[0];
  }, []);

  const handleNumericKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) ||
      ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase()))
    ) {
      return;
    }
    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const validateField = (name: string, value: string, currentForm = form) => {
    let errorMsg = '';
    const trimmed = (value || '').trim();

    switch (name) {
      case 'firstName':
        if (!trimmed) errorMsg = 'First name is required.';
        else if (trimmed.length < 2) errorMsg = 'First name must be at least 2 characters.';
        else if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) errorMsg = 'First name can only contain letters, spaces, and hyphens.';
        break;
      case 'lastName':
        if (trimmed && !/^[a-zA-Z\s'-]+$/.test(trimmed)) errorMsg = 'Last name can only contain letters, spaces, and hyphens.';
        break;
      case 'employeeNumber':
        if (!trimmed) errorMsg = 'Employee ID is required.';
        else if (!/^[a-zA-Z0-9_\-\/]+$/.test(trimmed)) errorMsg = 'Employee ID can only contain letters, numbers, hyphens, and slashes.';
        break;
      case 'dateOfBirth':
        if (!trimmed) {
          errorMsg = 'Date of birth is required.';
        } else {
          const dob = new Date(trimmed);
          const today = new Date();
          if (isNaN(dob.getTime())) {
            errorMsg = 'Please enter a valid date of birth.';
          } else if (dob > today) {
            errorMsg = 'Date of birth cannot be in the future.';
          } else {
            let age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
            if (age < 18) errorMsg = 'Employee must be at least 18 years old.';
            else if (age > 100) errorMsg = 'Please enter a valid date of birth (under 100 years).';
          }
        }
        break;
      case 'email': {
        if (!trimmed) {
          errorMsg = 'Work email is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
          errorMsg = 'Please enter a valid work email address.';
        } else if (allowedDomains.length > 0) {
          const domain = trimmed.split('@')[1]?.toLowerCase().trim();
          if (domain && !allowedDomains.includes(domain)) {
            errorMsg = `Email domain '@${domain}' is not valid. Company admin only authorized corporate domain(s): @${allowedDomains.join(', @')}`;
          }
        }
        break;
      }
      case 'personalEmail':
        if (!trimmed) errorMsg = 'Personal email address is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) errorMsg = 'Please enter a valid personal email address.';
        else if (currentForm.email && trimmed.toLowerCase() === currentForm.email.trim().toLowerCase()) {
          errorMsg = 'Personal email cannot be the same as work email.';
        }
        break;
      case 'username':
        if (!trimmed) errorMsg = 'System username is required.';
        else if (trimmed.length < 3) errorMsg = 'Username must be at least 3 characters.';
        else if (!/^[a-zA-Z0-9._-]+$/.test(trimmed)) errorMsg = 'Username can only contain letters, numbers, dots, hyphens, and underscores.';
        break;
      case 'phone':
        if (!trimmed) {
          errorMsg = 'Phone number is required.';
        } else if (!/^\d{10}$/.test(trimmed)) {
          errorMsg = 'Phone number must be exactly 10 numeric digits.';
        }
        break;
      case 'joiningDate':
        if (!trimmed) errorMsg = 'Joining date is required.';
        break;
      case 'emergencyContactName':
        if (!trimmed) errorMsg = 'Emergency contact name is required.';
        else if (trimmed.length < 2) errorMsg = 'Name must be at least 2 characters.';
        else if (!/^[a-zA-Z\s'-]+$/.test(trimmed)) errorMsg = 'Name can only contain letters, spaces, and hyphens.';
        break;
      case 'emergencyContactRelationship':
        if (!trimmed) errorMsg = 'Relationship is required (e.g. Spouse, Parent).';
        else if (trimmed.length < 2) errorMsg = 'Relationship must be at least 2 characters.';
        break;
      case 'emergencyContactPhone':
        if (!trimmed) errorMsg = 'Emergency contact number is required.';
        else if (!/^\d{10}$/.test(trimmed)) errorMsg = 'Contact number must be exactly 10 numeric digits.';
        break;
      case 'shiftTiming':
        if (!trimmed) {
          errorMsg = companyShifts.length === 0
            ? 'No shifts found. Please configure shifts in Shift & Roster first.'
            : 'Please select a shift timing.';
        }
        break;
      case 'address':
        if (trimmed && trimmed.length < 3) errorMsg = 'Address should be at least 3 characters.';
        break;
      case 'workingAddress':
        if (!trimmed) errorMsg = 'Working address is required.';
        else if (trimmed.length < 3) errorMsg = 'Working address should be at least 3 characters.';
        break;
      case 'monthlySalary':
        if (trimmed === '' || isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
          errorMsg = 'Cost to Company (CTC) must be a positive number greater than 0.';
        }
        break;
      default:
        break;
    }

    setErrors((prev) => {
      const next = { ...prev };
      if (errorMsg) next[name] = errorMsg;
      else delete next[name];
      return next;
    });

    return errorMsg;
  };

  const validateAll = (data = form) => {
    const newErrors: Record<string, string> = {};

    // First Name
    if (!data.firstName?.trim()) newErrors.firstName = 'First name is required.';
    else if (data.firstName.trim().length < 2) newErrors.firstName = 'First name must be at least 2 characters.';
    else if (!/^[a-zA-Z\s'-]+$/.test(data.firstName.trim())) newErrors.firstName = 'First name can only contain letters, spaces, and hyphens.';

    // Last Name
    if (data.lastName?.trim() && !/^[a-zA-Z\s'-]+$/.test(data.lastName.trim())) {
      newErrors.lastName = 'Last name can only contain letters, spaces, and hyphens.';
    }

    // Employee ID
    if (!data.employeeNumber?.trim()) newErrors.employeeNumber = 'Employee ID is required.';
    else if (!/^[a-zA-Z0-9_\-\/]+$/.test(data.employeeNumber.trim())) newErrors.employeeNumber = 'Employee ID can only contain letters, numbers, hyphens, and slashes.';

    // Date of Birth
    if (!data.dateOfBirth?.trim()) {
      newErrors.dateOfBirth = 'Date of birth is required.';
    } else {
      const dob = new Date(data.dateOfBirth);
      const today = new Date();
      if (isNaN(dob.getTime())) newErrors.dateOfBirth = 'Please enter a valid date of birth.';
      else if (dob > today) newErrors.dateOfBirth = 'Date of birth cannot be in the future.';
      else {
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        if (age < 18) newErrors.dateOfBirth = 'Employee must be at least 18 years old.';
        else if (age > 100) newErrors.dateOfBirth = 'Please enter a valid date of birth (under 100 years).';
      }
    }

    // Work Email
    if (!data.email?.trim()) {
      newErrors.email = 'Work email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email.trim())) {
      newErrors.email = 'Please enter a valid work email address.';
    } else if (allowedDomains.length > 0) {
      const domain = data.email.trim().split('@')[1]?.toLowerCase().trim();
      if (domain && !allowedDomains.includes(domain)) {
        newErrors.email = `Email domain '@${domain}' is not valid. Company admin only authorized corporate domain(s): @${allowedDomains.join(', @')}`;
      }
    }

    // Personal Email
    if (!data.personalEmail?.trim()) newErrors.personalEmail = 'Personal email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.personalEmail.trim())) newErrors.personalEmail = 'Please enter a valid personal email address.';
    else if (data.email && data.personalEmail.trim().toLowerCase() === data.email.trim().toLowerCase()) {
      newErrors.personalEmail = 'Personal email cannot be the same as work email.';
    }

    // Username
    if (!data.username?.trim()) newErrors.username = 'System username is required.';
    else if (data.username.trim().length < 3) newErrors.username = 'Username must be at least 3 characters.';
    else if (!/^[a-zA-Z0-9._-]+$/.test(data.username.trim())) newErrors.username = 'Username can only contain letters, numbers, dots, hyphens, and underscores.';

    // Phone (Required, exactly 10 digits)
    if (!data.phone?.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(data.phone.trim())) {
      newErrors.phone = 'Phone number must be exactly 10 numeric digits.';
    }

    // Joining Date
    if (!data.joiningDate?.trim()) newErrors.joiningDate = 'Joining date is required.';

    // Emergency Contact Name
    if (!data.emergencyContactName?.trim()) newErrors.emergencyContactName = 'Emergency contact name is required.';
    else if (data.emergencyContactName.trim().length < 2) newErrors.emergencyContactName = 'Name must be at least 2 characters.';
    else if (!/^[a-zA-Z\s'-]+$/.test(data.emergencyContactName.trim())) newErrors.emergencyContactName = 'Name can only contain letters, spaces, and hyphens.';

    // Emergency Contact Relationship
    if (!data.emergencyContactRelationship?.trim()) newErrors.emergencyContactRelationship = 'Relationship is required (e.g. Spouse, Parent).';
    else if (data.emergencyContactRelationship.trim().length < 2) newErrors.emergencyContactRelationship = 'Relationship must be at least 2 characters.';

    // Emergency Contact Phone
    if (!data.emergencyContactPhone?.trim()) newErrors.emergencyContactPhone = 'Emergency contact number is required.';
    else if (!/^\d{10}$/.test(data.emergencyContactPhone.trim())) newErrors.emergencyContactPhone = 'Contact number must be exactly 10 numeric digits.';

    // Cost to Company (CTC)
    if (data.monthlySalary === '' || data.monthlySalary === undefined || data.monthlySalary === null) {
      newErrors.monthlySalary = 'Cost to Company (CTC) is required.';
    } else if (isNaN(Number(data.monthlySalary)) || Number(data.monthlySalary) <= 0) {
      newErrors.monthlySalary = 'Cost to Company (CTC) must be a positive number greater than 0.';
    }

    // Shift Timing
    if (!data.shiftTiming?.trim()) {
      newErrors.shiftTiming = companyShifts.length === 0
        ? 'No shifts found. Please configure shifts in Shift & Roster first.'
        : 'Please select a shift timing.';
    }

    // Address
    if (data.address?.trim() && data.address.trim().length < 3) {
      newErrors.address = 'Address should be at least 3 characters.';
    }

    // Working Address
    if (!data.workingAddress?.trim()) {
      newErrors.workingAddress = 'Working address is required.';
    } else if (data.workingAddress.trim().length < 3) {
      newErrors.workingAddress = 'Working address should be at least 3 characters.';
    }

    return newErrors;
  };

  const getInputClass = (fieldName: string, basePadding = 'pl-10 pr-3.5') => {
    const hasError = touched[fieldName] && errors[fieldName];
    return `w-full ${basePadding} py-2.5 text-xs font-semibold text-slate-900 rounded-xl transition-all shadow-2xs ${hasError
        ? 'bg-rose-50/40 border border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/15 focus:border-rose-500'
        : 'bg-[#f1f5f9] border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] hover:bg-slate-100 hover:border-slate-300'
      } placeholder:text-slate-400`;
  };

  const renderFieldError = (fieldName: string) => {
    if (touched[fieldName] && errors[fieldName]) {
      return (
        <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in duration-150">
          <IconAlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
          <span>{errors[fieldName]}</span>
        </p>
      );
    }
    return null;
  };

  const handleResetForm = () => {
    setErrors({});
    setTouched({});
    setForm({
      firstName: '',
      lastName: '',
      email: '',
      personalEmail: '',
      employeeNumber: '',
      dateOfBirth: '',
      username: '',
      phone: '',
      role: 'EMPLOYEE',
      jobTitle: '',
      departmentId: '',
      managerId: '',
      workMode: 'WFO',
      workType: 'PERMANENT',
      shiftTiming: '',
      address: '',
      workingAddress: '',
      joiningDate: new Date().toISOString().split('T')[0],
      monthlySalary: '',
      currency: 'INR',
      emergencyContactName: '',
      emergencyContactRelationship: '',
      emergencyContactPhone: '',
      canManagePerformance: false,
    });
    setUploadedFiles({
      offerLetter: { file: null, name: '', size: '' },
    });
  };

  // State for Document / File Attachments (Input Files)
  const [uploadedFiles, setUploadedFiles] = useState<{
    offerLetter: UploadedDoc;
  }>({
    offerLetter: { file: null, name: '', size: '' },
  });

  useEffect(() => {
    const loadPrerequisites = async () => {
      try {
        setLoadingShifts(true);
        const [deptsRes, empsRes, settingsRes, shiftsRes] = await Promise.all([
          api.get('/company/departments'),
          api.get('/employees?pageSize=100'),
          api.get('/company/settings'),
          api.get('/company/shifts').catch((err) => {
            console.error('Failed to load company shifts:', err);
            return { data: { shifts: [] } };
          }),
        ]);
        setDepartments(deptsRes.data?.departments || []);
        setManagers(empsRes.data?.items || []);
        const comp = settingsRes.data?.company;
        const rawDomains = comp?.allowedEmailDomains?.trim() || (comp?.subdomain ? `${comp.subdomain}.com` : '');
        const parsed = (comp?.domainsAllowed as string[]) || (rawDomains ? rawDomains.split(',').map((d: string) => d.trim().replace(/^@/, '').toLowerCase()).filter(Boolean) : []);
        setAllowedDomains(parsed);

        const loadedShifts: ShiftTiming[] = Array.isArray(shiftsRes.data?.shifts) ? shiftsRes.data.shifts : [];
        setCompanyShifts(loadedShifts);
        if (loadedShifts.length > 0) {
          setForm((prev) => ({
            ...prev,
            shiftTiming: prev.shiftTiming || formatShiftOption(loadedShifts[0]),
          }));
        } else {
          setForm((prev) => ({ ...prev, shiftTiming: '' }));
        }
      } catch (err) {
        console.error('Failed to load prerequisites:', err);
        setCompanyShifts([]);
      } finally {
        setLoadingShifts(false);
      }
    };
    loadPrerequisites();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    // Strict 10-digit numeric filter for phone & emergency contact
    if (name === 'phone' || name === 'emergencyContactPhone') {
      const numericVal = value.replace(/\D/g, '').slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: numericVal }));
      if (touched[name]) {
        validateField(name, numericVal);
      }
      return;
    }

    // Auto generate username from email prefix if empty
    if (name === 'email') {
      const prefix = !form.username ? value.split('@')[0] : form.username;
      setForm((prev) => ({ ...prev, email: value, username: prefix }));
      if (touched.email) validateField('email', value);
      if (touched.personalEmail && form.personalEmail) {
        validateField('personalEmail', form.personalEmail, { ...form, email: value });
      }
      return;
    }

    if (name === 'role') {
      const allowedRole = isCompanyAdmin
        ? (['HR', 'FINANCE', 'IT'].includes(value) ? value : 'EMPLOYEE')
        : 'EMPLOYEE';
      setForm((prev) => ({ ...prev, role: allowedRole }));
      if (touched.role) validateField('role', allowedRole);
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) {
      validateField(name, value);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, value);
  };

  const handleFileUpload = (key: 'offerLetter', file: File | null) => {
    if (!file) {
      setUploadedFiles((prev) => ({
        ...prev,
        [key]: { file: null, name: '', size: '', previewUrl: undefined },
      }));
      return;
    }

    const sizeStr = file.size > 1024 * 1024
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;

    setUploadedFiles((prev) => ({
      ...prev,
      [key]: { file, name: file.name, size: sizeStr },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    const validationErrors = validateAll(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Mark all error fields as touched so their red borders & messages show
      const touchedMap: Record<string, boolean> = {};
      Object.keys(validationErrors).forEach((k) => (touchedMap[k] = true));
      setTouched((prev) => ({ ...prev, ...touchedMap }));

      // Focus and scroll to first invalid field
      const firstErrorField = Object.keys(validationErrors)[0];
      const targetElement = document.querySelector(`[name="${firstErrorField}"]`) as HTMLElement;
      if (targetElement) {
        targetElement.focus();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setToast({
        title: 'Employee Creation Failed',
        message: 'Please resolve all highlighted validation errors below before creating the employee.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedShiftTiming = form.shiftTiming.trim();
      const matchedShift = companyShifts.find(
        (s) =>
          formatShiftOption(s) === selectedShiftTiming ||
          s.name.trim().toLowerCase() === selectedShiftTiming.split('(')[0].trim().toLowerCase() ||
          selectedShiftTiming.toLowerCase().includes((s.name || '').trim().toLowerCase())
      );

      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        personalEmail: form.personalEmail.trim(),
        employeeNumber: form.employeeNumber.trim(),
        dateOfBirth: form.dateOfBirth ? form.dateOfBirth : undefined,
        username: form.username.trim(),
        phone: form.phone.trim(),
        role: isCompanyAdmin ? (['HR', 'FINANCE', 'IT'].includes(form.role) ? form.role : 'EMPLOYEE') : 'EMPLOYEE',
        jobTitle: form.jobTitle.trim(),
        workMode: form.workMode,
        employmentType: form.workType, // 'PERMANENT' or 'CONTRACT'
        shiftTiming: selectedShiftTiming,
        shiftId: matchedShift?.id || null,
        address: form.address.trim(),
        workingAddress: form.workingAddress.trim(),
        joiningDate: form.joiningDate,
        monthlySalary: Number(form.monthlySalary) || 0,
        currency: form.currency,
        emergencyContact: {
          name: form.emergencyContactName.trim(),
          relationship: form.emergencyContactRelationship.trim(),
          phone: form.emergencyContactPhone.trim(),
        },
        canManagePerformance: form.canManagePerformance,
      };

      if (form.departmentId) payload.departmentId = Number(form.departmentId);
      if (form.managerId) payload.managerId = Number(form.managerId);

      const createRes = await api.post('/employees', payload);
      const createdEmployeeId = createRes.data?.employee?.id;

      // If an offer letter or employment contract file was attached, save it to the employee's documents repository
      if (createdEmployeeId && uploadedFiles.offerLetter.file) {
        try {
          const docFormData = new FormData();
          docFormData.append('file', uploadedFiles.offerLetter.file);
          docFormData.append('category', 'ONBOARDING');
          docFormData.append('title', 'Offer Letter / Employment Agreement');
          docFormData.append('userId', String(createdEmployeeId));
          await api.post('/documents', docFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        } catch (docErr) {
          console.error('Failed to attach offer letter document:', docErr);
        }
      }

      const employeeName = `${form.firstName} ${form.lastName}`.trim() || 'Employee';
      const employeeEmail = form.email.trim();

      // Reset form so the administrator can add another employee if needed
      handleResetForm();

      // Scroll smoothly to top
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Display floating success toaster
      setToast({
        title: 'Employee Created Successfully',
        message: `Employee account for ${employeeName} has been created and login credentials have been sent to their email (${employeeEmail}).`,
        type: 'success',
        action: {
          label: 'View in Activity Logs',
          onClick: () => navigate('/company/activity-logs'),
        },
      });
    } catch (err: any) {
      console.error('Failed to onboard employee:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to create employee profile.';
      setToast({
        title: 'Employee Creation Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative">
      {/* ===================== FLOATING TOASTER NOTIFICATION ===================== */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-3rem)] pointer-events-auto animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`p-4 rounded-2xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all ${toast.type === 'error'
                ? 'bg-rose-50/95 border-rose-200 text-rose-950 shadow-rose-900/10'
                : toast.type === 'success'
                  ? 'bg-emerald-50/95 border-emerald-200 text-emerald-950 shadow-emerald-900/10'
                  : 'bg-amber-50/95 border-amber-200 text-amber-950 shadow-amber-900/10'
              }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toast.type === 'error'
                  ? 'bg-rose-100 text-rose-600'
                  : toast.type === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-100 text-amber-600'
                }`}
            >
              {toast.type === 'error' ? (
                <IconAlertCircle className="w-5 h-5 stroke-[2.2]" />
              ) : toast.type === 'success' ? (
                <IconCheck className="w-5 h-5 stroke-[2.2]" />
              ) : (
                <IconAlertCircle className="w-5 h-5 stroke-[2.2]" />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <p className="font-bold text-xs leading-snug">{toast.title}</p>
              <p className="mt-0.5 text-[11px] font-medium leading-relaxed opacity-90">{toast.message}</p>
              {toast.action && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={toast.action.onClick}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs transition-colors cursor-pointer"
                  >
                    <span>{toast.action.label}</span>
                    <IconArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 -mr-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-black/5 transition-colors cursor-pointer shrink-0"
              title="Dismiss"
            >
              <IconX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===================== TOP HEADER BAR ===================== */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconUserPlus className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Create Employee
            </h1>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create or bulk import employee accounts using Excel.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-nowrap">
          {/* Download Sample Excel */}
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={isDownloadingTemplate}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200/80 shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
            title="Download Sample Excel Format (.xlsx)"
          >
            <IconFileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{isDownloadingTemplate ? 'Downloading...' : 'Download Sample'}</span>
            <IconDownload className="w-3.5 h-3.5 text-emerald-700" />
          </button>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setOnboardingMode('single')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${onboardingMode === 'single'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <IconUser className="w-3.5 h-3.5" />
              <span>Single Form</span>
            </button>
            <button
              type="button"
              onClick={() => setOnboardingMode('bulk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${onboardingMode === 'bulk'
                ? 'bg-white text-[#5E4BE2] shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              <IconFileSpreadsheet className="w-3.5 h-3.5" />
              <span>Bulk Upload</span>
            </button>
          </div>
        </div>
      </div>

      {onboardingMode === 'bulk' ? (
        <BulkEmployeeImport
          onDownloadTemplate={handleDownloadTemplate}
          isDownloadingTemplate={isDownloadingTemplate}
        />
      ) : (
        <>
          {/* ===================== FORM ===================== */}
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Section 1: Identity & Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0">
                    <IconUser className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900">
                    Identity & Contact
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">First Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E4BE2]">
                        <IconUser className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="firstName"
                        required
                        value={form.firstName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Jane"
                        className={getInputClass('firstName')}
                      />
                    </div>
                    {renderFieldError('firstName')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Last Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#5E4BE2]">
                        <IconUser className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="lastName"
                        value={form.lastName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Doe"
                        className={getInputClass('lastName')}
                      />
                    </div>
                    {renderFieldError('lastName')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Employee ID *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                        <IconId className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="employeeNumber"
                        required
                        value={form.employeeNumber}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="EMP-001"
                        className={getInputClass('employeeNumber')}
                      />
                    </div>
                    {renderFieldError('employeeNumber')}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Date of Birth *</label>
                      <span className="text-[10px] text-slate-400 font-medium">Min 18 years</span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconCalendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        name="dateOfBirth"
                        required
                        max={maxDobDate}
                        value={form.dateOfBirth}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClass('dateOfBirth')}
                      />
                    </div>
                    {renderFieldError('dateOfBirth')}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                      <label className="block text-xs font-bold text-slate-700">Work Email *</label>
                      {allowedDomains.length > 0 && (
                        <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block animate-pulse" />
                          <span>Authorized Domain: {allowedDomains.map(d => `@${d}`).join(', ')}</span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-600">
                        <IconMail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        required
                        value={form.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder={allowedDomains.length > 0 ? `jane.doe@${allowedDomains[0]}` : "jane.doe@kyadari.com"}
                        className={getInputClass('email')}
                      />
                    </div>
                    {renderFieldError('email')}
                    {!errors.email && form.email && allowedDomains.length > 0 && allowedDomains.includes(form.email.split('@')[1]?.toLowerCase().trim() || '') && (
                      <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1 animate-in fade-in duration-150">
                        <IconCheck className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                        <span>Corporate domain verified (@{form.email.split('@')[1]?.toLowerCase().trim()})</span>
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Personal Email Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-violet-600">
                        <IconMail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="personalEmail"
                        required
                        value={form.personalEmail}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="jane.personal@gmail.com"
                        className={getInputClass('personalEmail')}
                      />
                    </div>
                    {renderFieldError('personalEmail')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">System Username *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-600">
                        <IconAt className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="username"
                        required
                        value={form.username}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="jane.doe"
                        className={getInputClass('username')}
                      />
                    </div>
                    {renderFieldError('username')}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Phone Number *</label>
                      <span className={`text-[10px] font-mono font-bold ${form.phone.length === 10 ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                        {form.phone.length}/10 digits
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-600">
                        <IconPhone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        name="phone"
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={form.phone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleNumericKeyDown}
                        placeholder="9876543210"
                        className={getInputClass('phone')}
                      />
                    </div>
                    {renderFieldError('phone')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Joining Date *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                        <IconCalendar className="w-4 h-4" />
                      </div>
                      <input
                        type="date"
                        name="joiningDate"
                        required
                        value={form.joiningDate}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={getInputClass('joiningDate')}
                      />
                    </div>
                    {renderFieldError('joiningDate')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Residential / Permanent Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconMapPin className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="House / Flat No., Street, Area, City, State, PIN Code"
                        className={getInputClass('address')}
                      />
                    </div>
                    {renderFieldError('address')}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Working Address *</label>
                      {form.address && (
                        <button
                          type="button"
                          onClick={() => {
                            setForm((prev) => ({ ...prev, workingAddress: prev.address }));
                            validateField('workingAddress', form.address);
                          }}
                          className="text-[10px] text-[#5E4BE2] hover:text-[#4B39C3] font-bold hover:underline cursor-pointer"
                        >
                          Same as Residential
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-600">
                        <IconBuildingSkyscraper className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="workingAddress"
                        required
                        value={form.workingAddress}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Office or branch location address"
                        className={getInputClass('workingAddress')}
                      />
                    </div>
                    {renderFieldError('workingAddress')}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Shift Timing *</label>
                      <Link
                        to="/company/shift-roster"
                        target="_blank"
                        className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                        title="Add or configure shifts in Shift & Roster"
                      >
                        <span>Manage in Shift & Roster</span>
                        <IconExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-600">
                        <IconClock className="w-4 h-4" />
                      </div>
                      <select
                        name="shiftTiming"
                        value={form.shiftTiming}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={companyShifts.length === 0}
                        className={`${getInputClass('shiftTiming')} ${companyShifts.length === 0 ? 'bg-slate-100 cursor-not-allowed text-slate-400' : ''}`}
                      >
                        <option value="">
                          {loadingShifts
                            ? '-- Loading shifts from database... --'
                            : companyShifts.length === 0
                              ? '-- No Shifts Configured in Shift & Roster --'
                              : '-- Select Shift Timing --'}
                        </option>
                        {companyShifts.map((s) => {
                          const opt = formatShiftOption(s);
                          return (
                            <option key={s.id} value={opt}>
                              {opt} {s.code ? `[${s.code}]` : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    {renderFieldError('shiftTiming')}
                    {companyShifts.length === 0 && !loadingShifts ? (
                      <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                        <IconAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">No shifts configured yet</p>
                          <p className="text-[11px] text-amber-700 mt-0.5">
                            Please configure your shifts (e.g. General Shift, Morning, Evening, Night, Weekly Off) under{' '}
                            <Link to="/company/shift-roster" className="underline font-bold text-amber-900">
                              Company &gt; Shift &amp; Roster
                            </Link>{' '}
                            before onboarding employees.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">
                        Loaded {companyShifts.length} shift(s) directly from database.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 2: Role & Reporting Structure */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <IconBuildingSkyscraper className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900">
                    Role & Reporting
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Role *</label>
                    <select
                      name="role"
                      value={isHr ? 'EMPLOYEE' : (form.role === 'COMPANY_ADMIN' ? 'EMPLOYEE' : form.role)}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="EMPLOYEE">Staff Employee</option>
                      {isCompanyAdmin && (
                        <>
                          <option value="HR">HR</option>
                          <option value="FINANCE">Finance</option>
                          <option value="IT">IT</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Job Title</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-purple-600">
                        <IconBriefcase className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="jobTitle"
                        value={form.jobTitle}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="Senior Full Stack Engineer"
                        className={getInputClass('jobTitle')}
                      />
                    </div>
                    {renderFieldError('jobTitle')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Department</label>
                    <select
                      name="departmentId"
                      value={form.departmentId}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="">Unassigned</option>
                      {departments.filter((d: any) => d.isActive !== false).map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Reporting Manager</label>
                    <select
                      name="managerId"
                      value={form.managerId}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="">Direct to CEO / None</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName} ({m.jobTitle || 'Team'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Mode</label>
                    <select
                      name="workMode"
                      value={form.workMode}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="WFO">Office (WFO)</option>
                      <option value="WFH">Home (WFH)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Type *</label>
                    <select
                      name="workType"
                      required
                      value={form.workType}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs font-semibold text-slate-900 bg-[#f1f5f9] border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] shadow-2xs hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <option value="PERMANENT">Permanent</option>
                      <option value="CONTRACT">Contract</option>
                    </select>
                  </div>
                </div>


              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 3: Emergency Contact */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                    <IconHeartHandshake className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-slate-900">
                      Emergency Contact
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Contact details of the person to reach out to in case of an emergency
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconUser className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="emergencyContactName"
                        required
                        value={form.emergencyContactName}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Sarah Vance"
                        className={getInputClass('emergencyContactName')}
                      />
                    </div>
                    {renderFieldError('emergencyContactName')}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Relationship *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconHeartHandshake className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="emergencyContactRelationship"
                        required
                        value={form.emergencyContactRelationship}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Spouse / Parent / Sibling"
                        className={getInputClass('emergencyContactRelationship')}
                      />
                    </div>
                    {renderFieldError('emergencyContactRelationship')}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700">Contact *</label>
                      <span className={`text-[10px] font-mono font-bold ${form.emergencyContactPhone.length === 10 ? 'text-emerald-600' : 'text-slate-400'
                        }`}>
                        {form.emergencyContactPhone.length}/10 digits
                      </span>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-rose-500">
                        <IconPhone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        name="emergencyContactPhone"
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        value={form.emergencyContactPhone}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        onKeyDown={handleNumericKeyDown}
                        placeholder="9876543210"
                        className={getInputClass('emergencyContactPhone')}
                      />
                    </div>
                    {renderFieldError('emergencyContactPhone')}
                  </div>
                </div>
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 4: Salary Master Configuration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5 pb-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <IconCash className="w-4 h-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-900">
                    Salary Master Configuration
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Cost to Company (CTC) *</label>
                    <div className="relative flex rounded-xl shadow-2xs">
                      {/* Compact Currency Dropdown directly before amount */}
                      <select
                        name="currency"
                        value={form.currency}
                        onChange={handleChange}
                        aria-label="Currency"
                        className="w-24 sm:w-28 shrink-0 px-2.5 py-2.5 text-xs font-bold text-slate-800 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] hover:bg-slate-200/70 hover:border-slate-300 transition-all cursor-pointer z-0 focus:z-10"
                      >
                        <option value="INR">INR (₹)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                      </select>
                      {/* Amount Input */}
                      <input
                        type="number"
                        name="monthlySalary"
                        min="1"
                        required
                        value={form.monthlySalary}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="60000"
                        className={`flex-1 min-w-0 !rounded-l-none pl-3.5 pr-4 py-2.5 text-xs font-semibold text-slate-900 rounded-r-xl transition-all z-0 focus:z-10 ${touched.monthlySalary && errors.monthlySalary
                            ? 'bg-rose-50/40 border border-rose-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-500/15 focus:border-rose-500'
                            : 'bg-[#f1f5f9] border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#5E4BE2]/15 focus:border-[#5E4BE2] hover:bg-slate-100 hover:border-slate-300'
                          } placeholder:text-slate-400`}
                      />
                    </div>
                    {renderFieldError('monthlySalary')}
                  </div>
                </div>
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Section 4: Employee Documents & File Attachments */}
              {/* Section 4: Signed Offer Letter / Agreement */}
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                      <IconPaperclip className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-xs font-bold text-slate-900">
                        Offer Letter / Agreement
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Upload signed appointment letter or employment agreement contract
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/60">
                    Optional
                  </span>
                </div>

                <div>
                  {/* Signed Offer Letter / Agreement */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <IconFileCheck className="w-4 h-4 text-emerald-600" />
                        <span>Offer Letter / Contract</span>
                      </label>
                      {uploadedFiles.offerLetter.file && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                          <IconCheck className="w-3 h-3" /> Attached
                        </span>
                      )}
                    </div>

                    {uploadedFiles.offerLetter.file ? (
                      <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-xl shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <IconFileCheck className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{uploadedFiles.offerLetter.name}</p>
                            <p className="text-[10px] text-slate-400">{uploadedFiles.offerLetter.size}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleFileUpload('offerLetter', null)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove file"
                        >
                          <IconX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white rounded-xl cursor-pointer group transition-all">
                        <IconUpload className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-colors mb-1" />
                        <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                          Click to upload Offer Letter
                        </span>
                        <span className="text-[10px] text-slate-400 mt-0.5">PDF or DOCX (max 10MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => handleFileUpload('offerLetter', e.target.files?.[0] || null)}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Informational Notice */}
              <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-500 font-medium leading-relaxed">
                Upon creating the employee profile, login credentials will be emailed directly to the employee. Any attached offer letter or employment contract will be safely stored and accessible to the employee under their workspace documents.
              </div>

              {/* Line Separation */}
              <hr className="border-slate-200/80" />

              {/* Action Buttons Row */}
              <div className="flex items-center justify-end gap-3 pt-1">
                <Link
                  to="/company/employees"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer shadow-2xs"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#5E4BE2] to-[#4B39C3] hover:from-[#5340D4] hover:to-[#4130B4] text-white text-xs font-bold rounded-xl shadow-sm shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    'Creating Employee...'
                  ) : (
                    <>
                      <IconCheck className="w-4 h-4" />
                      <span>Create Employee</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default NewEmployeePage;
