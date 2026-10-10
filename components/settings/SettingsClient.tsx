'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { ChoirSettings, AuditLog, UserRole } from '@/lib/types';
import { updateSettingsAction } from '@/lib/actions/settings';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateTime, COMMON_TIMEZONES } from '@/lib/utils/timezone';
import { Settings, Shield, Clock, Search, Save, CheckCircle2 } from 'lucide-react';

interface SettingsClientProps {
  settings: ChoirSettings;
  auditLogs: AuditLog[];
  currentUserRole: UserRole;
}

export function SettingsClient({
  settings,
  auditLogs,
  currentUserRole,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = useState<'SETTINGS' | 'AUDIT'>('SETTINGS');
  const [auditSearch, setAuditSearch] = useState('');
  const [state, formAction] = useFormState(updateSettingsAction, null);

  const filteredLogs = auditLogs.filter((log) => {
    const term = auditSearch.toLowerCase();
    return (
      log.actor_name.toLowerCase().includes(term) ||
      log.action.toLowerCase().includes(term) ||
      log.entity_type.toLowerCase().includes(term) ||
      (log.details && log.details.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          Choir Settings & System Audit History
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Global preferences, localization, and administrative action logs
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white p-2.5 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'SETTINGS'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Choir Configuration
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('AUDIT')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'AUDIT'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            System Audit Trail ({auditLogs.length})
          </button>
        </div>
      </div>

      {activeTab === 'SETTINGS' ? (
        <Card title="Choir Preferences & Localization">
          <form action={formAction} className="space-y-5">
            {state?.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                {state.error}
              </div>
            )}
            {state?.success && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{state.success}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Choir Name *"
                name="choirName"
                defaultValue={settings.choir_name}
                required
              />
              <Input
                label="Motto / Slogan"
                name="motto"
                defaultValue={settings.motto}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                  Choir Timezone *
                </label>
                <select
                  name="timezone"
                  defaultValue={settings.timezone}
                  className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 font-mono text-xs"
                >
                  {COMMON_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  Controls schedule display across all member time zones.
                </p>
              </div>

              <Input
                label="Currency Code *"
                name="currencyCode"
                defaultValue={settings.currency_code}
                required
                placeholder="USD, GHS, GBP, EUR"
                helperText="ISO currency code (e.g. USD, GHS, GBP)"
              />

              <Input
                label="Currency Symbol *"
                name="currencySymbol"
                defaultValue={settings.currency_symbol}
                required
                placeholder="$, GH₵, £, €"
                helperText="Symbol displayed on receipts and dues ($ , GH₵, etc.)"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Choir Official Email"
                name="contactEmail"
                type="email"
                defaultValue={settings.contact_email}
              />
              <Input
                label="Choir Contact Telephone"
                name="contactPhone"
                defaultValue={settings.contact_phone}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <Input
                label="Standard Monthly Dues"
                name="standardMonthlyDues"
                defaultValue={(settings.standard_monthly_dues_cents / 100).toFixed(2)}
                helperText={`Default amount in ${settings.currency_code}`}
              />

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800">
                  <input
                    type="checkbox"
                    name="allowMemberBirthdayView"
                    defaultChecked={settings.allow_member_birthday_view}
                    className="w-4 h-4 text-choir-800 rounded border-stone-300 focus:ring-choir-700"
                  />
                  <span>Display member birthdays on choir calendars</span>
                </label>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <Button type="submit">
                <Save className="w-4 h-4 mr-1.5" />
                Save Settings
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        /* System Audit Log Tab */
        <Card
          title="System Audit Trail"
          subtitle="Immutable log of administrative, attendance, and financial modifications"
          action={
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filter logs..."
                className="w-full pl-8 pr-2.5 py-1 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              />
            </div>
          }
        >
          {filteredLogs.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {filteredLogs.map((log) => (
                <div key={log.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-choir-900 bg-stone-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                      <Badge size="sm" variant="default">
                        {log.entity_type}
                      </Badge>
                    </div>
                    <span className="text-stone-400 text-[11px]">
                      {formatDateTime(log.created_at, settings.timezone)}
                    </span>
                  </div>

                  <p className="text-stone-800">
                    Performed by <strong className="font-semibold text-stone-900">{log.actor_name}</strong>
                  </p>

                  {log.details && (
                    <pre className="text-[11px] font-mono bg-stone-50 p-2 rounded border border-stone-200/60 overflow-x-auto text-stone-600 mt-1">
                      {log.details}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-stone-400 text-xs">
              No audit log entries matching filter.
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
