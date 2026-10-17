'use client';

import React from 'react';
import { useFormState } from 'react-dom';
import { User } from '@/lib/types';
import { updateProfileAction, changePasswordAction } from '@/lib/actions/auth';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, SubmitButton } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { User as UserIcon, Lock, CheckCircle2, Shield } from 'lucide-react';

interface ProfileClientProps {
  user: User;
}

export function ProfileClient({ user }: ProfileClientProps) {
  const [profileState, profileAction] = useFormState(updateProfileAction, null);
  const [passwordState, passwordAction] = useFormState(changePasswordAction, null);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          My Account & Profile
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Manage your personal contact information and access credentials
        </p>
      </div>

      {/* Account Info Badge Card */}
      <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-choir-900 text-gold-300 font-serif font-bold text-xl flex items-center justify-center">
            {user.full_name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-stone-900">{user.full_name}</h2>
              <Badge variant="gold">{user.role.replace('_', ' ')}</Badge>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              {user.email || 'No email assigned'} • {user.voice_part || 'General Section'}
            </p>
          </div>
        </div>

        <div className="text-xs text-stone-500 sm:text-right">
          <span>Member since: </span>
          <strong className="text-stone-800">{user.join_date}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Info Form */}
        <Card title="Permitted Contact Information">
          <form action={profileAction} className="space-y-4">
            {profileState?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {profileState.error}
              </div>
            )}
            {profileState?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{profileState.success}</span>
              </div>
            )}

            <Input
              label="Preferred / Short Name"
              name="preferredName"
              defaultValue={user.preferred_name || ''}
              placeholder="e.g. John"
            />

            <Input
              label="Mobile Telephone"
              name="phone"
              defaultValue={user.phone || ''}
              placeholder="+1 555-0199"
            />

            <Input
              label="Home / Residential Address"
              name="address"
              defaultValue={user.address || ''}
              placeholder="Physical street address"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Emergency Contact Name"
                name="emergencyContactName"
                defaultValue={user.emergency_contact_name || ''}
                placeholder="Relative or next of kin"
              />
              <Input
                label="Emergency Contact Phone"
                name="emergencyContactPhone"
                defaultValue={user.emergency_contact_phone || ''}
                placeholder="Emergency telephone"
              />
            </div>

            <Input
              label="Date of Birth"
              name="birthDate"
              type="date"
              defaultValue={user.birth_date || ''}
            />

            <div className="pt-2 flex justify-end">
              <SubmitButton loadingText="Updating Contact Details...">
                Update Contact Details
              </SubmitButton>
            </div>
          </form>
        </Card>

        {/* Change Password Form */}
        <Card title="Security & Password">
          <form action={passwordAction} className="space-y-4">
            {passwordState?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {passwordState.error}
              </div>
            )}
            {passwordState?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{passwordState.success}</span>
              </div>
            )}

            <Input
              label="Current Password *"
              name="currentPassword"
              type="password"
              required
              placeholder="••••••••••••"
            />

            <Input
              label="New Password *"
              name="newPassword"
              type="password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />

            <Input
              label="Confirm New Password *"
              name="confirmPassword"
              type="password"
              required
              minLength={8}
              placeholder="Re-enter new password"
            />

            <div className="pt-2 flex justify-end">
              <SubmitButton variant="secondary" loadingText="Updating Password...">
                Change Password
              </SubmitButton>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
