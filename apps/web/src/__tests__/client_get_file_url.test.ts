import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getFileUrl client utility tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('correctly prepends normalized API URL for relative upload paths', async () => {
    vi.stubEnv('VITE_API_URL', 'https://hrms-server.tarunkyadari.in');
    const { getFileUrl } = await import('../api/client');

    const result = getFileUrl('/uploads/sample-policy.pdf');
    expect(result).toBe('https://hrms-server.tarunkyadari.in/uploads/sample-policy.pdf');
  });

  it('converts bare filename into uploads path with API URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://hrms-server.tarunkyadari.in');
    const { getFileUrl } = await import('../api/client');

    const result = getFileUrl('sample-doc.pdf');
    expect(result).toBe('https://hrms-server.tarunkyadari.in/uploads/sample-doc.pdf');
  });

  it('routes S3 upload URLs through backend proxy with API URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://hrms-server.tarunkyadari.in');
    const { getFileUrl } = await import('../api/client');

    const s3Url = 'https://peopleplus-storage.s3.ap-south-1.amazonaws.com/uploads/1731917637123-test.pdf';
    const result = getFileUrl(s3Url);
    expect(result).toBe('https://hrms-server.tarunkyadari.in/uploads/1731917637123-test.pdf');
  });

  it('routes S3 image URLs through backend proxy image endpoint', async () => {
    vi.stubEnv('VITE_API_URL', 'https://hrms-server.tarunkyadari.in');
    const { getFileUrl } = await import('../api/client');

    const s3ImageUrl = 'https://peopleplus-storage.s3.ap-south-1.amazonaws.com/image/avatar-123.png';
    const result = getFileUrl(s3ImageUrl);
    expect(result).toBe('https://hrms-server.tarunkyadari.in/image/avatar-123.png');
  });

  it('replaces localhost:5000 with production API URL when deployed', async () => {
    vi.stubEnv('VITE_API_URL', 'https://hrms-server.tarunkyadari.in');
    const { getFileUrl } = await import('../api/client');

    const localUrl = 'http://localhost:5000/uploads/my-doc.pdf';
    const result = getFileUrl(localUrl);
    expect(result).toBe('https://hrms-server.tarunkyadari.in/uploads/my-doc.pdf');
  });

  it('preserves data: and blob: URLs untouched', async () => {
    vi.stubEnv('VITE_API_URL', 'https://hrms-server.tarunkyadari.in');
    const { getFileUrl } = await import('../api/client');

    expect(getFileUrl('data:application/pdf;base64,JVBERi0...')).toBe('data:application/pdf;base64,JVBERi0...');
    expect(getFileUrl('blob:http://localhost:3000/1234-uuid')).toBe('blob:http://localhost:3000/1234-uuid');
  });

  it('returns empty string for null or undefined path', async () => {
    const { getFileUrl } = await import('../api/client');
    expect(getFileUrl(null)).toBe('');
    expect(getFileUrl(undefined)).toBe('');
  });
});
