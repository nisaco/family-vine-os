'use client';

import React from 'react';
import { useFormState } from 'react-dom';
import { setupFirstAdminAction } from '@/lib/actions/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function SetupForm() {
  const [state, formAction] = useFormState(setupFirstAdminAction, null);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium"
        >
          {state.error}
        </div>
      )}

      <Input
        label="Administrator Full Name"
        name="fullName"
        type="text"
        required
        placeholder="e.g. John Mensah"
      />

      <Input
        label="Administrator Email Address"
        name="email"
        type="email"
        required
        placeholder="admin@familyvinechoir.org"
      />

      <Input
        label="Create Master Password"
        name="password"
        type="password"
        required
        minLength={8}
        placeholder="At least 8 characters"
        helperText="Must be at least 8 characters long."
      />

      <Input
        label="Confirm Master Password"
        name="confirmPassword"
        type="password"
        required
        minLength={8}
        placeholder="Re-enter password"
      />

      <div className="pt-2">
        <Button type="submit" className="w-full py-2.5 text-sm font-semibold">
          Initialize Administrator Account
        </Button>
      </div>
    </form>
  );
}

