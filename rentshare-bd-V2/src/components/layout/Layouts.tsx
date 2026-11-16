import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Calendar,
  CreditCard,
  FileCheck2,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  PlusSquare,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  Wrench,
  X,
  BarChart3,
  Heart,
  Star,
  UserCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath =
    user?.role === 'admin'
      ? '/admin'
      : user?.role === 'landlord'
      ? '/landlord'
      : '/tenant';

  const navItems = [
    { label: 'Home', to: '/' },
    { label: 'Marketplace', to: '/properties' },
    { label: 'Roommates', to: '/roommates' },
    { label: 'How It Works', to: '/how-it-works' },
    { label: 'About', to: '/about' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-[#0F172A] whitespace-nowrap shrink-0"
          >
            RentShare BD
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#4F46E5] ${
                    active ? 'text-[#4F46E5] font-semibold' : ''
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {user ? (
              <Link
                to={dashboardPath}
                className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
              >
                Open Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-[#4F46E5] text-white text-sm font-medium hover:bg-indigo-700 transition-colors whitespace-nowrap shrink-0"
              >
                Sign In
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-6 py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-slate-700 hover:text-[#4F46E5]"
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-semibold text-[#4F46E5]"
              >
                Create Account
              </Link>
            )}
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-white mt-16">
        <div className="max-w-[1280px] mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div className="md:col-span-2">
            <p className="font-display text-lg font-bold text-slate-900">RentShare BD</p>
            <p className="mt-2 text-slate-600 max-w-md">
              Find a Place. Find the Right Roommate. Manage Your Life Together. Built for students
              and working professionals across Dhaka, Savar, and Gazipur.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-3">Platform</p>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/properties" className="hover:text-[#4F46E5]">
                  Property Marketplace
                </Link>
              </li>
              <li>
                <Link to="/roommates" className="hover:text-[#4F46E5]">
                  Roommate Discovery
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-[#4F46E5]">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#4F46E5]">
                  About Us
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-3">Account</p>
            <ul className="space-y-2 text-slate-600">
              <li>
                <Link to="/login" className="hover:text-[#4F46E5]">
                  Sign In
                </Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-[#4F46E5]">
                  Create Account
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200 py-4 px-6 text-center text-xs text-slate-500">
          © 2026 RentShare BD · Shared Living Platform for Bangladesh (BDT ৳)
        </div>
      </footer>
    </div>
  );
}

interface SidebarLink {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TENANT_LINKS: SidebarLink[] = [
  { label: 'Overview', to: '/tenant', icon: LayoutDashboard },
  { label: 'My Profile', to: '/tenant/profile', icon: UserCheck },
  { label: 'Roommate Matches', to: '/tenant/matches', icon: Users },
  { label: 'Rental Requests', to: '/tenant/requests', icon: Home },
  { label: 'Saved Properties', to: '/tenant/saved', icon: Heart },
  { label: 'Rental Agreement', to: '/tenant/agreement', icon: FileCheck2 },
  { label: 'Roommate Group', to: '/tenant/group', icon: Building2 },
  { label: 'Group Chat', to: '/tenant/chat', icon: MessageSquare },
  { label: 'Private Chat', to: '/tenant/private-chat', icon: MessageSquare },
  { label: 'Expense Dashboard', to: '/tenant/expenses', icon: Receipt },
  { label: 'Expense Splitting', to: '/tenant/splits', icon: CreditCard },
  { label: 'Utility Bills', to: '/tenant/utilities', icon: Zap },
  { label: 'Weekly Meals', to: '/tenant/meals', icon: Calendar },
  { label: 'Grocery Manager', to: '/tenant/groceries', icon: ShoppingCart },
  { label: 'Maintenance', to: '/tenant/maintenance', icon: Wrench },
  { label: 'AI Financial Assistant', to: '/tenant/ai-assistant', icon: Sparkles },
  { label: 'Notifications', to: '/tenant/notifications', icon: Bell },
  { label: 'Settings', to: '/tenant/settings', icon: Settings },
];

const LANDLORD_LINKS: SidebarLink[] = [
  { label: 'Overview', to: '/landlord', icon: LayoutDashboard },
  { label: 'My Properties', to: '/landlord/properties', icon: Building2 },
  { label: 'Add Property', to: '/landlord/properties/new', icon: PlusSquare },
  { label: 'Applications', to: '/landlord/applications', icon: Home },
  { label: 'My Tenants', to: '/landlord/tenants', icon: Users },
  { label: 'Rental Agreements', to: '/landlord/agreements', icon: FileCheck2 },
  { label: 'Maintenance', to: '/landlord/maintenance', icon: Wrench },
  { label: 'Reviews', to: '/landlord/reviews', icon: Star },
];

const ADMIN_LINKS: SidebarLink[] = [
  { label: 'Analytics Overview', to: '/admin', icon: BarChart3 },
  { label: 'User Management', to: '/admin/users', icon: Users },
  { label: 'Property Verification', to: '/admin/properties', icon: ShieldCheck },
  { label: 'Suspicious Listings', to: '/admin/suspicious', icon: ShieldAlert },
  { label: 'Complaints', to: '/admin/complaints', icon: FileCheck2 },
  { label: 'Reports & Export', to: '/admin/reports', icon: Receipt },
];

export function DashboardLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { user, logout, unreadNotifications } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const links =
    user?.role === 'admin'
      ? ADMIN_LINKS
      : user?.role === 'landlord'
      ? LANDLORD_LINKS
      : TENANT_LINKS;

  const notifPath =
    user?.role === 'tenant' ? '/tenant/notifications' : user?.role === 'landlord' ? '/landlord/applications' : '/admin/complaints';

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-[#0F172A]">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <Link to="/" className="font-display text-lg font-bold text-slate-900 whitespace-nowrap">
            RentShare BD
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:bg-slate-100"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-2.5 border-b border-slate-100 text-xs text-slate-500">
          <div className="font-semibold text-slate-900 truncate">{user?.full_name}</div>
          <div className="capitalize mt-0.5">{user?.role} workspace</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2 pb-4 space-y-0.5">
          {links.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-indigo-50 text-[#4F46E5] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-200 space-y-1 shrink-0">
          <Link
            to="/properties"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Search className="w-4 h-4 shrink-0" />
            <span>Browse Marketplace</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
              aria-label="Open navigation sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display text-lg font-bold text-slate-900 truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={notifPath}
              className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              aria-label={`Notifications (${unreadNotifications} unread)`}
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#4F46E5] text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-[1280px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
