'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { signInAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Shield, Music, UserCheck, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [state, formAction] = useFormState(signInAction, null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const fillDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-choir-900 text-gold-300 shadow-md mb-4 border border-choir-800">
          <Music className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
          Family Vine Choir
        </h1>
        <p className="mt-1.5 text-sm text-stone-600">
          Administration and Member Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/90 rounded-2xl sm:px-10">
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

          {/* Quick Demo Credentials Helper for Local Evaluation */}
          <div className="mt-8 pt-6 border-t border-stone-200">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
              <KeyRound className="w-3.5 h-3.5 text-gold-600" />
              <span>Demo Evaluation Logins</span>
            </div>
            <p className="text-xs text-stone-500 mb-3">
              Click any role to test role-based permissions (default demo password: <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800">Password123!</code>):
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemoAccount('admin@familyvinechoir.org')}
                className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <div className="font-semibold text-stone-800">Administrator</div>
                <div className="text-[11px] text-stone-500 truncate">admin@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('president@familyvinechoir.org')}
                className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <div className="font-semibold text-stone-800">President</div>
                <div className="text-[11px] text-stone-500 truncate">president@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('secretary@familyvinechoir.org')}
                className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <div className="font-semibold text-stone-800">General Secretary</div>
                <div className="text-[11px] text-stone-500 truncate">secretary@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('finsec@familyvinechoir.org')}
                className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <div className="font-semibold text-stone-800">Financial Sec.</div>
                <div className="text-[11px] text-stone-500 truncate">finsec@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('treasurer@familyvinechoir.org')}
                className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <div className="font-semibold text-stone-800">Treasurer</div>
                <div className="text-[11px] text-stone-500 truncate">treasurer@...</div>
              </button>

              <button
                type="button"
                onClick={() => fillDemoAccount('kofi.ansah@familyvinechoir.org')}
                className="text-left p-2 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <div className="font-semibold text-stone-800">Member (Tenor)</div>
                <div className="text-[11px] text-stone-500 truncate">kofi.ansah@...</div>
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-stone-500">
          <p>Restricted system. Access is by choir administrative invitation only.</p>
        </div>
      </div>
    </div>
  );
}

