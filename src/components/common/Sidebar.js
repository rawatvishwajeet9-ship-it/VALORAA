'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { logoutUser } from '@/actions/authActions';
import {
  LayoutDashboard,
  User,
  Search,
  Calendar,
  FileText,
  Pill,
  Clock,
  Users,
  ClipboardList,
  ShieldCheck,
  BarChart3,
  Stethoscope,
  FolderHeart,
  ChevronRight,
  Star,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function Sidebar({ role = 'patient' }) {
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logoutUser();
    window.location.href = '/login';
  };

  const patientNav = [
    { label: 'Overview', href: '/patient/dashboard', icon: LayoutDashboard },
    { label: 'My Health Profile', href: '/patient/profile', icon: User },
    { label: 'Find Doctors', href: '/patient/doctors', icon: Search },
    { label: 'Appointments', href: '/patient/appointments', icon: Calendar },
    { label: 'Medical Records', href: '/patient/medical-records', icon: FolderHeart },
    { label: 'Prescriptions', href: '/patient/prescriptions', icon: Pill },
    { label: 'Medical History', href: '/patient/history', icon: Clock },
  ];

  const doctorNav = [
    { label: 'Overview', href: '/doctor/dashboard', icon: LayoutDashboard },
    { label: 'Doctor Profile', href: '/doctor/profile', icon: Stethoscope },
    { label: 'My Patients', href: '/doctor/patients', icon: Users },
    { label: 'Appointments', href: '/doctor/appointments', icon: Calendar },
    { label: 'Patient Reviews', href: '/doctor/reviews', icon: Star },
  ];

  const adminNav = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Patients', href: '/admin/patients', icon: Users },
    { label: 'Doctors & Verify', href: '/admin/doctors', icon: ShieldCheck },
    { label: 'All Appointments', href: '/admin/appointments', icon: Calendar },
    { label: 'Analytics & Insights', href: '/admin/analytics', icon: BarChart3 },
  ];

  let navItems = patientNav;
  if (role === 'doctor') navItems = doctorNav;
  if (role === 'admin') navItems = adminNav;

  const currentItem = navItems.find((item) => item.href === pathname) || navItems[0];

  return (
    <>
      {/* 1. Mobile Sub-Header Banner (Visible on Phone screens) */}
      <div className="md:hidden w-full bg-white border-b border-slate-200/90 px-4 py-3 flex items-center justify-between sticky top-16 z-30 shadow-xs">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors"
        >
          <Menu className="w-4 h-4" />
          <span>Menu</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[170px]">
            {currentItem?.label}
          </span>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            {role}
          </span>
        </div>
      </div>

      {/* 2. Mobile Slide-Over Drawer with Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Slide-over Content Drawer */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full flex flex-col p-4 shadow-2xl z-10 overflow-y-auto animate-in slide-in-from-left duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  {role} Workspace
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-1.5 flex-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-teal-50 text-teal-700 font-semibold shadow-xs border border-teal-100'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-teal-600' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-teal-600" />}
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Desktop Persistent Sidebar */}
      <aside className="hidden md:flex md:w-64 shrink-0 bg-white border-r border-slate-200/80 min-h-[calc(100vh-4rem)] flex-col p-4 shadow-xs">
        <div className="mb-4 px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {role} Workspace
          </span>
        </div>

        <nav className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 group ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold shadow-xs border border-teal-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-teal-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-teal-600" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout Action */}
        <div className="pt-2 pb-2">
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 shrink-0" />
              <span>{isLoggingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </div>
          </button>
        </div>

        {/* Safety & Compliance Badge */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Encrypted & HIPAA Compliant</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              All medical records and consultations are encrypted.
            </p>
          </div>
        </div>
      </aside>

      {/* 4. Mobile Bottom Quick Bar (Sticky at bottom for 1-thumb phone navigation) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 py-1.5 px-2 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 4).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all ${
                isActive
                  ? 'text-teal-600 font-bold bg-teal-50/70'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[65px]">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl text-[10px] font-semibold text-slate-500 hover:text-slate-800"
        >
          <Menu className="w-4 h-4" />
          <span>More</span>
        </button>
      </div>
    </>
  );
}

