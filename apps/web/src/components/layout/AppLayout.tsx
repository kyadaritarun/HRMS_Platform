import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import api, { getFileUrl } from '../../api/client';
import {
  IconBell,
  IconLogout,
  IconUser,
  IconCheck,
  IconCalendarEvent,
  IconMenu2,
  IconSearch,
  IconBuildingSkyscraper,
  IconShieldLock,
  IconPackage,
  IconClock,
  IconCreditCard,
  IconSparkles,
  IconAlertTriangle,
  IconSettings,
  IconFileText,
} from '@tabler/icons-react';
import { SettingsModal } from '../SettingsModal';
import { TermsAndConditionsModal, PrivacyPolicyModal } from '../LegalModals';
import { getAvatarColor } from '../../utils/avatarColors';
import { getFilteredCategories, getSearchableSidebarItems } from './sidebarNavigation';
import {
  SidebarOpsVisibility,
  getSidebarOpsVisibility,
  SIDEBAR_OPS_EVENT,
} from '../../utils/sidebarPreferences';

export const AppLayout: React.FC = () => {
  const { user, company, logout, hasHrPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isAssistantActive = location.pathname === '/assistant';
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Profile Menu Modals
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  // Live notifications
  interface NotificationItem {
    id: number;
    kind: string;
    title: string;
    message: string;
    url?: string;
    isRead: boolean;
    createdAt: string;
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const knownNotificationIds = useRef<Set<number>>(new Set());
  const initialNotificationsLoaded = useRef(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      const items: NotificationItem[] = res.data?.notifications || [];

      // Check if desktop push alerts are enabled by the user in settings
      let browserAlertsEnabled = true;
      try {
        const raw = localStorage.getItem('user_notification_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.browserAlerts === false) browserAlertsEnabled = false;
        }
      } catch {
        // ignore
      }

      // If user enabled browser alerts and notification permission is granted, dispatch desktop alert
      if (
        initialNotificationsLoaded.current &&
        browserAlertsEnabled &&
        typeof window !== 'undefined' &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        items.forEach((n) => {
          if (!n.isRead && !knownNotificationIds.current.has(n.id)) {
            try {
              new window.Notification(n.title, {
                body: n.message,
                icon: '/favicon.ico',
              });
            } catch {
              // Ignore push errors
            }
          }
        });
      }

      items.forEach((n) => knownNotificationIds.current.add(n.id));
      initialNotificationsLoaded.current = true;
      setNotifications(items);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Live punch-in attendance session & timer beside profile
  const [activeAttendance, setActiveAttendance] = useState<{ checkIn?: string; workMode?: string } | null>(null);
  const [isShiftCompletedToday, setIsShiftCompletedToday] = useState(false);
  const [punchSeconds, setPunchSeconds] = useState(0);

  const fetchActiveAttendance = async () => {
    if (!user || user.role === 'PRODUCT_SUPER_ADMIN') {
      setActiveAttendance(null);
      setIsShiftCompletedToday(false);
      return;
    }
    try {
      const res = await api.get('/attendance/me');
      if (res.data?.activeSession) {
        setActiveAttendance(res.data.activeSession);
      } else {
        setActiveAttendance(null);
      }
      setIsShiftCompletedToday(Boolean(res.data?.isShiftCompletedToday));
    } catch {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchActiveAttendance();
    const interval = setInterval(fetchActiveAttendance, 20000);
    const onAttendanceUpdated = () => fetchActiveAttendance();
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'attendance_sync_ts') {
        fetchActiveAttendance();
      }
    };
    window.addEventListener('attendance-updated', onAttendanceUpdated);
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('attendance-updated', onAttendanceUpdated);
      window.removeEventListener('storage', onStorage);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!activeAttendance?.checkIn) {
      setPunchSeconds(0);
      return;
    }
    const start = new Date(activeAttendance.checkIn).getTime();
    const tick = () => setPunchSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    tick();
    const timerId = setInterval(tick, 1000);
    return () => clearInterval(timerId);
  }, [activeAttendance]);

  const formatPunchTimer = (totalSecs: number) => {
    const hrs = String(Math.floor(totalSecs / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSecs % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSecs % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    try {
      if (!n.isRead) {
        await api.patch(`/notifications/${n.id}/read`);
        setNotifications((prev) =>
          prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item))
        );
      }
      if (n.url) {
        setNotificationsOpen(false);
        navigate(n.url);
      }
    } catch (err) {
      console.error('Failed to update notification:', err);
    }
  };

  const formatNotificationTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const renderNotificationIcon = (kind: string) => {
    switch (kind?.toUpperCase()) {
      case 'PAYMENT':
      case 'PAYSLIP':
      case 'PAYROLL':
        return <IconCreditCard className="w-4 h-4 text-emerald-600" />;
      case 'LEAVE':
      case 'COMP_OFF':
      case 'REGULARIZATION':
        return <IconClock className="w-4 h-4 text-indigo-600" />;
      case 'TENANT':
      case 'COMPANY':
        return <IconBuildingSkyscraper className="w-4 h-4 text-blue-600" />;
      case 'KUDOS':
      case 'APPRECIATION':
        return <IconSparkles className="w-4 h-4 text-amber-500" />;
      case 'SYSTEM':
      case 'ALERT':
        return <IconAlertTriangle className="w-4 h-4 text-rose-500" />;
      default:
        return <IconCheck className="w-4 h-4 text-indigo-600" />;
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };


  // Sidebar Ops Visibility Preferences (for Company Admin module controls)
  const [sidebarOpsPrefs, setSidebarOpsPrefs] = useState<SidebarOpsVisibility>(() =>
    getSidebarOpsVisibility(user?.id, company?.settings)
  );

  useEffect(() => {
    setSidebarOpsPrefs(getSidebarOpsVisibility(user?.id, company?.settings));

    const handlePrefsChange = () => {
      setSidebarOpsPrefs(getSidebarOpsVisibility(user?.id, company?.settings));
    };

    window.addEventListener(SIDEBAR_OPS_EVENT, handlePrefsChange);
    window.addEventListener('storage', handlePrefsChange);

    return () => {
      window.removeEventListener(SIDEBAR_OPS_EVENT, handlePrefsChange);
      window.removeEventListener('storage', handlePrefsChange);
    };
  }, [user?.id, company?.settings]);

  // Search items strictly limited to the user's accessible sidebar items
  const searchableSidebarItems = useMemo(() => {
    if (!user) return [];
    const visibleCategories = getFilteredCategories(user, company, hasHrPermission, sidebarOpsPrefs);
    const items = getSearchableSidebarItems(visibleCategories);

    // My Profile is universally accessible
    if (user.role !== 'PRODUCT_SUPER_ADMIN') {
      items.push({
        id: 'account-profile',
        label: 'My Profile',
        path: '/profile',
        icon: IconUser,
        category: 'Account',
      });
    }

    return items;
  }, [user, company, hasHrPermission, sidebarOpsPrefs]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchableSidebarItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchableSidebarItems, searchQuery]);

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex">
      {/* Sidebar Navigation */}
      <Sidebar collapsed={sidebarCollapsed} />

      {/* Main Content Area */}
      <div
        className={`flex-1 ${
          sidebarCollapsed ? 'ml-20' : 'ml-64'
        } flex flex-col min-w-0 transition-all duration-200`}
      >
        {/* Top Navbar Header */}
        <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-6 sm:px-8 flex items-center justify-between shadow-xs">
          {/* Left: Sidebar Toggle & Search Bar */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 -ml-2 rounded-xl text-slate-500 font-medium hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <IconMenu2 className="w-5 h-5" />
            </button>

            {/* Sidebar Navigation Search Bar */}
            <div className="relative w-full max-w-md">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search navigation..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4338ca] focus:bg-white transition-all"
              />

              {/* Autocomplete Dropdown - strictly limited to user's sidebar pages */}
              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in max-h-80 overflow-y-auto">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1">
                    <span>Sidebar Menu</span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {searchResults.length} {searchResults.length === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                  {searchResults.length > 0 ? (
                    searchResults.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onMouseDown={() => {
                            navigate(item.path);
                            setSearchQuery('');
                            setSearchFocused(false);
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-[#5E4BE2] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-semibold text-slate-800 truncate group-hover:text-[#5E4BE2] transition-colors">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                            {item.category}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-4 text-xs text-slate-400 text-center font-medium">
                      No matching page found in your sidebar
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: AI Assistant, Notifications, Settings & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* AI Assistant Button */}
            <button
              type="button"
              onClick={() => navigate('/assistant')}
              title="AI Assistant"
              className={`relative group h-9 px-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                isAssistantActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 animate-ai-sparkle"
              >
                <defs>
                  <linearGradient id="aiSparkleGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#5E4BE2" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#EC4899" />
                  </linearGradient>
                  <linearGradient id="aiSmallGrad" x1="14" y1="12" x2="22" y2="20" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#F43F5E" />
                  </linearGradient>
                </defs>
                {/* Primary 4-pointed AI sparkle star */}
                <path
                  d="M10 2C10 6.41828 6.41828 10 2 10C6.41828 10 10 13.5817 10 18C10 13.5817 13.5817 10 18 10C13.5817 10 10 6.41828 10 2Z"
                  fill="url(#aiSparkleGrad)"
                />
                {/* Secondary companion AI sparkle star */}
                <path
                  d="M18 12C18 14.2091 16.2091 16 14 16C16.2091 16 18 17.7909 18 20C18 17.7909 19.7909 16 22 16C19.7909 16 18 14.2091 18 12Z"
                  fill="url(#aiSmallGrad)"
                />
                {/* Accent micro-sparkle */}
                <circle cx="18" cy="4.5" r="1.5" fill="#EC4899" />
              </svg>
              <span className="text-xs font-black tracking-wider bg-gradient-to-r from-[#5E4BE2] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent">
                AI
              </span>
            </button>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <IconBell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-slate-500 font-medium text-xs">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleNotificationClick(n)}
                          className={`p-3 hover:bg-slate-50/80 transition-colors flex items-start gap-3 cursor-pointer ${
                            !n.isRead ? 'bg-indigo-50/20' : ''
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            !n.isRead ? 'bg-indigo-50 border border-indigo-100' : 'bg-slate-100'
                          }`}>
                            {renderNotificationIcon(n.kind)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-800 flex items-center justify-between">
                              <span className="truncate">{n.title}</span>
                              {!n.isRead && (
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 ml-1.5"></span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium line-clamp-2 mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-1">{formatNotificationTime(n.createdAt)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Active Punch-In Live Timer Badge beside Profile */}
            {activeAttendance ? (
              <button
                type="button"
                onClick={() => navigate('/employee')}
                title={`Punched in at ${new Date(activeAttendance.checkIn || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Click to view dashboard`}
                className="h-9 px-3 sm:px-3.5 rounded-full bg-emerald-50/90 border border-emerald-200/90 hover:bg-emerald-100/90 transition-all cursor-pointer flex items-center gap-2 shadow-2xs group"
              >
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-xs font-black text-emerald-950 tracking-tight group-hover:text-emerald-700">
                  {formatPunchTimer(punchSeconds)}
                </span>
                <span className="w-1 h-1 rounded-full bg-emerald-300 shrink-0 hidden xs:inline" />
                <span className="text-[11px] font-bold text-emerald-700 hidden xs:flex items-center gap-1">
                  <span className="text-[10px] font-semibold text-emerald-600/90 uppercase tracking-wider">In</span>
                  <span className="font-mono text-emerald-800">
                    {new Date(activeAttendance.checkIn || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </span>
              </button>
            ) : isShiftCompletedToday ? (
              <button
                type="button"
                onClick={() => navigate('/employee')}
                title="Shift completed for today • Click to view dashboard"
                className="h-9 px-3 rounded-full bg-emerald-50/90 border border-emerald-200/90 hover:bg-emerald-100/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <IconCheck className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                <span className="text-[11px] font-bold text-emerald-800">Shift Done</span>
              </button>
            ) : null}

            {/* User Profile Menu */}
            <div className="relative pl-1">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 p-1 pl-1.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className={`w-9 h-9 rounded-full ${getAvatarColor(user?.firstName ? `${user.firstName} ${user.lastName || ''}` : user?.email || 'User')} font-bold text-sm flex items-center justify-center shadow-xs shrink-0 overflow-hidden`}>
                  {user?.profilePhoto ? (
                    <img
                      src={
                        user.profilePhoto.includes('.amazonaws.com/image/')
                          ? getFileUrl(`/image/${user.profilePhoto.split('.amazonaws.com/image/')[1]}`)
                          : user.profilePhoto.includes('.amazonaws.com/uploads/')
                          ? getFileUrl(`/uploads/${user.profilePhoto.split('.amazonaws.com/uploads/')[1]}`)
                          : user.profilePhoto
                      }
                      alt="Avatar"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : user?.firstName ? (
                    user.firstName[0].toUpperCase()
                  ) : (
                    'A'
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-900 leading-tight">
                    {user?.firstName || 'Apex'} {user?.lastName || 'Superadmin'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-medium leading-tight">
                    {user?.role === 'PRODUCT_SUPER_ADMIN'
                      ? 'Product Super Admin'
                      : user?.role?.replace(/_/g, ' ')}
                  </div>
                </div>
              </button>

              {profileOpen && (
                <>
                  {/* Invisible backdrop to close on click outside */}
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in">
                  <div className="px-3.5 py-2.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Signed in as</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{user?.email}</p>
                  </div>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <IconUser className="w-4 h-4 text-slate-500 font-medium" />
                    <span>My Profile</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setSettingsOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <IconSettings className="w-4 h-4 text-slate-500 font-medium" />
                    <span>Settings</span>
                  </button>


                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setTermsOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <IconFileText className="w-4 h-4 text-slate-500 font-medium" />
                    <span>Terms &amp; Conditions</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setPrivacyOpen(true);
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <IconShieldLock className="w-4 h-4 text-slate-500 font-medium" />
                    <span>Privacy Policy</span>
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold cursor-pointer"
                  >
                    <IconLogout className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </>
            )}
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 px-6 py-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Terms & Conditions Modal */}
      <TermsAndConditionsModal isOpen={termsOpen} onClose={() => setTermsOpen(false)} />

      {/* Privacy Policy Modal */}
      <PrivacyPolicyModal isOpen={privacyOpen} onClose={() => setPrivacyOpen(false)} />
    </div>
  );
};

