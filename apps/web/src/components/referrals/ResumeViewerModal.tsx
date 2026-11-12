import React, { useEffect, useState, useMemo } from 'react';
import {
  IconFileText,
  IconDownload,
  IconExternalLink,
  IconX,
  IconAlertCircle,
  IconFileTypePdf,
  IconEye,
} from '@tabler/icons-react';
import { getFileUrl } from '../../api/client';

export interface ResumeViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeUrl: string | null;
  candidateName?: string;
  jobRole?: string;
}

/**
 * Converts a base64 Data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string, fallbackMime = 'application/pdf'): { blob: Blob; mime: string } {
  try {
    const commaIndex = dataUrl.indexOf(',');
    if (commaIndex === -1) {
      // Possible bare base64
      const byteCharacters = atob(dataUrl);
      const byteNumbers = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const mime = dataUrl.startsWith('JVBERi0') ? 'application/pdf' : fallbackMime;
      return { blob: new Blob([byteNumbers], { type: mime }), mime };
    }

    const header = dataUrl.substring(0, commaIndex);
    const base64Data = dataUrl.substring(commaIndex + 1);

    let mime = fallbackMime;
    const mimeMatch = header.match(/:(.*?);/);
    if (mimeMatch && mimeMatch[1]) {
      mime = mimeMatch[1].toLowerCase();
    }

    // PDF magic bytes JVBERi0 = %PDF-
    if ((!mime || mime === 'application/octet-stream') && base64Data.startsWith('JVBERi0')) {
      mime = 'application/pdf';
    }

    const byteCharacters = atob(base64Data);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mime });
    return { blob, mime };
  } catch (err) {
    console.error('Failed to convert data URL to Blob:', err);
    return { blob: new Blob([], { type: fallbackMime }), mime: fallbackMime };
  }
}

const createSafeObjectURL = (blob: Blob): string | null => {
  try {
    if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
      return window.URL.createObjectURL(blob);
    }
  } catch (e) {
    console.warn('URL.createObjectURL not available:', e);
  }
  return null;
};

const revokeSafeObjectURL = (url: string | null) => {
  try {
    if (url && typeof window !== 'undefined' && window.URL && typeof window.URL.revokeObjectURL === 'function') {
      window.URL.revokeObjectURL(url);
    }
  } catch (e) {
    // Ignore error
  }
};

export const ResumeViewerModal: React.FC<ResumeViewerModalProps> = ({
  isOpen,
  onClose,
  resumeUrl,
  candidateName = 'Candidate',
  jobRole,
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('application/pdf');
  const [isDataUrl, setIsDataUrl] = useState<boolean>(false);
  const [isInvalidUrl, setIsInvalidUrl] = useState<boolean>(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Process resume URL into a Blob URL if base64 data URI
  useEffect(() => {
    if (!isOpen || !resumeUrl) {
      setBlobUrl(null);
      setIsInvalidUrl(false);
      return;
    }

    const trimmed = resumeUrl.trim();
    if (!trimmed) {
      setIsInvalidUrl(true);
      return;
    }

    if (trimmed.startsWith('data:')) {
      setIsDataUrl(true);
      setIsInvalidUrl(false);
      const { blob, mime } = dataUrlToBlob(trimmed);
      setMimeType(mime);
      const url = createSafeObjectURL(blob) || trimmed;
      setBlobUrl(url);

      return () => {
        revokeSafeObjectURL(url);
      };
    } else if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('/') ||
      trimmed.startsWith('blob:')
    ) {
      setIsDataUrl(false);
      setIsInvalidUrl(false);
      const fullUrl = getFileUrl(trimmed);
      setBlobUrl(fullUrl);
      const lower = trimmed.toLowerCase();
      if (lower.endsWith('.pdf')) {
        setMimeType('application/pdf');
      } else if (lower.match(/\.(png|jpg|jpeg|webp|gif)$/)) {
        setMimeType('image/png');
      } else if (lower.endsWith('.docx') || lower.endsWith('.doc')) {
        setMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      } else {
        setMimeType('application/pdf');
      }
    } else {
      // Might be a raw base64 string or just a plain filename like "resume.pdf"
      if (trimmed.startsWith('JVBERi0')) {
        setIsDataUrl(true);
        setIsInvalidUrl(false);
        const { blob, mime } = dataUrlToBlob(trimmed, 'application/pdf');
        setMimeType(mime);
        const url = createSafeObjectURL(blob) || trimmed;
        setBlobUrl(url);
        return () => {
          revokeSafeObjectURL(url);
        };
      } else {
        // Plain filename without file content
        setIsInvalidUrl(true);
        setBlobUrl(null);
      }
    }
  }, [isOpen, resumeUrl]);

  const isPdf = useMemo(() => {
    return (
      mimeType.includes('pdf') ||
      (resumeUrl && (resumeUrl.toLowerCase().endsWith('.pdf') || resumeUrl.includes('JVBERi0')))
    );
  }, [mimeType, resumeUrl]);

  const isImage = useMemo(() => {
    return (
      mimeType.startsWith('image/') ||
      (resumeUrl && Boolean(resumeUrl.match(/\.(png|jpg|jpeg|webp|gif)$/i)))
    );
  }, [mimeType, resumeUrl]);

  const isWordDoc = useMemo(() => {
    return (
      mimeType.includes('word') ||
      mimeType.includes('officedocument') ||
      (resumeUrl && Boolean(resumeUrl.match(/\.(docx?)$/i)))
    );
  }, [mimeType, resumeUrl]);

  const cleanName = useMemo(() => {
    return (
      (candidateName || 'Candidate')
        .trim()
        .replace(/[^a-zA-Z0-9_\-]/g, '_')
        .replace(/_+/g, '_') || 'Candidate'
    );
  }, [candidateName]);

  const extension = isPdf ? 'pdf' : isWordDoc ? 'docx' : isImage ? 'png' : 'pdf';
  const downloadFileName = `${cleanName}_Resume.${extension}`;

  const handleDownload = () => {
    if (!resumeUrl) return;

    let targetUrl = blobUrl || getFileUrl(resumeUrl);
    let revokeLater = false;

    if (resumeUrl.startsWith('data:') && !blobUrl) {
      const { blob } = dataUrlToBlob(resumeUrl);
      targetUrl = createSafeObjectURL(blob) || resumeUrl;
      revokeLater = targetUrl.startsWith('blob:');
    }

    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (revokeLater) {
      setTimeout(() => revokeSafeObjectURL(targetUrl), 10000);
    }
  };

  const handleOpenInNewTab = () => {
    if (!resumeUrl) return;

    if (resumeUrl.startsWith('data:') || (resumeUrl.startsWith('JVBERi0') && !resumeUrl.startsWith('http'))) {
      const { blob } = dataUrlToBlob(resumeUrl);
      const tabUrl = createSafeObjectURL(blob) || resumeUrl;
      const newWin = window.open(tabUrl, '_blank');
      if (newWin) newWin.focus();
      // Keep blob URL active for 60 seconds so the new browser tab can load it
      if (tabUrl.startsWith('blob:')) {
        setTimeout(() => revokeSafeObjectURL(tabUrl), 60000);
      }
    } else {
      const fullUrl = getFileUrl(resumeUrl);
      window.open(fullUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] overflow-hidden bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="resume-modal-title"
    >
      <div
        className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <IconFileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 id="resume-modal-title" className="text-base font-bold text-slate-900 tracking-tight truncate">
                  {candidateName}&apos;s Resume
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 uppercase tracking-wider shrink-0">
                  {isWordDoc ? 'Word Document' : isImage ? 'Image' : 'PDF Document'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                {jobRole ? `${jobRole} • ` : ''}Candidate Profile Resume Viewer
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {!isInvalidUrl && (
              <>
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-2xs transition-colors cursor-pointer"
                  title="Open resume in full browser tab"
                >
                  <IconExternalLink className="w-3.5 h-3.5 text-slate-500 font-medium" />
                  <span className="hidden sm:inline">Open in Tab</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                  title="Download resume file"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 ml-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Close resume viewer"
            >
              <IconX className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 w-full bg-slate-100 relative min-h-0 overflow-hidden flex flex-col items-center justify-center">
          {isInvalidUrl ? (
            <div className="p-8 text-center max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm mx-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <IconAlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">Resume File Not Available</h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                {resumeUrl
                  ? `The candidate resume has a filename reference ("${resumeUrl}") without embedded file content.`
                  : 'No resume file has been attached for this candidate.'}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Close Viewer
              </button>
            </div>
          ) : isWordDoc ? (
            <div className="p-8 text-center max-w-md bg-white rounded-2xl border border-slate-200 shadow-sm mx-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                <IconFileText className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-800 mb-1">
                {candidateName}&apos;s Resume (Word Document)
              </h4>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Word documents (.docx / .doc) cannot be previewed directly inside the web browser. You can download the file to view it in Microsoft Word or your preferred office application.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition-all cursor-pointer"
              >
                <IconDownload className="w-4 h-4" />
                <span>Download {downloadFileName}</span>
              </button>
            </div>
          ) : isImage ? (
            <div className="w-full h-full p-4 flex items-center justify-center overflow-auto bg-slate-900/5">
              <img
                src={blobUrl || (resumeUrl || '')}
                alt={`${candidateName} Resume`}
                className="max-h-full max-w-full object-contain rounded-lg shadow-md bg-white"
              />
            </div>
          ) : (
            <div className="w-full h-full relative bg-slate-100">
              {blobUrl ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-full border-0 bg-white"
                  title={`${candidateName} Resume PDF Preview`}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-slate-400">
                  Loading resume preview...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
