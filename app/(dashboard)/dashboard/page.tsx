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
  getTodayBirthdays,
  getUpcomingBirthdays,
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
  Cake,
  Award,
  Sparkles,
  Heart,
  Phone,
  Mail,
  MessageSquare,
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

  const announcements = getAnnouncements(user.role, user.voice_part, user.wing).slice(0, 4);
  const myAttendance = getUserAttendanceStats(user.id);
  const myFinances = getUserPaymentSummary(user.id);

  // Birthday & Welfare data
  const todayBirthdays = getTodayBirthdays();
  const upcomingBirthdays = getUpcomingBirthdays(14);
  const isMyBirthday = (() => {
    if (!user.birth_date) return false;
    const now = new Date();
    const localMm = String(now.getMonth() + 1).padStart(2, '0');
    const localDd = String(now.getDate()).padStart(2, '0');
    const localMmdd = `${localMm}-${localDd}`;

    const utcMm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const utcDd = String(now.getUTCDate()).padStart(2, '0');
    const utcMmdd = `${utcMm}-${utcDd}`;

    return user.birth_date.endsWith(localMmdd) || user.birth_date.endsWith(utcMmdd);
  })();

  const isMyCelebration = isMyBirthday || todayBirthdays.some((b) => b.id === user.id);
  const otherCelebrants = todayBirthdays.filter((b) => b.id !== user.id);

  // Leadership data
  const isOfficerOrAdmin =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'GENERAL_SECRETARY' ||
    user.role === 'FINANCIAL_SECRETARY' ||
    user.role === 'TREASURER' ||
    user.role === 'WELFARE_OFFICER';

  const canViewFinances =
    user.role === 'ADMIN' ||
    user.role === 'PRESIDENT' ||
    user.role === 'FINANCIAL_SECRETARY' ||
    user.role === 'TREASURER';

  const members = isOfficerOrAdmin ? getAllMembers(user.role, user.id) : [];
  const activeMembersCount = members.filter((m) => m.status === 'ACTIVE').length;
  const praiseCount = members.filter((m) => m.wing === 'Family of Praise' && m.status === 'ACTIVE').length;
  const asaphitesCount = members.filter((m) => m.wing === 'Asaphites' && m.status === 'ACTIVE').length;
  const vimmiesCount = members.filter((m) => m.wing === 'Vimmies' && m.status === 'ACTIVE').length;
  const choirAttendance = isOfficerOrAdmin ? getChoirAttendanceOverview() : null;
  const financialSummary = canViewFinances ? getFinancialSummary() : null;
  const myActionItems = isOfficerOrAdmin ? getActionItems({ assignedTo: user.id, status: 'PENDING' }) : [];

  return (
    <div className="space-y-6">
      {/* 1. Personalized Executive Citation Banner (Shown when the signed-in user is celebrating today) */}
      {isMyCelebration && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 text-white p-6 sm:p-8 border-2 border-amber-400/50 shadow-xl">
          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                  <Award className="w-4 h-4" />
                </div>
                <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase text-amber-300 bg-amber-950/90 px-2.5 py-1 rounded border border-amber-700/80">
                  Directorate of Welfare &amp; Member Care • Annual Executive Citation
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-amber-200/80 font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {new Date().toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {user.wing || 'Family Vine Ministry'}
                </span>
                <span className="text-stone-400">• {user.wing_role || user.voice_part || 'Faithful Member'}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold font-serif text-white tracking-tight">
                Happy Birthday, {user.preferred_name || user.full_name}!
              </h2>

              <p className="text-sm sm:text-base text-stone-200 font-serif italic leading-relaxed max-w-3xl pt-1">
                &ldquo;The entire Family Vine Choir—the Family of Praise, the Asaphites, and the Vimmies—stands together today to honor and celebrate you! We thank God for the blessing of your life, the excellence of your ministry, and your steadfast commitment in our midst. May the Lord bless you and keep you; may His countenance shine upon you and grant you peace. May this new year overflow with divine strength, health, abundant favor, and heavenly harmony. You are deeply cherished and loved by your choir family!&rdquo;
              </p>
            </div>

            <div className="pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="font-medium">
                  With prayerful love &amp; honor from the President, General Secretary, Welfare Officer, and Choir Directorate
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono text-stone-400">
                <span>Active in Fellowship since {user.join_date ? user.join_date.slice(0, 4) : '2023'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Choir-Wide Birthday Celebration Spotlight (Shown to EVERYONE when members celebrate today) */}
      {otherCelebrants.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-amber-300/90 bg-gradient-to-br from-amber-50/90 via-gold-50/50 to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/80 pb-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-300 flex items-center justify-center text-amber-800">
                <Cake className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded">
                  Choir Family Celebration • Today&apos;s Birthday Honors
                </span>
                <h2 className="text-base sm:text-lg font-bold font-serif text-stone-900 mt-0.5">
                  {otherCelebrants.length === 1
                    ? `Rejoicing with ${otherCelebrants[0].preferred_name || otherCelebrants[0].full_name} Today!`
                    : `Rejoicing with Our Birthday Celebrants Today!`}
                </h2>
              </div>
            </div>
            <span className="text-xs text-amber-900/80 font-medium">
              Directorate of Welfare &amp; Fellowship
            </span>
          </div>

          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed mb-5 max-w-3xl">
            Today is a blessed day in Family Vine! Join the entire fellowship in honoring our{' '}
            {otherCelebrants.map((c) => c.preferred_name || c.full_name).join(', ')}. Reach out with brotherly love, prayers, and words of appreciation for their faithful service to God and the ministry!
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {otherCelebrants.map((celebrant) => {
              const initials = celebrant.full_name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const cleanPhone = celebrant.phone ? celebrant.phone.replace(/[^0-9+]/g, '') : '';
              const whatsappUrl = cleanPhone
                ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                    `Happy Birthday, ${celebrant.preferred_name || celebrant.full_name}! Wishing you abundant grace, long life, and divine blessings from your Family Vine Choir family.`
                  )}`
                : null;

              return (
                <div
                  key={celebrant.id}
                  className="bg-white/95 rounded-xl border border-amber-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 border-2 border-amber-300 flex items-center justify-center font-bold font-serif text-amber-950 text-base shadow-xs flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-stone-900 truncate">
                          {celebrant.full_name}
                        </h3>
                        {celebrant.preferred_name && (
                          <span className="text-xs text-stone-500 italic">
                            (&ldquo;{celebrant.preferred_name}&rdquo;)
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded-full border text-[11px] ${
                            celebrant.wing === 'Family of Praise'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : celebrant.wing === 'Asaphites'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : celebrant.wing === 'Vimmies'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-stone-50 text-stone-700 border-stone-200'
                          }`}
                        >
                          {celebrant.wing || 'Family Vine'}
                        </span>
                        <span className="text-stone-500 font-medium">
                          • {celebrant.wing_role || celebrant.voice_part || 'Minister'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Fellowship Contact Actions */}
                  <div className="pt-3 border-t border-amber-100/90 flex flex-wrap items-center gap-2 text-xs">
                    {celebrant.phone && (
                      <a
                        href={`tel:${cleanPhone}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-medium transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-amber-400" />
                        Call {celebrant.preferred_name || 'Member'}
                      </a>
                    )}
                    {whatsappUrl && (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-medium transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-200" />
                        Send WhatsApp Blessing
                      </a>
                    )}
                    {celebrant.email && (
                      <a
                        href={`mailto:${celebrant.email}?subject=${encodeURIComponent(
                          'Happy Birthday from Family Vine Choir!'
                        )}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-700 font-medium transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5 text-stone-500" />
                        Email
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Banner / Welcome Header */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-semibold tracking-wider uppercase text-gold-700 bg-gold-50 px-2.5 py-0.5 rounded-full border border-gold-200">
              {user.role.replace('_', ' ')}
            </span>
            {user.wing && (
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                user.wing === 'Family of Praise'
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : user.wing === 'Asaphites'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : user.wing === 'Vimmies'
                  ? 'bg-purple-50 text-purple-800 border-purple-200'
                  : 'bg-stone-50 text-stone-700 border-stone-200'
              }`}>
                {user.wing}
              </span>
            )}
            {user.wing_role && (
              <span className="text-xs font-medium text-stone-500">
                • {user.wing_role}
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
                      {nextEvent.call_time && (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-700" />
                          Call Time: {nextEvent.call_time}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        {nextEvent.location}
                      </span>
                    </div>

                    {nextEvent.attire_notes && (
                      <div className="mt-2.5 p-3 rounded-lg bg-stone-100/90 border border-stone-200 flex flex-col sm:flex-row sm:items-baseline gap-2 text-xs">
                        <span className="font-semibold uppercase tracking-wider text-[10px] text-stone-700 bg-stone-200 px-2 py-0.5 rounded w-fit flex-shrink-0">
                          Program Attire
                        </span>
                        <span className="text-stone-800 font-medium leading-relaxed">
                          {nextEvent.attire_notes}
                        </span>
                      </div>
                    )}

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
            {/* Active Members & Wings */}
            <div className="bg-white p-5 rounded-xl border border-stone-200/80 shadow-xs">
              <div className="flex items-center justify-between text-stone-500 text-xs font-medium mb-1">
                <span>Active Members ({activeMembersCount})</span>
                <Users className="w-4 h-4 text-stone-400" />
              </div>
              <div className="flex flex-col gap-1 text-[11px] pt-1 text-stone-600">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-rose-800">Family of Praise:</span>
                  <span className="font-bold text-stone-900">{praiseCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-amber-800">Asaphites:</span>
                  <span className="font-bold text-stone-900">{asaphitesCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-purple-800">Vimmies:</span>
                  <span className="font-bold text-stone-900">{vimmiesCount}</span>
                </div>
              </div>
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

      {/* Welfare & Fellowship: Member Birthdays */}
      <Card
        title="Fellowship & Member Birthdays"
        subtitle="Directorate of Welfare and Member Care"
        action={
          <Link
            href="/directory"
            className="text-xs font-medium text-choir-800 hover:text-choir-950 inline-flex items-center gap-1"
          >
            Directory <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {todayBirthdays.length > 0 || upcomingBirthdays.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Celebrating Today */}
            <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded">
                  Celebrating Today
                </span>
                <span className="text-xs font-semibold text-amber-950 font-mono">
                  {todayBirthdays.length} {todayBirthdays.length === 1 ? 'Celebrant' : 'Celebrants'}
                </span>
              </div>
              {todayBirthdays.length > 0 ? (
                <div className="space-y-3 pt-1">
                  {todayBirthdays.map((b) => {
                    const initials = b.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    const cleanPhone = b.phone ? b.phone.replace(/[^0-9+]/g, '') : '';
                    const whatsappUrl = cleanPhone
                      ? `https://wa.me/${cleanPhone.replace('+', '')}?text=${encodeURIComponent(
                          `Happy Birthday, ${b.preferred_name || b.full_name}! Wishing you divine favor and peace from Family Vine Choir.`
                        )}`
                      : null;

                    return (
                      <div
                        key={b.id}
                        className="bg-white p-3 rounded-lg border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center font-bold text-amber-900 text-[11px] flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 block leading-tight">
                              {b.full_name}
                            </span>
                            <span className="text-stone-500 text-[11px]">
                              {b.wing || 'Member'} • {b.wing_role || b.voice_part || 'Minister'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          {b.phone && (
                            <a
                              href={`tel:${cleanPhone}`}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-stone-900 hover:bg-stone-800 text-white text-[11px] font-medium transition-colors"
                              title="Call Celebrant"
                            >
                              <Phone className="w-3 h-3 text-amber-300" />
                              <span>Call</span>
                            </a>
                          )}
                          {whatsappUrl && (
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-medium transition-colors"
                              title="Send WhatsApp Blessing"
                            >
                              <MessageSquare className="w-3 h-3 text-emerald-200" />
                              <span>WhatsApp</span>
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-amber-900/70 pt-1">
                  No active member birthdays today.
                </p>
              )}
            </div>

            {/* Upcoming Birthdays in Next 14 Days */}
            <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-700 bg-stone-200 px-2 py-0.5 rounded block w-fit">
                  Upcoming in Next 14 Days
                </span>
                <span className="text-[11px] text-stone-500 font-mono">
                  Welfare Planning
                </span>
              </div>
              {upcomingBirthdays.filter((ub) => ub.daysUntil > 0).length > 0 ? (
                <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto pt-1">
                  {upcomingBirthdays.filter((ub) => ub.daysUntil > 0).slice(0, 6).map((ub) => {
                    const initials = ub.user.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();

                    return (
                      <div key={ub.user.id} className="py-2 first:pt-0 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-stone-200 flex items-center justify-center font-semibold text-stone-700 text-[10px] flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <span className="font-semibold text-stone-900 block leading-tight">
                              {ub.user.full_name}
                            </span>
                            <span className="text-stone-500 text-[11px]">
                              {ub.user.wing || 'Member'} • {ub.birthMonthDay}
                            </span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-stone-700 bg-white border border-stone-200 px-2 py-0.5 rounded shadow-2xs font-medium">
                          in {ub.daysUntil} day{ub.daysUntil === 1 ? '' : 's'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-stone-500 pt-1">
                  No birthdays scheduled in the upcoming two-week period.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-stone-400 text-xs">
            No birthdays recorded in the immediate fellowship calendar.
          </div>
        )}
      </Card>
    </div>
  );
}
