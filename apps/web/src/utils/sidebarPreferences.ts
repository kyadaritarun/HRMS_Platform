import api from '../api/client';

export interface SidebarOpsVisibility {
  company_operations: boolean;
  hr_operations: boolean;
  reports_operations: boolean;
  it_operations: boolean;
  finance_operations: boolean;
}

export const DEFAULT_SIDEBAR_OPS_VISIBILITY: SidebarOpsVisibility = {
  company_operations: true,
  hr_operations: true,
  reports_operations: true,
  it_operations: true,
  finance_operations: true,
};

export const SIDEBAR_OPS_EVENT = 'sidebar-prefs-updated';

/**
 * Reads sidebar visibility preferences.
 * Precedence:
 * 1. Explicit company database settings (if provided)
 * 2. Cached preference in localStorage
 * 3. Default fallback (all true)
 */
export const getSidebarOpsVisibility = (
  userId?: string | number,
  companySettings?: any
): SidebarOpsVisibility => {
  // If company settings are provided directly from backend database
  if (companySettings?.sidebarOperations) {
    const dbOps = companySettings.sidebarOperations;
    return {
      company_operations: dbOps.company_operations !== false,
      hr_operations: dbOps.hr_operations !== false,
      reports_operations: dbOps.reports_operations !== false,
      it_operations: dbOps.it_operations !== false,
      finance_operations: dbOps.finance_operations !== false,
    };
  }

  try {
    const key = userId ? `sidebar_ops_prefs_${userId}` : 'sidebar_ops_prefs';
    const raw = localStorage.getItem(key) || localStorage.getItem('sidebar_ops_prefs');
    if (!raw) return DEFAULT_SIDEBAR_OPS_VISIBILITY;
    const parsed = JSON.parse(raw);
    return {
      company_operations: parsed.company_operations !== false,
      hr_operations: parsed.hr_operations !== false,
      reports_operations: parsed.reports_operations !== false,
      it_operations: parsed.it_operations !== false,
      finance_operations: parsed.finance_operations !== false,
    };
  } catch {
    return DEFAULT_SIDEBAR_OPS_VISIBILITY;
  }
};

/**
 * Fetches latest sidebar operations visibility directly from the PostgreSQL database.
 */
export const fetchSidebarOpsFromDb = async (userId?: string | number): Promise<SidebarOpsVisibility> => {
  try {
    const res = await api.get('/company/sidebar-operations');
    if (res.data?.sidebarOperations) {
      const dbOps: SidebarOpsVisibility = {
        company_operations: res.data.sidebarOperations.company_operations !== false,
        hr_operations: res.data.sidebarOperations.hr_operations !== false,
        reports_operations: res.data.sidebarOperations.reports_operations !== false,
        it_operations: res.data.sidebarOperations.it_operations !== false,
        finance_operations: res.data.sidebarOperations.finance_operations !== false,
      };
      // Cache in localStorage for immediate offline / reload availability
      const key = userId ? `sidebar_ops_prefs_${userId}` : 'sidebar_ops_prefs';
      localStorage.setItem(key, JSON.stringify(dbOps));
      localStorage.setItem('sidebar_ops_prefs', JSON.stringify(dbOps));
      window.dispatchEvent(new CustomEvent(SIDEBAR_OPS_EVENT, { detail: dbOps }));
      return dbOps;
    }
  } catch (err) {
    // If user is not company admin or request fails, gracefully fallback
    console.warn('Could not fetch sidebar operations from database, using cached/default settings.', err);
  }
  return getSidebarOpsVisibility(userId);
};

/**
 * Saves sidebar operations visibility directly to the PostgreSQL database
 * and updates localStorage cache and reactive event listeners.
 */
export const saveSidebarOpsToDb = async (
  prefs: SidebarOpsVisibility,
  userId?: string | number
): Promise<{ success: boolean; message?: string }> => {
  // Update client cache & trigger immediate UI update
  try {
    const key = userId ? `sidebar_ops_prefs_${userId}` : 'sidebar_ops_prefs';
    const serialized = JSON.stringify(prefs);
    localStorage.setItem(key, serialized);
    localStorage.setItem('sidebar_ops_prefs', serialized);
    window.dispatchEvent(new CustomEvent(SIDEBAR_OPS_EVENT, { detail: prefs }));
  } catch (err) {
    console.error('Failed to cache sidebar prefs', err);
  }

  // Persist to PostgreSQL database via API
  try {
    const res = await api.put('/company/sidebar-operations', prefs);
    return { success: true, message: res.data?.message };
  } catch (err: any) {
    console.error('Failed to persist sidebar preferences to database', err);
    return {
      success: false,
      message: err?.response?.data?.message || 'Preferences saved locally, but database sync failed.',
    };
  }
};

/**
 * Backward compatible setter
 */
export const setSidebarOpsVisibility = (prefs: SidebarOpsVisibility, userId?: string | number) => {
  saveSidebarOpsToDb(prefs, userId);
};
