'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CheckSquare,
  DollarSign,
  Receipt,
  Bell,
  BookOpen,
  Music,
  Settings,
  UserCheck,
  LogOut,
  Menu,
  X,
  Shield,
  Clock,
} from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import { Badge } from '@/lib/../components/ui/Badge';
import type { User, UserRole } from '@/lib/types';

interface NavigationProps {
  user: User;
  choirName: string;
}

export function Navigation({ user, choirName }: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isOfficer =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'GENERAL_SECRETARY' ||
    user.role === 'FINANCIAL_SECRETARY' ||
    user.role === 'TREASURER';

  const canViewChoirFinance =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'FINANCIAL_SECRETARY' ||
    user.role === 'TREASURER';

  const canTakeAttendance =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'GENERAL_SECRETARY';

  const navItems = [
    {
      label: 'Home Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Member Directory',
      href: '/directory',
      icon: Users,
      show: true,
    },
    {
      label: 'Events & Calendar',
      href: '/events',
      icon: Calendar,
      show: true,
    },
    {
      label: 'Record Attendance',
      href: '/attendance',
      icon: CheckSquare,
      show: canTakeAttendance,
    },
    {
      label: 'My Attendance',
      href: '/my-attendance',
      icon: UserCheck,
      show: !canTakeAttendance,
    },
    {
      label: 'Financial Ledger',
      href: '/finance',
      icon: DollarSign,
      show: canViewChoirFinance,
    },
    {
      label: 'My Dues & Receipts',
      href: '/my-finances',
      icon: Receipt,
      show: true,
    },
    {
      label: 'Announcements',
      href: '/announcements',
      icon: Bell,
      show: true,
    },
    {
      label: 'Minutes & Action Items',
      href: '/minutes',
      icon: BookOpen,
      show: true,
    },
    {
      label: 'Music Library',
      href: '/songs',
      icon: Music,
      show: true,
    },
    {
      label: 'Choir Settings & Audit',
      href: '/settings',
      icon: Settings,
      show: user.role === 'ADMIN',
    },
  ];

  const roleBadgeVariant: Record<UserRole, 'default' | 'success' | 'warning' | 'purple' | 'gold'> = {
    ADMIN: 'purple',
    PRESIDENT: 'gold',
    GENERAL_SECRETARY: 'info' as unknown as 'default',
    FINANCIAL_SECRETARY: 'success',
    TREASURER: 'success',
    MEMBER: 'default',
  };

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    PRESIDENT: 'President',
    GENERAL_SECRETARY: 'General Secretary',
    FINANCIAL_SECRETARY: 'Financial Secretary',
    TREASURER: 'Treasurer',
    MEMBER: 'Choir Member',
  };

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-choir-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg hover:bg-choir-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div>
            <span className="font-semibold text-sm tracking-tight block leading-tight">
              {choirName}
            </span>
            <span className="text-[10px] text-choir-300 block">
              {roleLabels[user.role]}
            </span>
          </div>
        </div>
        <Link
          href="/profile"
          className="flex items-center gap-2 text-xs bg-choir-800/80 hover:bg-choir-800 px-2.5 py-1.5 rounded-full border border-choir-700"
        >
          <span className="font-medium truncate max-w-[100px]">
            {user.preferred_name || user.full_name}
          </span>
        </Link>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 bg-choir-900 text-white flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base">{choirName}</h2>
                <p className="text-xs text-choir-300 mt-0.5">{roleLabels[user.role]}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded text-choir-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-choir-50 text-choir-900 border-l-4 border-choir-800 font-semibold'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-choir-800' : 'text-stone-500'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
            </nav>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex items-center justify-between">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs text-stone-700 font-medium hover:underline"
              >
                My Profile
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-xs text-rose-700 font-medium hover:text-rose-900"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-[#2d1216] text-white border-r border-choir-950 z-30">
        {/* Brand Header */}
        <div className="p-6 border-b border-choir-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gold-500/20 border border-gold-400/30 flex items-center justify-center text-gold-300 font-serif font-bold text-lg">
              V
            </div>
            <div>
              <h1 className="font-semibold text-base tracking-tight leading-none text-stone-100">
                {choirName}
              </h1>
              <p className="text-[11px] text-gold-200/80 mt-1">United in Harmony</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-choir-900/60 flex items-center justify-between">
            <div className="truncate">
              <p className="text-xs font-medium text-stone-200 truncate">
                {user.full_name}
              </p>
              <p className="text-[10px] text-choir-300 truncate">
                {roleLabels[user.role]}
                {user.voice_part ? ` • ${user.voice_part}` : ''}
              </p>
            </div>
            <Link
              href="/profile"
              className="text-[11px] text-gold-300 hover:text-gold-200 hover:underline flex-shrink-0"
            >
              Profile
            </Link>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-choir-800 text-white shadow-xs font-semibold border-l-4 border-gold-400'
                      : 'text-stone-300 hover:bg-choir-900/60 hover:text-white'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      isActive ? 'text-gold-300' : 'text-stone-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* User Footer & Sign Out */}
        <div className="p-4 border-t border-choir-900 bg-choir-950/40">
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-stone-300 hover:text-white hover:bg-choir-900 transition-colors border border-choir-900"
            >
              <LogOut className="w-3.5 h-3.5 text-stone-400" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

