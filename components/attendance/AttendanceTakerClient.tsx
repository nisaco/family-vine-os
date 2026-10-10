'use client';

import React, { useState } from 'react';
import { ChoirEvent, SafeUser, AttendanceRecord, AttendanceStatus, UserRole } from '@/lib/types';
import { saveSingleAttendanceAction, correctAttendanceAction } from '@/lib/actions/attendance';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils/timezone';
import {
  CheckSquare,
  Search,
  Check,
  X,
  Clock,
  ShieldAlert,
  Edit2,
  Users,
  CheckCircle,
} from 'lucide-react';

interface AttendanceTakerClientProps {
  events: ChoirEvent[];
  members: SafeUser[];
  recordsByEvent: Record<string, AttendanceRecord[]>;
  initialEventId: string;
  timezone: string;
  currentUserRole: UserRole;
}

export function AttendanceTakerClient({
  events,
  members,
  recordsByEvent,
  initialEventId,
  timezone,
  currentUserRole,
}: AttendanceTakerClientProps) {
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [searchTerm, setSearchTerm] = useState('');
  const [voicePartFilter, setVoicePartFilter] = useState('ALL');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Correction state
  const [correctingRecord, setCorrectingRecord] = useState<AttendanceRecord | null>(null);
  const [correctionStatus, setCorrectionStatus] = useState<AttendanceStatus>('PRESENT');
  const [correctionReason, setCorrectionReason] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);

  const currentRecords = recordsByEvent[selectedEventId] || [];
  const recordsMap = new Map<string, AttendanceRecord>();
  for (const r of currentRecords) {
    recordsMap.set(r.user_id, r);
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];

  const filteredMembers = members.filter((m) => {
    if (m.status !== 'ACTIVE') return false;
    const matchesSearch =
      m.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.voice_part && m.voice_part.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesVoice =
      voicePartFilter === 'ALL' || m.voice_part === voicePartFilter;
    return matchesSearch && matchesVoice;
  });

  const handleSetStatus = async (userId: string, status: AttendanceStatus) => {
    setSavingUserId(userId);
    try {
      await saveSingleAttendanceAction(selectedEventId, userId, status);
      setSaveFeedback(`Saved ${status.toLowerCase()} for chorister.`);
      setTimeout(() => setSaveFeedback(null), 2500);
    } finally {
      setSavingUserId(null);
    }
  };

  const handleOpenCorrection = (record: AttendanceRecord) => {
    setCorrectingRecord(record);
    setCorrectionStatus(record.status);
    setCorrectionReason('');
    setIsCorrecting(true);
  };

  const handleSaveCorrection = async () => {
    if (!correctingRecord || !correctionReason.trim()) return;
    await correctAttendanceAction(
      correctingRecord.id,
      correctionStatus,
      correctionReason.trim()
    );
    setIsCorrecting(false);
    setCorrectingRecord(null);
  };

  // Stats for the current event
  const presentCount = currentRecords.filter((r) => r.status === 'PRESENT').length;
  const lateCount = currentRecords.filter((r) => r.status === 'LATE').length;
  const excusedCount = currentRecords.filter((r) => r.status === 'EXCUSED').length;
  const absentCount = currentRecords.filter((r) => r.status === 'ABSENT').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Take Rehearsal & Service Attendance
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Real-time roster attendance logging with audit trail protection
          </p>
        </div>

        {saveFeedback && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-lg animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{saveFeedback}</span>
          </div>
        )}
      </div>

      {/* Event Selector & Event Summary Card */}
      <Card>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
              Select Gathering to Record:
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full sm:max-w-md px-3.5 py-2.5 text-sm bg-stone-50 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 font-medium text-stone-900"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} — {formatDateTime(e.start_time, timezone, { dateStyle: 'short', timeStyle: 'short' })}
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-semibold text-stone-900 text-sm block">
                  {selectedEvent.title}
                </span>
                <span className="text-stone-500">
                  {formatDateTime(selectedEvent.start_time, timezone)} • {selectedEvent.location}
                </span>
              </div>

              {/* Attendance Counts Pill */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg font-semibold">
                  {presentCount} Present
                </span>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg font-semibold">
                  {lateCount} Late
                </span>
                <span className="px-2.5 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded-lg font-semibold">
                  {excusedCount} Excused
                </span>
                <span className="px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg font-semibold">
                  {absentCount} Absent
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Roster Controls: Search & Section Filter */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search chorister name..."
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
          />
        </div>

        <select
          value={voicePartFilter}
          onChange={(e) => setVoicePartFilter(e.target.value)}
          className="px-3 py-2 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 text-stone-700"
        >
          <option value="ALL">All Sections ({filteredMembers.length})</option>
          <option value="Soprano">Soprano</option>
          <option value="Alto">Alto</option>
          <option value="Tenor">Tenor</option>
          <option value="Bass">Bass</option>
          <option value="Musician">Musician</option>
        </select>
      </div>

      {/* Mobile-Friendly One-Tap Attendance Roster Table */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="divide-y divide-stone-100">
          {filteredMembers.map((member) => {
            const currentRecord = recordsMap.get(member.id);
            const status = currentRecord?.status;
            const isSaving = savingUserId === member.id;

            return (
              <div
                key={member.id}
                className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-choir-100 text-choir-900 font-semibold text-xs flex items-center justify-center flex-shrink-0">
                    {member.full_name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-stone-900">
                        {member.full_name}
                      </span>
                      {status && (
                        <Badge
                          size="sm"
                          variant={
                            status === 'PRESENT'
                              ? 'success'
                              : status === 'LATE'
                              ? 'warning'
                              : status === 'EXCUSED'
                              ? 'info'
                              : 'danger'
                          }
                        >
                          {status}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-stone-500">
                      {member.voice_part || 'General'}
                    </span>
                    {currentRecord?.notes && (
                      <span className="block text-[11px] text-stone-600 italic">
                        Note: {currentRecord.notes}
                      </span>
                    )}
                  </div>
                </div>

                {/* One-Tap Status Action Buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetStatus(member.id, 'PRESENT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      status === 'PRESENT'
                        ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600'
                        : 'bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 text-stone-700'
                    }`}
                  >
                    Present
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetStatus(member.id, 'LATE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      status === 'LATE'
                        ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600'
                        : 'bg-stone-100 hover:bg-amber-50 hover:text-amber-800 text-stone-700'
                    }`}
                  >
                    Late
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetStatus(member.id, 'EXCUSED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      status === 'EXCUSED'
                        ? 'bg-sky-600 text-white shadow-xs ring-2 ring-sky-600'
                        : 'bg-stone-100 hover:bg-sky-50 hover:text-sky-800 text-stone-700'
                    }`}
                  >
                    Excused
                  </button>

                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => handleSetStatus(member.id, 'ABSENT')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      status === 'ABSENT'
                        ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-600'
                        : 'bg-stone-100 hover:bg-rose-50 hover:text-rose-800 text-stone-700'
                    }`}
                  >
                    Absent
                  </button>

                  {currentRecord && (
                    <button
                      type="button"
                      onClick={() => handleOpenCorrection(currentRecord)}
                      title="Correct with audit explanation"
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Official Correction Modal (Requires reason for audit trail) */}
      {correctingRecord && (
        <Modal
          isOpen={isCorrecting}
          onClose={() => setIsCorrecting(false)}
          title="Correct Attendance Record"
          description="Corrections are immutably recorded in the system audit history."
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                New Status
              </label>
              <select
                value={correctionStatus}
                onChange={(e) => setCorrectionStatus(e.target.value as AttendanceStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="PRESENT">Present</option>
                <option value="LATE">Late</option>
                <option value="EXCUSED">Excused</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Mandatory Reason for Correction *
              </label>
              <textarea
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                required
                rows={3}
                placeholder="e.g. Chorister arrived late at 19:15; was initially marked absent in error..."
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setIsCorrecting(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCorrection} disabled={!correctionReason.trim()}>
                Save Correction & Audit
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
