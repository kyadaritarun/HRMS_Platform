import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import {
  IconBell,
  IconLogout,
  IconUser,
  IconCheck,
  IconCalendarEvent,
  IconMenu2,
  IconSearch,
  IconSettings,
  IconBuildingSkyscraper,
  IconShieldLock,
  IconPackage,
} from '@tabler/icons-react';

export const AppLayout: React.FC = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Mock notifications list
  const notifications = [
    { id: 1, title: 'New Tenant Registered', message: 'Acme Corporation signed up for Enterprise Tier.', time: '10m ago', icon: IconCheck, read: false },
    { id: 2, title: 'Package Renewal Alert', message: 'Global Logistics renewal is due in 14 days.', time: '1h ago', icon: IconCalendarEvent, read: false },
    { id: 3, title: 'System Health Check', message: 'All 4 cluster nodes operational at 99.98% uptime.', time: '2h ago', icon: IconCheck, read: false },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Quick navigation items for search autocomplete
  const quickLinks = [
    { label: 'All Companies', path: '/super-admin/companies', icon: IconBuildingSkyscraper, category: 'Tenants' },
    { label: 'Add Super Admin', path: '/super-admin/super-admins/add', icon: IconShieldLock, category: 'Security' },
    { label: 'Packages & Pricing', path: '/super-admin/packages', icon: IconPackage, category: 'Billing' },
    { label: 'My Profile', path: '/profile', icon: IconUser, category: 'Account' },
  ].filter((item) =>
    searchQuery.trim() === '' || item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
              className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <IconMenu2 className="w-5 h-5" />
            </button>

            {/* Global Search Input */}
            <div className="relative w-full max-w-md">
              <IconSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies, tenants, users..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50/90 border border-slate-200/80 text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#4338ca] focus:bg-white transition-all"
              />

              {/* Autocomplete Dropdown */}
              {searchFocused && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in">
                  <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick Results
                  </div>
                  {quickLinks.length > 0 ? (
                    quickLinks.map((ql) => {
                      const Icon = ql.icon;
                      return (
                        <button
                          key={ql.path}
                          onMouseDown={() => {
                            navigate(ql.path);
                            setSearchQuery('');
                          }}
                          className="w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center justify-between transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-indigo-600" />
                            <span className="font-medium">{ql.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {ql.category}
                          </span>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-3 py-2 text-xs text-slate-400">No matching results found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Notifications, Settings & User Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <IconBell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-2xs">
                  3
                </span>
              </button>

              {/* Notifications Drawer */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-3 z-50 animate-in fade-in">
                  <div className="px-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Notifications (3)</span>
                    <button
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] font-semibold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-slate-50/80 transition-colors flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <n.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-800">{n.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2">{n.message}</div>
                          <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Gear */}
            <button
              onClick={() => navigate(user?.role === 'PRODUCT_SUPER_ADMIN' ? '/super-admin/packages' : '/profile')}
              className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              title="Settings"
            >
              <IconSettings className="w-5 h-5" />
            </button>

            {/* User Profile Menu */}
            <div className="relative pl-1">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 p-1 pl-1.5 rounded-xl hover:bg-slate-100/80 transition-colors cursor-pointer"
              >
                <div className="w-9 h-9 rounded-full bg-[#4338ca] text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                  {user?.profilePhoto ? (
                    <img
                      src={
                        user.profilePhoto.includes('.amazonaws.com/image/')
                          ? `/image/${user.profilePhoto.split('.amazonaws.com/image/')[1]}`
                          : user.profilePhoto.includes('.amazonaws.com/uploads/')
                          ? `/uploads/${user.profilePhoto.split('.amazonaws.com/uploads/')[1]}`
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
                  <div className="text-[11px] text-slate-400 font-medium leading-tight">
                    {user?.role === 'PRODUCT_SUPER_ADMIN'
                      ? 'Product Super Admin'
                      : user?.role?.replace(/_/g, ' ')}
                  </div>
                </div>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in">
                  <div className="px-3.5 py-2.5 border-b border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                    <p className="text-xs font-bold text-slate-800 truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {user?.role === 'PRODUCT_SUPER_ADMIN' ? 'Product Super Admin' : user?.role}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <IconUser className="w-4 h-4 text-slate-400" />
                    My Profile
                  </button>

                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      navigate('/login');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 cursor-pointer font-medium"
                  >
                    <IconBuildingSkyscraper className="w-4 h-4 text-slate-400" />
                    Switch Account / Demo
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    onClick={handleLogout}
                    className="w-full px-3.5 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 font-semibold cursor-pointer"
                  >
                    <IconLogout className="w-4 h-4 text-rose-500" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content View */}
        <main className="flex-1 px-6 py-5 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

