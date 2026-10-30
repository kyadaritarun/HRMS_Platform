import React from 'react';
import { createPortal } from 'react-dom';
import {
  IconFileText,
  IconShieldCheck,
  IconX,
  IconCheck,
  IconLock,
  IconServer,
  IconScale,
  IconBuildingSkyscraper,
} from '@tabler/icons-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Terms & Conditions Modal
 */
export const TermsAndConditionsModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[#5E4BE2] shrink-0">
              <IconFileText className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Terms &amp; Conditions</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                  Version 2.4 • Oct 2026
                </span>
              </div>
              <p className="text-xs text-slate-500">Uptrix Enterprise HRMS Master Services &amp; Platform Agreement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-indigo-50/50 border border-indigo-100 text-slate-700 text-xs font-medium leading-relaxed">
            Please read these Terms &amp; Conditions carefully before accessing or using the Uptrix Human Resource Management Platform. By accessing or logging into this portal, you and your organization agree to be bound by these legal terms.
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-[#5E4BE2]">1.</span> Authorized Corporate Use
            </h4>
            <p>
              Access to this HRMS platform is granted strictly to authorized employees, contractors, and corporate personnel designated by the tenant enterprise. You agree to maintain confidential login credentials and notify corporate administrators immediately of any unauthorized access.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-[#5E4BE2]">2.</span> Employment Records &amp; Attendance Integrity
            </h4>
            <p>
              All check-in timestamps, geolocation coordinates (where enabled for remote check-ins), leave applications, reimbursement claims, and tax declarations submitted through this application constitute official company records. Providing fraudulent or falsified documentation may subject the user to disciplinary action per company policy.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-[#5E4BE2]">3.</span> Service Availability &amp; Platform Maintenance
            </h4>
            <p>
              Uptrix maintains a target operational service level agreement (SLA) of 99.9% uptime. Scheduled platform maintenance is communicated in advance. Critical payroll and attendance calculations are safeguarded with automated daily snapshots and redundant failover systems.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-[#5E4BE2]">4.</span> Intellectual Property &amp; Tenant Ownership
            </h4>
            <p>
              The Uptrix software, design systems, algorithms, and documentation are proprietary assets of Uptrix Technologies. All organizational data, employee files, salary breakdowns, and custom policies uploaded remain the exclusive property of the subscribing tenant enterprise.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-[#5E4BE2]">5.</span> Termination &amp; Deprovisioning
            </h4>
            <p>
              Upon employee separation, employee portal access is automatically revoked in compliance with the enterprise exit management workflow. Post-separation records are archived in accordance with statutory tax and labor retention requirements.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <IconScale className="w-4 h-4 text-slate-400" />
            <span>Governed under enterprise subscription terms.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>Close Agreement</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/**
 * Privacy Policy Modal
 */
export const PrivacyPolicyModal: React.FC<LegalModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <IconShieldCheck className="w-5 h-5 stroke-[1.8]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Privacy Policy</h3>
                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  DPDP &amp; GDPR Compliant
                </span>
              </div>
              <p className="text-xs text-slate-500">Employee data confidentiality, storage protocols, and security practices</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center shadow-2xs transition-colors cursor-pointer"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-600 leading-relaxed">
          <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-100 text-slate-700 text-xs font-medium leading-relaxed flex items-start gap-2.5">
            <IconLock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Your personal and corporate data privacy is paramount. Uptrix adheres to rigorous enterprise security standards, ensuring employee confidentiality, encrypted data transit, and zero unauthorized third-party disclosure.
            </span>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-emerald-600">1.</span> Information We Collect
            </h4>
            <p>
              We collect information necessary to administer employment, payroll, and benefits, including full legal name, contact email, phone number, government identity numbers (PAN, Aadhaar/SSN), bank account information for salary disbursement, and attendance time stamps.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-emerald-600">2.</span> Purpose &amp; Lawful Processing
            </h4>
            <p>
              Employee data is processed exclusively for HR administration, monthly payroll computation, tax compliance filings, benefits administration, performance evaluation, and workplace security auditing. We never sell or monetize employee or company information.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-emerald-600">3.</span> Encryption &amp; Security Standards
            </h4>
            <p>
              All sensitive employee data (salary contracts, banking details, government IDs) is encrypted at rest using industry-standard AES-256 encryption. Communications between your browser and our servers are encrypted via TLS 1.3 protocol.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-emerald-600">4.</span> Role-Based Access Controls
            </h4>
            <p>
              Only authorized personnel (your direct reporting manager, company HR, and Finance administrators) have role-scoped access to specific modules. Strict audit trails log every administrative access and profile update.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1.5">
              <span className="text-emerald-600">5.</span> Data Retention &amp; Rights
            </h4>
            <p>
              Employees have the right to inspect their personal records, request corrections to erroneous information, and receive copies of all tax forms and salary slips generated during their employment tenure.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <IconServer className="w-4 h-4 text-emerald-600" />
            <span>Encrypted &amp; securely isolated per tenant.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5E4BE2] hover:bg-[#4D3BC9] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>Close Privacy Policy</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
