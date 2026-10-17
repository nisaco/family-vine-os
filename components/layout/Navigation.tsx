'use client';

import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';
import { signOutAction } from '@/lib/actions/auth';
import type { User, UserRole } from '@/lib/types';

interface NavigationProps {
  user: User;
  choirName: string;
}

export function Navigation({ user, choirName }: NavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const focusableElements = () =>
      drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );

    focusableElements()?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        return;
      }

      if (event.key === 'Tab') {
        const elements = focusableElements();
        if (!elements?.length) return;

        const firstElement = elements[0];
        const lastElement = elements[elements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (drawerRef.current?.contains(document.activeElement)) {
        menuButtonRef.current?.focus();
      }
    };
  }, [mobileMenuOpen]);
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

  const roleLabels: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    PRESIDENT: 'President',
    GENERAL_SECRETARY: 'General Secretary',
    FINANCIAL_SECRETARY: 'Financial Secretary',
    TREASURER: 'Treasurer',
    WELFARE_OFFICER: 'Welfare Officer',
    CHIEF_ASAPHITE: 'Chief Asaphite',
    PRAYER_DIRECTOR: 'Prayer Director',
    MUSIC_DIRECTOR: 'Music Director',
    MEMBER: 'Choir Member',
  };

  return (
    <>
      {/* Mobile Top App Bar */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-stone-700 hover:bg-stone-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-choir-700"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="min-w-0">
            <span className="font-semibold text-sm tracking-tight block leading-tight text-stone-900 truncate">
              {choirName}
            </span>
            <span className="text-xs text-stone-500 block mt-0.5">
              {roleLabels[user.role]}
            </span>
          </div>
        </div>
        <Link
          href="/profile"
          className="flex items-center gap-2 text-xs bg-stone-50 hover:bg-stone-100 px-3 py-2 rounded-full border border-stone-200 text-stone-700 transition-colors"
        >
          <span className="font-medium truncate max-w-[120px]">
            {user.preferred_name || user.full_name}
          </span>
        </Link>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-stone-950/40 backdrop-blur-sm flex"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            ref={drawerRef}
            id="mobile-navigation-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${choirName} navigation`}
            className="w-[min(88vw,20rem)] bg-white h-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 bg-[#2d1216] text-white flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-base leading-snug">{choirName}</h2>
                <p className="text-xs text-choir-300 mt-0.5">{roleLabels[user.role]}</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-choir-200 hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <nav aria-label="Primary navigation" className="flex-1 overflow-y-auto p-3 space-y-1">
              {navItems
                .filter((item) => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-choir-50 text-choir-900 font-semibold ring-1 ring-inset ring-choir-100'
                          : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-choir-800' : 'text-stone-500'}`} aria-hidden="true" />
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
                className="text-sm text-stone-700 font-medium hover:text-choir-800 transition-colors"
              >
                My Profile
              </Link>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="flex items-center gap-2 text-sm text-rose-700 font-medium hover:text-rose-900 transition-colors"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
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
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-400/25 flex items-center justify-center text-gold-300">
              <Music className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm tracking-tight leading-snug text-stone-100">
                {choirName}
              </h1>
              <p className="text-[11px] text-stone-400 mt-1">Choir member portal</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3">
            <div className="truncate">
              <p className="text-sm font-medium text-stone-100 truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-stone-400 truncate mt-0.5">
                {roleLabels[user.role]}
                {user.voice_part ? ` • ${user.voice_part}` : ''}
              </p>
            </div>
            <Link
              href="/profile"
              className="text-xs text-gold-300 hover:text-gold-200 hover:underline flex-shrink-0 focus-visible:rounded-sm"
            >
              Profile
            </Link>
          </div>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Primary navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white font-semibold ring-1 ring-inset ring-white/10'
                      : 'text-stone-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    aria-hidden="true"
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
        <div className="p-4 border-t border-white/10 bg-black/10">
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full min-h-10 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-300 hover:text-white hover:bg-white/5 transition-colors border border-white/10 focus-visible:ring-2 focus-visible:ring-gold-400"
            >
              <LogOut className="w-4 h-4 text-stone-400" aria-hidden="true" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
