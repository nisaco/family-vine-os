'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { Announcement, AnnouncementAudience, UserRole } from '@/lib/types';
import { createAnnouncementAction, archiveAnnouncementAction } from '@/lib/actions/announcements';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDateOnly } from '@/lib/utils/timezone';
import { Bell, Plus, Pin, Archive, Users, Calendar } from 'lucide-react';

interface AnnouncementsClientProps {
  announcements: Announcement[];
  currentUserRole: UserRole;
  timezone: string;
}

export function AnnouncementsClient({
  announcements,
  currentUserRole,
  timezone,
}: AnnouncementsClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterAudience, setFilterAudience] = useState<string>('ALL');
  const [createState, createAction] = useFormState(createAnnouncementAction, null);

  const canManage =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'PRESIDENT' ||
    currentUserRole === 'GENERAL_SECRETARY';

  const filtered = announcements.filter((a) => {
    if (filterAudience !== 'ALL' && a.target_audience !== filterAudience) return false;
    return true;
  });

  const handleArchive = async (id: string, title: string) => {
    if (confirm(`Archive announcement "${title}"?`)) {
      await archiveAnnouncementAction(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Choir Announcements & Notices
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Official communications, rehearsal directions, and choir bulletins
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex-shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            New Announcement
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-xl border border-stone-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
          <button
            type="button"
            onClick={() => setFilterAudience('ALL')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterAudience === 'ALL'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            All Notices
          </button>
          <button
            type="button"
            onClick={() => setFilterAudience('OFFICERS')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterAudience === 'OFFICERS'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Officers
          </button>
          <button
            type="button"
            onClick={() => setFilterAudience('SOPRANO')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterAudience === 'SOPRANO'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Soprano
          </button>
          <button
            type="button"
            onClick={() => setFilterAudience('ALTO')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterAudience === 'ALTO'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Alto
          </button>
          <button
            type="button"
            onClick={() => setFilterAudience('TENOR')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterAudience === 'TENOR'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Tenor
          </button>
          <button
            type="button"
            onClick={() => setFilterAudience('BASS')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              filterAudience === 'BASS'
                ? 'bg-choir-800 text-white font-semibold'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            Bass
          </button>
        </div>
      </div>

      {/* Announcements List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white rounded-xl border p-5 sm:p-6 shadow-xs transition-all ${
                ann.is_pinned === 1
                  ? 'border-gold-300 bg-gold-50/20'
                  : 'border-stone-200/90'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {ann.is_pinned === 1 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gold-900 bg-gold-100 px-2 py-0.5 rounded border border-gold-200 uppercase">
                        <Pin className="w-3 h-3 text-gold-700" />
                        Pinned Notice
                      </span>
                    )}

                    <Badge
                      variant={
                        ann.target_audience === 'ALL'
                          ? 'default'
                          : ann.target_audience === 'OFFICERS'
                          ? 'gold'
                          : 'info'
                      }
                      size="sm"
                    >
                      Audience: {ann.target_audience}
                    </Badge>
                  </div>

                  <h3 className="text-base font-bold text-stone-900">
                    {ann.title}
                  </h3>

                  <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                    {ann.content}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3 text-[11px] text-stone-400">
                    <span>Published by {ann.author_name}</span>
                    <span>•</span>
                    <span>{formatDateOnly(ann.publish_at, timezone)}</span>
                    {ann.expires_at && (
                      <>
                        <span>•</span>
                        <span>Expires: {formatDateOnly(ann.expires_at, timezone)}</span>
                      </>
                    )}
                  </div>
                </div>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleArchive(ann.id, ann.title)}
                    title="Archive announcement"
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 text-stone-500">
          <Bell className="w-8 h-8 mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-medium">No announcements found for this section.</p>
        </div>
      )}

      {/* New Announcement Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Publish New Announcement"
        description="Broadcast official instructions or updates to choristers."
      >
        <form
          action={async (formData) => {
            await createAction(formData);
            setIsCreateOpen(false);
          }}
          className="space-y-4"
        >
          {createState?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {createState.error}
            </div>
          )}

          <Input label="Title *" name="title" required placeholder="e.g. Easter Cantata Robes Fitting" />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Target Audience
            </label>
            <select
              name="targetAudience"
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            >
              <option value="ALL">Entire Choir (All Choristers)</option>
              <option value="OFFICERS">Executive Officers Only</option>
              <option value="SOPRANO">Soprano Section Only</option>
              <option value="ALTO">Alto Section Only</option>
              <option value="TENOR">Tenor Section Only</option>
              <option value="BASS">Bass Section Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Message Content *
            </label>
            <textarea
              name="content"
              required
              rows={4}
              placeholder="Write detailed directions, rehearsal call times, or notices..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <Input label="Expiry Date (Optional)" name="expiresAt" type="date" />

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800">
                <input
                  type="checkbox"
                  name="isPinned"
                  className="w-4 h-4 text-choir-800 rounded border-stone-300 focus:ring-choir-700"
                />
                <span>Pin notice to top of dashboard</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Publish Notice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
