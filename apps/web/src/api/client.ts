import axios from 'axios';

const getApiBaseUrl = (): string => {
  // 1. Check build-time or environment variable VITE_API_URL
  const envApiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (envApiUrl) {
    return envApiUrl.replace(/\/+$/, '');
  }

  // 2. Runtime global variable if injected via window.__API_URL__
  if (typeof window !== 'undefined' && (window as any).__API_URL__) {
    return String((window as any).__API_URL__).trim().replace(/\/+$/, '');
  }

  // 3. Fallback to relative path (empty string) so requests go to /api/v1 on current origin / reverse proxy
  return '';
};

const rawApiUrl = getApiBaseUrl();
const normalizedApiUrl = rawApiUrl.replace(/\/+$/, '');
export const API_BASE_URL = normalizedApiUrl ? `${normalizedApiUrl}/api/v1` : '/api/v1';

export const getFileUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;

  // If local development URL points to localhost:5000 in production, replace with normalizedApiUrl
  if (normalizedApiUrl && path.includes('localhost:5000')) {
    path = path.replace(/https?:\/\/localhost:5000/, normalizedApiUrl);
  }

  // AWS S3 uploads: stream via backend proxy endpoint to avoid CORS / X-Frame-Options issues
  if (path.includes('amazonaws.com')) {
    if (path.includes('/uploads/')) {
      const filename = path.split('/uploads/').pop();
      return normalizedApiUrl ? `${normalizedApiUrl}/uploads/${filename}` : `/uploads/${filename}`;
    }
    if (path.includes('/image/')) {
      const filename = path.split('/image/').pop();
      return normalizedApiUrl ? `${normalizedApiUrl}/image/${filename}` : `/image/${filename}`;
    }
    const filename = path.split('/').pop();
    return normalizedApiUrl ? `${normalizedApiUrl}/uploads/${filename}` : `/uploads/${filename}`;
  }

  // If already an absolute http/https URL pointing to an external source or already pointing to normalizedApiUrl
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Ensure relative path starts with '/'
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If it's a bare filename like "123-file.pdf", route it to "/uploads/123-file.pdf"
  if (!cleanPath.startsWith('/uploads/') && !cleanPath.startsWith('/image/') && !cleanPath.startsWith('/images/')) {
    cleanPath = `/uploads${cleanPath}`;
  }

  return normalizedApiUrl ? `${normalizedApiUrl}${cleanPath}` : cleanPath;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const companySubdomain = localStorage.getItem('companySubdomain');
  if (companySubdomain) {
    config.headers['x-company-subdomain'] = companySubdomain;
  }
  const companyId = localStorage.getItem('companyId');
  if (companyId) {
    config.headers['x-company-id'] = companyId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle force password change redirect
    if (error.response?.status === 403 && error.response?.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      if (window.location.pathname !== '/change-password') {
        window.location.href = '/change-password';
      }
    }

    // Refresh token attempt on 401
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
        if (res.data?.accessToken) {
          localStorage.setItem('token', res.data.accessToken);
          if (res.data.refreshToken) {
            localStorage.setItem('refreshToken', res.data.refreshToken);
          }
          originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
