import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResumeViewerModal, dataUrlToBlob } from '../components/referrals/ResumeViewerModal';

describe('ResumeViewerModal & dataUrlToBlob tests', () => {
  beforeEach(() => {
    // JSDOM does not provide createObjectURL by default
    window.URL.createObjectURL = vi.fn(() => 'blob:http://localhost:5173/mock-uuid');
    window.URL.revokeObjectURL = vi.fn();
  });

  it('correctly converts base64 data URLs to Blobs', () => {
    // Standard small base64 string
    const sampleDataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEK';
    const { blob, mime } = dataUrlToBlob(sampleDataUrl);
    expect(mime).toBe('application/pdf');
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
  });

  it('detects PDF magic header even if mime is octet-stream', () => {
    const octetStreamPdf = 'data:application/octet-stream;base64,JVBERi0xLjQKJdPr6eEK';
    const { blob, mime } = dataUrlToBlob(octetStreamPdf);
    expect(mime).toBe('application/pdf');
    expect(blob.type).toBe('application/pdf');
  });

  it('renders ResumeViewerModal when open with candidate details and controls', () => {
    const mockOnClose = vi.fn();
    const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQKJdPr6eEK';

    render(
      <ResumeViewerModal
        isOpen={true}
        onClose={mockOnClose}
        resumeUrl={pdfDataUrl}
        candidateName="John Doe"
        jobRole="Frontend Engineer"
      />
    );

    expect(screen.getByText("John Doe's Resume")).toBeInTheDocument();
    expect(screen.getByText('Frontend Engineer • Candidate Profile Resume Viewer')).toBeInTheDocument();
    expect(screen.getByText('Open in Tab')).toBeInTheDocument();
    expect(screen.getByText('Download')).toBeInTheDocument();

    // Close button works
    const closeBtn = screen.getByLabelText('Close resume viewer');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders docx warning with download button for Word documents', () => {
    const mockOnClose = vi.fn();
    const docDataUrl = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQACAgI';

    render(
      <ResumeViewerModal
        isOpen={true}
        onClose={mockOnClose}
        resumeUrl={docDataUrl}
        candidateName="Sarah Connor"
        jobRole="DevOps Lead"
      />
    );

    expect(screen.getByText("Sarah Connor's Resume (Word Document)")).toBeInTheDocument();
    expect(screen.getByText(/Word documents \(\.docx \/ \.doc\) cannot be previewed directly/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Sarah_Connor_Resume\.docx/i })).toBeInTheDocument();
  });
});
