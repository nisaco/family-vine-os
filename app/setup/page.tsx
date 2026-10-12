import React from 'react';
import Link from 'next/link';
import { isFirstAdminNeeded } from '@/lib/auth';
import { SetupForm } from './SetupForm';
import { ShieldCheck, ShieldAlert, AlertTriangle, Music, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  let isNeeded = false;
  let dbError: string | null = null;

  try {
    isNeeded = await isFirstAdminNeeded();
  } catch (err: unknown) {
    dbError = err instanceof Error ? err.message : String(err);
  }

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

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg">
        <div className="bg-white py-8 px-6 shadow-sm border border-stone-200/90 rounded-2xl sm:px-10">
          {dbError ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs">
                <AlertTriangle className="w-5 h-5 text-rose-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <span className="font-semibold block text-sm text-rose-900">
                    Database Connection Required
                  </span>
                  <p className="text-rose-800 leading-relaxed font-mono text-[11px] bg-rose-100/60 p-2 rounded border border-rose-200 break-all">
                    {dbError}
                  </p>
                </div>
              </div>

              <div className="text-xs text-stone-600 space-y-2.5 pt-2">
                <p className="font-semibold text-stone-800">To resolve this on Render:</p>
                <ol className="list-decimal pl-4 space-y-2 text-stone-600">
                  <li>
                    Open your <strong>Render Dashboard</strong> → Click your service (<strong>family-vine-os</strong>) → <strong>Environment</strong>.
                  </li>
                  <li>
                    Ensure the key is named exactly <code className="bg-stone-100 px-1 py-0.5 rounded font-mono font-bold text-stone-800">MONGODB_URI</code>.
                  </li>
                  <li>
                    Ensure the value starts with <code className="bg-stone-100 px-1 py-0.5 rounded font-mono text-stone-800">mongodb+srv://...</code> without quotes.
                  </li>
                  <li>
                    Click the blue <strong>&quot;Save Changes&quot;</strong> button at the bottom of the Render page.
                  </li>
                  <li>
                    In <strong>MongoDB Atlas</strong>: Go to <strong>Network Access</strong> → Add IP Address → Click <strong>&quot;Allow Access from Anywhere&quot; (0.0.0.0/0)</strong> so Render servers can connect.
                  </li>
                  <li>
                    In Render, click <strong>Manual Deploy</strong> → <strong>Deploy latest commit</strong>.
                  </li>
                </ol>
              </div>

              <div className="pt-3 border-t border-stone-100 text-center">
                <Link
                  href="/setup"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-choir-800 text-white hover:bg-choir-900 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Connection
                </Link>
              </div>
            </div>
          ) : isNeeded ? (
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
