'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { signInAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ChevronDown, KeyRound, Music } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction] = useFormState(signInAction, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col justify-center py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-choir-900 text-gold-300 shadow-sm mb-4 border border-choir-800">
          <Music className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
          Family Vine Choir
        </h1>
        <p className="mt-1.5 text-sm text-stone-600">
          Administration and Member Portal
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-5 shadow-[0_8px_30px_rgba(41,37,36,0.06)] border border-stone-200/90 rounded-2xl sm:px-9 sm:py-8">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
              >
                {state.error}
              </div>
            )}

            <Input
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@familyvinechoir.org"
            />

            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
            />

            <Button type="submit" className="w-full py-2.5 text-sm font-semibold">
              Sign In to Portal
            </Button>
          </form>

          <details className="group mt-6 border-t border-stone-200 pt-5">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-lg text-sm font-medium text-stone-700 transition-colors hover:text-choir-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-choir-700 [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-gold-600" />
                Demo sign-in accounts
              </span>
              <span className="flex items-center gap-2 text-xs text-stone-500">
                For evaluation
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              </span>
            </summary>
            <div className="mt-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Available profiles
                </h2>
                <span className="text-[11px] text-stone-500">Password: Password123!</span>
              </div>
              <p className="text-xs text-stone-500 mb-3">
              Click any profile to auto-fill credentials and test role-based permissions:
              </p>

            {/* Directorate & Executive Officers */}
            <div className="mb-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Directorate & Administrative Officers
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('admin@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">Administrator</div>
                  <div className="text-[11px] text-stone-500 truncate">admin@familyvine...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('president@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">President</div>
                  <div className="text-[11px] text-stone-500 truncate">president@familyvine...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('welfare@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 transition-colors"
                >
                  <div className="font-semibold text-amber-950 flex items-center justify-between">
                    <span>Welfare Officer</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-800 bg-amber-200/80 px-1 py-0.2 rounded">New</span>
                  </div>
                  <div className="text-[11px] text-amber-800/80 truncate">welfare@familyvine...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('secretary@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">General Secretary</div>
                  <div className="text-[11px] text-stone-500 truncate">secretary@familyvine...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('finsec@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">Financial Sec.</div>
                  <div className="text-[11px] text-stone-500 truncate">finsec@familyvine...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('treasurer@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">Treasurer</div>
                  <div className="text-[11px] text-stone-500 truncate">treasurer@familyvine...</div>
                </button>
              </div>
            </div>

            {/* Wing Members & Today's Birthday Celebrant */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Choir, Band & Dance Wing Members
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillDemoAccount('kofi.ansah@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-gold-300 bg-gold-50/60 hover:bg-gold-50 hover:border-gold-400 transition-colors"
                >
                  <div className="font-semibold text-gold-950 flex items-center justify-between">
                    <span>Kofi Ansah (Praise)</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-gold-900 bg-gold-200 px-1 py-0.2 rounded">Birthday Today</span>
                  </div>
                  <div className="text-[11px] text-gold-800 truncate">kofi.ansah@familyvine...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('yaw.bio@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">Yaw Bio (Asaphites)</div>
                  <div className="text-[11px] text-stone-500 truncate">yaw.bio@familyvine...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('charlene.mensah@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">Charlene (Vimmies)</div>
                  <div className="text-[11px] text-stone-500 truncate">charlene.mensah@...</div>
                </button>

                <button
                  type="button"
                  onClick={() => fillDemoAccount('akua.serwaa@familyvinechoir.org')}
                  className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 hover:border-stone-300 transition-colors"
                >
                  <div className="font-semibold text-stone-800">Akua (Soprano)</div>
                  <div className="text-[11px] text-stone-500 truncate">akua.serwaa@familyvine...</div>
                </button>
              </div>
            </div>
          </div>
          </details>
        </div>

        <div className="mt-6 text-center text-xs text-stone-500">
          <p>Restricted system. Access is by choir administrative invitation only.</p>
        </div>
      </div>
    </div>
  );
}
