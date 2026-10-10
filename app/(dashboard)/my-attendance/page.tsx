import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getUserAttendanceStats, getChoirSettings } from '@/lib/data';
import { getDb } from '@/lib/db';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDateTime } from '@/lib/utils/timezone';
import type { AttendanceRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function MyAttendancePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const settings = getChoirSettings();
  const stats = getUserAttendanceStats(user.id);

  const db = getDb();
  const records = db.prepare(`
    SELECT a.*, e.title as event_title, e.start_time as event_start_time, e.event_type
    FROM attendance_records a
    JOIN events e ON a.event_id = e.id
    WHERE a.user_id = ?
    ORDER BY e.start_time DESC
  `).all(user.id) as Array<AttendanceRecord & { event_title: string; event_start_time: string; event_type: string }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
          My Attendance Record
        </h1>
        <p className="text-sm text-stone-500 mt-0.5">
          Personal rehearsal and service commitment overview for {user.full_name}
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <span className="text-xs text-stone-500 font-medium block">Overall Rate</span>
          <span className="text-2xl font-bold text-stone-900 mt-1 block">
            {stats.ratePercent}%
          </span>
          <span className="text-[11px] text-stone-400">Total Gatherings: {stats.total}</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <span className="text-xs text-emerald-700 font-medium block">Present</span>
          <span className="text-2xl font-bold text-emerald-800 mt-1 block">
            {stats.present}
          </span>
          <span className="text-[11px] text-stone-400">On-time ministrations</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <span className="text-xs text-amber-700 font-medium block">Late</span>
          <span className="text-2xl font-bold text-amber-800 mt-1 block">
            {stats.late}
          </span>
          <span className="text-[11px] text-stone-400">Recorded arrival delay</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-xs">
          <span className="text-xs text-sky-700 font-medium block">Excused</span>
          <span className="text-2xl font-bold text-sky-800 mt-1 block">
            {stats.excused}
          </span>
          <span className="text-[11px] text-stone-400">Granted with advance apology</span>
        </div>
      </div>

      {/* Chronological History List */}
      <Card title="Attendance History">
        {records.length > 0 ? (
          <div className="divide-y divide-stone-100">
            {records.map((r) => (
              <div key={r.id} className="py-3.5 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="gold" size="sm">
                      {r.event_type.replace('_', ' ')}
                    </Badge>
                    <h4 className="text-sm font-semibold text-stone-900">
                      {r.event_title}
                    </h4>
                  </div>
                  <p className="text-xs text-stone-500">
                    {formatDateTime(r.event_start_time, settings.timezone)}
                  </p>
                  {r.notes && (
                    <p className="text-xs text-stone-600 italic mt-0.5">
                      Note: {r.notes}
                    </p>
                  )}
                </div>

                <Badge
                  variant={
                    r.status === 'PRESENT'
                      ? 'success'
                      : r.status === 'LATE'
                      ? 'warning'
                      : r.status === 'EXCUSED'
                      ? 'info'
                      : 'danger'
                  }
                >
                  {r.status}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-stone-400 text-xs">
            No attendance records logged yet.
          </div>
        )}
      </Card>
    </div>
  );
}
