import React from 'react';
import Link from 'next/link';
import { isFirstAdminNeeded } from '@/lib/auth';
import { SetupForm } from './SetupForm';
import { ShieldCheck, ShieldAlert, Music } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function SetupPage() {
  const isNeeded = isFirstAdminNeeded();

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
          First Administrator Initialization
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/90 rounded-2xl sm:px-10">
          {isNeeded ? (
            <div>
              <div className="mb-6 flex items-start gap-3 p-3.5 bg-gold-50/70 border border-gold-200 rounded-xl text-gold-950 text-xs">
                <ShieldCheck className="w-5 h-5 text-gold-700 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">Clean Installation Detected</span>
                  Initialize your primary administrator account below. Once this account is created, this setup gateway is automatically locked forever.
                </div>
              </div>
              <SetupForm />
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-50 text-rose-700 mb-3 border border-rose-200">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h2 className="text-base font-semibold text-stone-900">
                Setup Gateway Locked
              </h2>
              <p className="text-xs text-stone-600 mt-2 mb-6">
                An administrator account is already active on this choir installation. Additional administrators or members must be invited from within the administration portal.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-choir-800 text-white hover:bg-choir-900 transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

