'use client';

import React, { useState } from 'react';
import { useFormState } from 'react-dom';
import { ChoirEvent, EventRsvp, UserRole, EventType } from '@/lib/types';
import { createEventAction, cancelEventAction } from '@/lib/actions/events';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { RsvpButton } from './RsvpButton';
import { formatDateTime, formatDateOnly } from '@/lib/utils/timezone';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Plus,
  Users,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface EventsClientProps {
  events: (ChoirEvent & { attending_count: number; not_attending_count: number })[];
  userRsvps: Record<string, EventRsvp>;
  allRsvpsByEvent: Record<string, EventRsvp[]>;
  currentUserRole: UserRole;
  timezone: string;
}

export function EventsClient({
  events,
  userRsvps,
  allRsvpsByEvent,
  currentUserRole,
  timezone,
}: EventsClientProps) {
  const [viewMode, setViewMode] = useState<'UPCOMING' | 'PAST' | 'ALL'>('UPCOMING');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEventRoster, setSelectedEventRoster] = useState<string | null>(null);

  const [createState, createAction] = useFormState(createEventAction, null);

  const canManageEvents =
    currentUserRole === 'ADMIN' ||
    currentUserRole === 'PRESIDENT' ||
    currentUserRole === 'GENERAL_SECRETARY';

  const now = new Date();

  const filteredEvents = events.filter((e) => {
    const eventDate = new Date(e.start_time);
    const isPast = eventDate < now;

    if (viewMode === 'UPCOMING' && isPast && e.status !== 'CANCELLED') return false;
    if (viewMode === 'PAST' && !isPast) return false;

    if (selectedType !== 'ALL' && e.event_type !== selectedType) return false;

    return true;
  });

  const handleCancel = async (eventId: string, title: string) => {
    if (confirm(`Are you sure you want to cancel "${title}"? This cannot be undone.`)) {
      await cancelEventAction(eventId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Create Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900 tracking-tight">
            Choir Events & Rehearsals
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Schedules formatted in choir timezone ({timezone})
          </p>
        </div>

        {canManageEvents && (
          <Button onClick={() => setIsCreateOpen(true)} className="flex-shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Schedule Event
          </Button>
        )}
      </div>

      {/* Filter and View Tabs */}
      <div className="bg-white p-3.5 rounded-xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode('UPCOMING')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'UPCOMING'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Upcoming
          </button>
          <button
            type="button"
            onClick={() => setViewMode('PAST')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'PAST'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Past Gatherings
          </button>
          <button
            type="button"
            onClick={() => setViewMode('ALL')}
            className={`px-3 py-1.5 rounded-md transition-all ${
              viewMode === 'ALL'
                ? 'bg-white text-stone-900 font-semibold shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700 text-stone-700"
          >
            <option value="ALL">All Event Types</option>
            <option value="REHEARSAL">Rehearsals</option>
            <option value="SERVICE">Sunday Services</option>
            <option value="CONCERT">Concerts & Performances</option>
            <option value="OFFICER_MEETING">Officer Meetings</option>
            <option value="GENERAL_MEETING">General Meetings</option>
          </select>
        </div>
      </div>

      {/* Events List */}
      {filteredEvents.length > 0 ? (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const userRsvp = userRsvps[event.id];
            const isCancelled = event.status === 'CANCELLED';
            const roster = allRsvpsByEvent[event.id] || [];

            return (
              <div
                key={event.id}
                className={`bg-white rounded-xl border p-5 sm:p-6 shadow-xs transition-all ${
                  isCancelled
                    ? 'border-rose-200 bg-rose-50/30 opacity-75'
                    : 'border-stone-200/90 hover:border-choir-200'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Event Details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          isCancelled
                            ? 'danger'
                            : event.event_type === 'REHEARSAL'
                            ? 'default'
                            : event.event_type === 'SERVICE'
                            ? 'gold'
                            : event.event_type === 'CONCERT'
                            ? 'purple'
                            : 'info'
                        }
                      >
                        {isCancelled ? 'CANCELLED' : event.event_type.replace('_', ' ')}
                      </Badge>

                      <span className="text-xs text-stone-500 font-medium">
                        {event.attending_count} Confirmed Attending
                      </span>
                    </div>

                    <h3 className={`text-lg font-bold ${isCancelled ? 'line-through text-stone-500' : 'text-stone-900'}`}>
                      {event.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-y-1.5 gap-x-5 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1.5 font-medium text-stone-900">
                        <Clock className="w-3.5 h-3.5 text-choir-700" />
                        {formatDateTime(event.start_time, timezone)}
                        {event.end_time && ` - ${formatDateTime(event.end_time, timezone, { timeStyle: 'short' })}`}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {event.location}
                      </span>
                    </div>

                    {event.description && (
                      <p className="text-xs text-stone-600 pt-1 leading-relaxed max-w-3xl">
                        {event.description}
                      </p>
                    )}
                  </div>

                  {/* Actions & RSVP Status */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                    {!isCancelled && (
                      <div className="flex items-center gap-2">
                        {userRsvp && (
                          <div className="text-right">
                            <span className="text-[11px] text-stone-500 block">Your RSVP:</span>
                            <Badge
                              variant={
                                userRsvp.status === 'ATTENDING'
                                  ? 'success'
                                  : userRsvp.status === 'NOT_ATTENDING'
                                  ? 'danger'
                                  : 'warning'
                              }
                            >
                              {userRsvp.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        )}

                        <RsvpButton
                          eventId={event.id}
                          eventTitle={event.title}
                          currentStatus={userRsvp?.status}
                          currentReason={userRsvp?.apology_reason}
                        />
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs">
                      {canManageEvents && (
                        <button
                          type="button"
                          onClick={() => setSelectedEventRoster(event.id)}
                          className="text-stone-600 hover:text-stone-900 font-medium inline-flex items-center gap-1 hover:underline"
                        >
                          <Users className="w-3.5 h-3.5" />
                          View Roster ({roster.length})
                        </button>
                      )}

                      {canManageEvents && !isCancelled && (
                        <button
                          type="button"
                          onClick={() => handleCancel(event.id, event.title)}
                          className="text-rose-600 hover:text-rose-800 font-medium hover:underline ml-2"
                        >
                          Cancel Event
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-stone-200 text-stone-500">
          <CalendarIcon className="w-10 h-10 mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-medium">No events found matching your criteria.</p>
        </div>
      )}

      {/* Schedule Event Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Schedule Choir Event"
        description="Add a rehearsal, Sunday service ministration, or choir meeting."
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

          <Input label="Event Title" name="title" required placeholder="e.g. Wednesday Voice Blend Rehearsal" />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
                Event Type
              </label>
              <select
                name="eventType"
                required
                className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
              >
                <option value="REHEARSAL">Rehearsal</option>
                <option value="SERVICE">Sunday Worship Service</option>
                <option value="CONCERT">Concert / Performance</option>
                <option value="OFFICER_MEETING">Officer Meeting</option>
                <option value="GENERAL_MEETING">General Meeting</option>
                <option value="SPECIAL">Special Event</option>
              </select>
            </div>

            <Input
              label="Location / Venue"
              name="location"
              required
              placeholder="e.g. Main Sanctuary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date & Time"
              name="startTime"
              type="datetime-local"
              required
            />
            <Input
              label="End Date & Time (Optional)"
              name="endTime"
              type="datetime-local"
            />
          </div>

          <Input
            label="RSVP Deadline (Optional)"
            name="rsvpDeadline"
            type="datetime-local"
            helperText="Suggested cutoff time for choristers to submit apologies."
          />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1">
              Description & Rehearsal Notes
            </label>
            <textarea
              name="description"
              rows={3}
              placeholder="Pieces to be covered, dress code expectations, or call times..."
              className="w-full px-3 py-2 text-sm bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-choir-700"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Publish Event</Button>
          </div>
        </form>
      </Modal>

      {/* Attendee Roster Modal */}
      {selectedEventRoster && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedEventRoster(null)}
          title="Event RSVP Roster"
          description="Members who have submitted attendance confirmation or apologies."
          maxWidth="lg"
        >
          {(() => {
            const roster = allRsvpsByEvent[selectedEventRoster] || [];
            const attending = roster.filter((r) => r.status === 'ATTENDING');
            const notAttending = roster.filter((r) => r.status === 'NOT_ATTENDING');
            const maybe = roster.filter((r) => r.status === 'MAYBE');

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <span className="font-bold text-lg text-emerald-900 block">
                      {attending.length}
                    </span>
                    <span className="text-emerald-700 font-medium">Attending</span>
                  </div>
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <span className="font-bold text-lg text-rose-900 block">
                      {notAttending.length}
                    </span>
                    <span className="text-rose-700 font-medium">Cannot Attend</span>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="font-bold text-lg text-amber-900 block">
                      {maybe.length}
                    </span>
                    <span className="text-amber-700 font-medium">Tentative</span>
                  </div>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl">
                  {roster.length > 0 ? (
                    roster.map((r) => (
                      <div key={r.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                        <div>
                          <span className="font-semibold text-stone-900 block">
                            {r.user_name}
                          </span>
                          <span className="text-stone-500 text-[11px]">
                            {r.voice_part || 'General'}
                          </span>
                          {r.apology_reason && (
                            <p className="text-[11px] text-stone-600 mt-1 italic">
                              Note: &ldquo;{r.apology_reason}&rdquo;
                            </p>
                          )}
                        </div>
                        <Badge
                          size="sm"
                          variant={
                            r.status === 'ATTENDING'
                              ? 'success'
                              : r.status === 'NOT_ATTENDING'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {r.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-stone-400 text-xs">
                      No RSVPs recorded yet for this gathering.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="secondary" onClick={() => setSelectedEventRoster(null)}>
                    Close
                  </Button>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}
    </div>
  );
}
