'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { Meeting, ActionItem, SafeUser, UserRole, ActionItemStatus, MeetingType } from '@/lib/types';
import {
  createMeetingAction,
  createActionItemAction,
  updateActionItemStatusAction,
} from '@/lib/actions/meetings';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { formatDateOnly } from '@/lib/utils/timezone';
import {
  BookOpen,
  Plus,
  Lock,
  Globe,
  CheckCircle2,
  Clock,
  ListTodo,
  Search,
  UserCheck,
} from 'lucide-react';

interface MinutesClientProps {
  meetings: (Meeting & { action_items: ActionItem[] })[];
  actionItems: ActionItem[];
  members: SafeUser[];
  currentUserRole: UserRole;
  currentUserId: string;
  timezone: string;
}

export function MinutesClient({
  meetings,
  actionItems,
  members,
  currentUserRole,
  currentUserId,
  timezone,
}: MinutesClientProps) {
  const [activeTab, setActiveTab] = useState<'MINUTES' | 'ACTION_ITEMS'>('MINUTES');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewMeetingOpen, setIsNewMeetingOpen] = useState(false);
  const [isNewActionItemOpen, setIsNewActionItemOpen] = useState(false);
  const [selectedMeetingIdForAction, setSelectedMeetingIdForAction] = useState<string>('');

  const [meetingState, meetingAction] = useFormState(createMeetingAction, null);
  const [actionItemState, actionItemAction] = useFormState(createActionItemAction, null);

  const canManageMinutes =
    currentUserRole === 'ADMIN' || currentUserRole === 'GENERAL_SECRETARY';

  const isOfficer =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'PRESIDENT' ||
    currentUserRole === 'GENERAL_SECRETARY' ||
    currentUserRole === 'FINANCIAL_SECRETARY' ||
    currentUserRole === 'TREASURER';

  const filteredMeetings = meetings.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      m.title.toLowerCase().includes(term) ||
      m.minutes.toLowerCase().includes(term) ||
      (m.location && m.location.toLowerCase().includes(term))
    );
  });

  const filteredActionItems = actionItems.filter((a) => {
    const term = searchTerm.toLowerCase();
    return (
      a.title.toLowerCase().includes(term) ||
      (a.assigned_to_name && a.assigned_to_name.toLowerCase().includes(term))
    );
  });

  const handleUpdateStatus = async (id: string, newStatus: ActionItemStatus) => {
    await updateActionItemStatusAction(id, newStatus);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Meeting Minutes & Action Items
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Decisions, resolutions, and assigned deliverables from choir leadership meetings
          </p>
        </div>

        {canManageMinutes && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setIsNewMeetingOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Record Meeting Minutes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedMeetingIdForAction('');
                setIsNewActionItemOpen(true);
              }}
            >
              <ListTodo className="w-4 h-4 mr-1.5" />
              Assign Action Item
            </Button>
          </div>
        )}
      </div>

      {/* Tabs & Search */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('MINUTES')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'MINUTES'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Past Meetings ({meetings.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ACTION_ITEMS')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === 'ACTION_ITEMS'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Action Items ({actionItems.length})
          </button>
        </div>

        <div className="relative sm:w-72">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search discussions or tasks..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
          />
        </div>
      </div>

      {/* Content depending on Active Tab */}
      {activeTab === 'MINUTES' ? (
        filteredMeetings.length > 0 ? (
          <div className="space-y-4">
            {filteredMeetings.map((mtg) => (
              <div
                key={mtg.id}
                className="bg-white rounded-xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="gold">{mtg.meeting_type.replace('_', ' ')}</Badge>
                    {mtg.is_confidential === 1 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        <Lock className="w-3 h-3 text-amber-700" />
                        Executive Officers Only
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <Globe className="w-3 h-3 text-emerald-700" />
                        Choir-Wide Notice
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-stone-500 font-medium">
                    Date: {formatDateOnly(mtg.date, timezone)}
                    {mtg.location ? ` • ${mtg.location}` : ''}
                  </span>
                </div>

                <h3 className="text-base font-bold text-stone-900">{mtg.title}</h3>

                <div className="text-xs text-stone-700 leading-relaxed whitespace-pre-wrap bg-stone-50/60 p-4 rounded-xl border border-stone-200/70">
                  {mtg.minutes}
                </div>

                {/* Attached Action Items for this Meeting */}
                {mtg.action_items.length > 0 && (
                  <div className="pt-3 border-t border-stone-100">
                    <span className="text-xs font-semibold text-stone-900 block mb-2">
                      Resolutions & Action Items:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {mtg.action_items.map((act) => (
                        <div
                          key={act.id}
                          className="p-2.5 rounded-lg bg-stone-100/70 border border-stone-200 flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-semibold text-stone-900 block">
                              {act.title}
                            </span>
                            <span className="text-[11px] text-stone-500">
                              Assigned to: {act.assigned_to_name}
                            </span>
                            {act.due_date && (
                              <span className="block text-[10px] text-amber-800">
                                Due: {formatDateOnly(act.due_date, timezone)}
                              </span>
                            )}
                          </div>
                          <Badge
                            size="sm"
                            variant={
                              act.status === 'COMPLETED'
                                ? 'success'
                                : act.status === 'IN_PROGRESS'
                                ? 'info'
                                : 'warning'
                            }
                          >
                            {act.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-[11px] text-stone-400 pt-1">
                  Recorded in official secretariat register by {mtg.created_by_name}.
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-stone-200 text-stone-500 text-xs">
            No meeting records found.
          </div>
        )
      ) : (
        /* Action Items Tab */
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
          {filteredActionItems.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {filteredActionItems.map((act) => {
                const canEdit =
                  canManageMinutes ||
                  act.assigned_to === currentUserId ||
                  act.created_by === currentUserId;

                return (
                  <div
                    key={act.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          size="sm"
                          variant={
                            act.status === 'COMPLETED'
                              ? 'success'
                              : act.status === 'IN_PROGRESS'
                              ? 'info'
                              : act.status === 'CANCELLED'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {act.status.replace('_', ' ')}
                        </Badge>
                        <h4 className="text-sm font-semibold text-stone-900">
                          {act.title}
                        </h4>
                      </div>

                      {act.description && (
                        <p className="text-xs text-stone-600">{act.description}</p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-stone-500 pt-0.5">
                        <span>Assigned to: <strong className="text-stone-700">{act.assigned_to_name}</strong></span>
                        {act.due_date && (
                          <>
                            <span>•</span>
                            <span className="text-amber-800 font-medium">
                              Due: {formatDateOnly(act.due_date, timezone)}
                            </span>
                          </>
                        )}
                        {act.meeting_title && (
                          <>
                            <span>•</span>
                            <span className="italic">From: {act.meeting_title}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <select
                          value={act.status}
                          onChange={(e) =>
                            handleUpdateStatus(act.id, e.target.value as ActionItemStatus)
                          }
                          className="px-2.5 py-1 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 text-stone-700"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="CANCELLED">Cancelled</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-stone-400 text-xs">
              No action items found.
            </div>
          )}
        </div>
      )}

      {/* Record Minutes Modal */}
      <Modal
        isOpen={isNewMeetingOpen}
        onClose={() => setIsNewMeetingOpen(false)}
        title="Record Meeting Minutes"
        description="Preserve meeting resolutions, decisions, and officer deliberations."
      >
        <form
          action={async (formData) => {
            await meetingAction(formData);
            setIsNewMeetingOpen(false);
          }}
          className="space-y-4"
        >
          {meetingState?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {meetingState.error}
            </div>
          )}

          <Input label="Meeting Title *" name="title" required placeholder="e.g. Q4 Executive Leadership Planning" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Meeting Type
              </label>
              <select
                name="meetingType"
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="OFFICER_MEETING">Executive Officer Meeting</option>
                <option value="GENERAL_MEETING">General Choir Assembly</option>
                <option value="SECTIONAL">Sectional Leadership</option>
              </select>
            </div>

            <Input label="Meeting Date *" name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>

          <Input label="Location / Venue" name="location" placeholder="e.g. Conference Room B or Choir Vestry" />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Detailed Minutes & Decisions *
            </label>
            <textarea
              name="minutes"
              required
              rows={5}
              placeholder="Record agenda items, discussions, key motions passed, and summary decisions..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-800">
              <input
                type="checkbox"
                name="isConfidential"
                defaultChecked
                className="w-4 h-4 text-choir-800 rounded border-stone-300 focus:ring-choir-700"
              />
              <span>Confidential: Visible only to authorized executive officers</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsNewMeetingOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Minutes</Button>
          </div>
        </form>
      </Modal>

      {/* Assign Action Item Modal */}
      <Modal
        isOpen={isNewActionItemOpen}
        onClose={() => setIsNewActionItemOpen(false)}
        title="Assign Action Item"
        description="Assign a specific task or deliverable to a choir member or officer."
      >
        <form
          action={async (formData) => {
            await actionItemAction(formData);
            setIsNewActionItemOpen(false);
          }}
          className="space-y-4"
        >
          {actionItemState?.error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
              {actionItemState.error}
            </div>
          )}

          <Input label="Task Title *" name="title" required placeholder="e.g. Procure 40 music binders" />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Assign To *
            </label>
            <select
              name="assignedTo"
              required
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name} ({m.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Due Date" name="dueDate" type="date" />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Link to Meeting (Optional)
              </label>
              <select
                name="meetingId"
                defaultValue={selectedMeetingIdForAction}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="">Standalone Action Item</option>
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Description & Specifications
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Deliverable specifications, supplier details, or budget limits..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsNewActionItemOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Assign Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
