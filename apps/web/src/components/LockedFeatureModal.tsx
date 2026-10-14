import React from 'react';
import { IconCrown, IconX, IconSparkles, IconCheck } from '@tabler/icons-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export const LockedFeatureModal: React.FC<Props> = ({ isOpen, onClose, featureName = 'This Premium Feature' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-amber-200 overflow-hidden transform transition-all">
        {/* Top gradient banner */}
        <div className="h-28 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 flex items-center justify-center relative">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-2 border-white/40 shadow-inner">
            <IconCrown className="w-9 h-9 text-white animate-pulse" />
          </div>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 rounded-full p-1.5 transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal content */}
        <div className="p-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-semibold uppercase tracking-wider mb-2">
            <IconSparkles className="w-3.5 h-3.5" /> Premium Tier Feature
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">{featureName} is Locked</h3>
          <p className="text-sm text-slate-600 mb-6">
            This module is not included in your organization's current subscription plan. Upgrade your plan to unlock this advanced feature and supercharge your team's workflow.
          </p>

          <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200/60 mb-6 space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Enterprise-grade automation
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Real-time analytics & compliance audit
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <IconCheck className="w-4 h-4 text-emerald-600 shrink-0" /> Priority 24/7 dedicated support
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={() => {
                alert('Please contact your Company Administrator or Uptrix Super Admin to upgrade your package subscription.');
                onClose();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20 transition-all"
            >
              Request Upgrade
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
