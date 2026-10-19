import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

export type UserRole = 'PRODUCT_SUPER_ADMIN' | 'COMPANY_ADMIN' | 'HR' | 'EMPLOYEE';

export interface User {
  id: number;
  email: string;
  username: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  companyId: number | null;
  jobTitle?: string;
  mustChangePassword: boolean;
  hrPermissions?: string[] | null;
  canManagePerformance?: boolean;
  isManager?: boolean;
  profilePhoto?: string | null;
}

export interface Company {
  id: number;
  name: string;
  code: string;
  subdomain: string;
  logo?: string | null;
  workingDays?: string;
  timezone?: string;
}

interface AuthContextType {
  user: User | null;
  company: Company | null;
  features: string[];
  token: string | null;
  isLoading: boolean;
  login: (credentials: { login: string; password: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  hasHrPermission: (perm: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [features, setFeatures] = useState<string[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.user) {
        setUser(res.data.user);
        setFeatures(res.data.features || []);
        if (res.data.company) {
          setCompany(res.data.company);
          localStorage.setItem('companySubdomain', res.data.company.subdomain);
          localStorage.setItem('companyId', String(res.data.company.id));
        }
      }
    } catch {
      setUser(null);
      setCompany(null);
      setFeatures([]);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (credentials: { login: string; password: string }) => {
    const res = await api.post('/auth/login', credentials);
    const { user: loggedInUser, token: authToken, refreshToken, features: enabledFeatures, company: userCompany } = res.data;

    localStorage.setItem('token', authToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    if (userCompany) {
      localStorage.setItem('companySubdomain', userCompany.subdomain);
      localStorage.setItem('companyId', String(userCompany.id));
    }

    setToken(authToken);
    setUser(loggedInUser);
    setFeatures(enabledFeatures || []);
    setCompany(userCompany || null);

    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('companySubdomain');
    localStorage.removeItem('companyId');
    setToken(null);
    setUser(null);
    setCompany(null);
    setFeatures([]);
  };

  const hasFeature = (feature: string): boolean => {
    if (!feature) return true;
    if (user?.role === 'PRODUCT_SUPER_ADMIN') return true;
    if (features.includes(feature)) return true;

    const aliasMap: Record<string, string[]> = {
      ai_assistance: ['ai_assistant'],
      ai_assistant: ['ai_assistance'],
      employee_appreciation: ['appreciations'],
      appreciations: ['employee_appreciation'],
      performance_management: ['performance'],
      performance: ['performance_management'],
      claim_process_management: ['claims'],
      claims: ['claim_process_management'],
      leave_management: ['leaves'],
      leaves: ['leave_management'],
      time_attendance_management: ['attendance'],
      attendance: ['time_attendance_management'],
      payroll_management: ['payroll'],
      payroll: ['payroll_management'],
      holiday_calendar: ['holidays'],
      holidays: ['holiday_calendar'],
      employee_document_management: ['documents'],
      documents: ['employee_document_management'],
      policy_documents_management: ['policies'],
      policies: ['policy_documents_management'],
      support_ticket_management: ['tickets'],
      tickets: ['support_ticket_management'],
      comp_off_management: ['comp_off', 'compensation_off'],
      comp_off: ['comp_off_management', 'compensation_off'],
      employees_directory: ['directory', 'org_structure'],
      directory: ['employees_directory'],
      compliance_management: ['compliance'],
      compliance: ['compliance_management'],
      reports_analytics: ['reports'],
      reports: ['reports_analytics'],
    };

    const aliases = aliasMap[feature] || [];
    return aliases.some((a) => features.includes(a));
  };

  const hasHrPermission = (perm: string): boolean => {
    if (user?.role === 'PRODUCT_SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN') return true;
    if (user?.role === 'HR') {
      if (!user.hrPermissions || user.hrPermissions.length === 0) return true;
      return user.hrPermissions.includes(perm);
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        features,
        token,
        isLoading,
        login,
        logout,
        refreshUser,
        hasFeature,
        hasHrPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
