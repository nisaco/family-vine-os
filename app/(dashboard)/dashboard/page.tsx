import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import {
  getChoirSettings,
  getEvents,
  getUserAttendanceStats,
  getChoirAttendanceOverview,
  getFinancialSummary,
  getUserPaymentSummary,
  getAnnouncements,
  getActionItems,
  getAllMembers,
  getUserRsvpForEvent,
} from '@/lib/data';
import { formatCurrency } from '@/lib/utils/currency';
import { formatDateTime, formatDateOnly } from '@/lib/utils/timezone';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Calendar,
  CheckCircle2,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  MapPin,
  AlertCircle,
  FileText,
  ChevronRight,
  Music,
  Bell,
  Sparkles,
} from 'lucide-react';
import { RsvpButton } from '@/components/events/RsvpButton';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  const settings = getChoirSettings();
  const allEvents = getEvents();
  const upcomingEvents = allEvents.filter(
    (e) => e.status !== 'CANCELLED' && new Date(e.start_time) >= new Date(Date.now() - 3600000 * 2)
  );
  const nextEvent = upcomingEvents[0] || null;
  const nextEventUserRsvp = nextEvent ? getUserRsvpForEvent(nextEvent.id, user.id) : null;

  const announcements = getAnnouncements(user.role, user.voice_part).slice(0, 4);
  const myAttendance = getUserAttendanceStats(user.id);
  const myFinances = getUserPaymentSummary(user.id);

  // Leadership data
  const isOfficerOrAdmin =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'GENERAL_SECRETARY' ||
    user.role === 'FINANCIAL_SECRETARY' ||
    user.role === 'TREASURER';

  const canViewFinances =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'FINANCIAL_SECRETARY' ||
    user.role === 'TREASURER';

  const members = isOfficerOrAdmin ? getAllMembers(user.role, user.id) : [];
  const activeMembersCount = members.filter((m) => m.status === 'ACTIVE').length;
  const choirAttendance = isOfficerOrAdmin ? getChoirAttendanceOverview() : null;
  const financialSummary = canViewFinances ? getFinancialSummary() : null;
  const myActionItems = isOfficerOrAdmin ? getActionItems({ assignedTo: user.id, status: 'PENDING' }) : [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Header */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-200">
              {user.role.replace('_', ' ')}
            </span>
            {user.voice_part && (
              <span className="text-xs font-medium text-stone-500">
                • {user.voice_part} Section
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-serif text-stone-900 tracking-tight">
            Welcome back, {user.preferred_name || user.full_name}
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            {settings.motto || 'United in Harmony, Rooted in Grace'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/events">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-1.5" />
              View Schedule
            </Button>
          </Link>
          {canViewFinances && (
            <Link href="/finance">
              <Button variant="primary" size="sm">
                <DollarSign className="w-4 h-4 mr-1.5" />
                Choir Ledger
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Primary Row: Next Event Spotlight & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Next Event Spotlight (2 cols on large) */}
        <div className="lg:col-span-2">
          <Card
            title="Next Rehearsal or Service"
            subtitle="Immediate upcoming gathering for the choir"
            action={
              <Link
                href="/events"
                className="text-xs font-medium text-choir-800 hover:text-choir-950 inline-flex items-center gap-1"
              >
                All Events <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {nextEvent ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-xl bg-stone-50 border border-stone-200/80">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="gold">{nextEvent.event_type.replace('_', ' ')}</Badge>
                      <span className="text-xs text-stone-500">
                        {nextEvent.attending_count} choir members attending
                      </span>
                    </div>
                    <h4 className="text-lg font-semibold text-stone-900">
                      {nextEvent.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-600">
                      <span className="inline-flex items-center gap-1 font-medium text-stone-900">
                        <Clock className="w-3.5 h-3.5 text-choir-700" />
                        {formatDateTime(nextEvent.start_time, settings.timezone)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {nextEvent.location}
                      </span>
                    </div>
                    {nextEvent.description && (
                      <p className="text-xs text-stone-600 pt-1 leading-relaxed">
                        {nextEvent.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* RSVP Status / Action */}
                <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="text-xs">
                    <span className="text-stone-500">Your RSVP Status: </span>
                    {nextEventUserRsvp ? (
                      <Badge
                        variant={
                          nextEventUserRsvp.status === 'ATTENDING'
                            ? 'success'
                            : nextEventUserRsvp.status === 'NOT_ATTENDING'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {nextEventUserRsvp.status.replace('_', ' ')}
                      </Badge>
                    ) : (
                      <Badge variant="default">No RSVP Submitted</Badge>
                    )}
                    {nextEventUserRsvp?.apology_reason && (
                      <span className="block text-stone-500 text-[11px] mt-0.5 italic">
                        Note: &ldquo;{nextEventUserRsvp.apology_reason}&rdquo;
                      </span>
                    )}
                  </div>

                  <RsvpButton
                    eventId={nextEvent.id}
                    eventTitle={nextEvent.title}
                    currentStatus={nextEventUserRsvp?.status}
                    currentReason={nextEventUserRsvp?.apology_reason}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500">
                <Calendar className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-sm font-medium">No scheduled events on the calendar.</p>
                <p className="text-xs text-stone-400 mt-1">Check back soon for upcoming rehearsal notices.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Personal Key Indicators */}
        <div className="space-y-6">
          <Card title="My Choir Records">
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Attendance Rate</span>
                  <span className="text-xl font-bold text-stone-900">
                    {myAttendance.ratePercent}%
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    {myAttendance.present} present, {myAttendance.excused} excused
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div>
                  <span className="text-xs text-stone-500 block">Contributions Paid</span>
                  <span className="text-xl font-bold text-stone-900">
                    {formatCurrency(myFinances.totalPaidCents, settings.currency_symbol, settings.currency_code)}
                  </span>
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    {myFinances.payments.length} verified receipts issued
                  </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gold-100 text-gold-900 flex items-center justify-center font-semibold text-xs">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <Link
                  href="/my-attendance"
                  className="text-choir-800 hover:text-choir-950 font-medium hover:underline"
                >
                  View Attendance History →
                </Link>
                <Link
                  href="/my-finances"
                  className="text-choir-800 hover:text-choir-950 font-medium hover:underline"
                >
                  View Receipts →
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Leadership Section: Financial Summary & Choir Overview (Only visible to authorized roles) */}
      {isOfficerOrAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-stone-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-gold-600" />
              Administrative Overview
            </h2>
            <span className="text-xs text-stone-500">Live persisted ledger and attendance metrics</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Active Members */}
            <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-2">
                <span>Active Members</span>
                <Users className="w-4 h-4 text-stone-400" />
              </div>
              <div className="text-2xl font-bold text-stone-900">
                {activeMembersCount}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                {members.length} total registered accounts
              </p>
            </div>

            {/* Choir Attendance Average */}
            {choirAttendance && (
              <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
                <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-2">
                  <span>Average Attendance</span>
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-stone-900">
                  {choirAttendance.averageRatePercent}%
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Across {choirAttendance.totalEventsHeld} recorded gatherings
                </p>
              </div>
            )}

            {/* Financial Revenue (Authorized only) */}
            {canViewFinances && financialSummary && (
              <>
                <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-2">
                    <span>Total Income</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-700">
                    {formatCurrency(
                      financialSummary.totalIncomeCents,
                      settings.currency_symbol,
                      settings.currency_code
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Dues, offerings, & donations
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-2">
                    <span>Net Balance</span>
                    <TrendingUp className="w-4 h-4 text-choir-700" />
                  </div>
                  <div className="text-2xl font-bold text-stone-900">
                    {formatCurrency(
                      financialSummary.netBalanceCents,
                      settings.currency_symbol,
                      settings.currency_code
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Expenses: {formatCurrency(financialSummary.totalExpenseCents, settings.currency_symbol, settings.currency_code)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Row: Announcements & Assigned Action Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <Card
          title="Announcements & Notices"
          action={
            <Link
              href="/announcements"
              className="text-xs font-medium text-choir-800 hover:text-choir-950 inline-flex items-center gap-1"
            >
              All Notices <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {announcements.length > 0 ? (
            <div className="divide-y divide-stone-100">
              {announcements.map((ann) => (
                <div key={ann.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-stone-900">
                      {ann.title}
                    </h4>
                    {ann.is_pinned === 1 && (
                      <span className="text-[10px] uppercase font-bold text-gold-800 bg-gold-100 px-1.5 py-0.5 rounded">
                        Pinned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {ann.content}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
                    <span>By {ann.author_name}</span>
                    <span>•</span>
                    <span>{formatDateOnly(ann.publish_at, settings.timezone)}</span>
                    {ann.target_audience !== 'ALL' && (
                      <>
                        <span>•</span>
                        <Badge size="sm" variant="info">
                          {ann.target_audience}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-stone-400 text-xs">
              No recent announcements.
            </div>
          )}
        </Card>

        {/* Action Items / Tasks requiring attention */}
        <Card
          title={isOfficerOrAdmin ? 'My Assigned Action Items' : 'Choir Music Quick Links'}
          subtitle={
            isOfficerOrAdmin
              ? 'Pending deliverables from executive meetings'
              : 'Popular repertoire for upcoming services'
          }
          action={
            <Link
              href={isOfficerOrAdmin ? '/minutes' : '/songs'}
              className="text-xs font-medium text-choir-800 hover:text-choir-950 inline-flex items-center gap-1"
            >
              {isOfficerOrAdmin ? 'Minutes Archive' : 'Music Library'} <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {isOfficerOrAdmin ? (
            myActionItems.length > 0 ? (
              <div className="space-y-3">
                {myActionItems.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 flex items-start justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-semibold text-stone-900">
                        {act.title}
                      </h4>
                      {act.description && (
                        <p className="text-[11px] text-stone-600 mt-0.5">
                          {act.description}
                        </p>
                      )}
                      {act.due_date && (
                        <p className="text-[10px] text-amber-800 font-medium mt-1">
                          Due: {formatDateOnly(act.due_date, settings.timezone)}
                        </p>
                      )}
                    </div>
                    <Badge size="sm" variant="warning">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-stone-400 text-xs">
                No pending action items assigned to you.
              </div>
            )
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-stone-900">
                    Hallelujah Chorus (from Messiah)
                  </h4>
                  <p className="text-[11px] text-stone-500">G.F. Handel • SATB</p>
                </div>
                <Link href="/songs">
                  <Button size="sm" variant="outline">
                    Practice Tracks
                  </Button>
                </Link>
              </div>

              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-stone-900">
                    Great Is Thy Faithfulness
                  </h4>
                  <p className="text-[11px] text-stone-500">Jack Schrader arr. • SATB</p>
                </div>
                <Link href="/songs">
                  <Button size="sm" variant="outline">
                    Scores
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
