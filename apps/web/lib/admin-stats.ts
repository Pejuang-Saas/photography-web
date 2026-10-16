import type { AdminBooking } from './admin-api';
import { PAID_PAYMENT_STATUSES } from './booking-status';

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function paidAmount(booking: AdminBooking) {
  return booking.payments
    .filter((p) => PAID_PAYMENT_STATUSES.has(p.status))
    .reduce((sum, p) => sum + p.amount, 0);
}

export function currentMonthKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })
    .format(new Date())
    .slice(0, 7);
}

function shiftMonth(key: string, delta: number) {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Bookings that were created and revenue that was actually paid, per month. */
export function monthlyTrend(bookings: AdminBooking[], months = 6) {
  const end = currentMonthKey();
  const keys = Array.from({ length: months }, (_, i) => shiftMonth(end, i - (months - 1)));
  const rows = new Map(keys.map((key) => [key, { bookings: 0, revenue: 0 }]));

  for (const booking of bookings) {
    const created = rows.get(monthKey(booking.createdAt));
    if (created) created.bookings += 1;
    for (const payment of booking.payments) {
      if (!PAID_PAYMENT_STATUSES.has(payment.status)) continue;
      const paid = rows.get(monthKey(payment.paidAt ?? payment.createdAt));
      if (paid) paid.revenue += payment.amount;
    }
  }

  return keys.map((key) => ({
    key,
    month: MONTH_LABELS[Number(key.slice(5)) - 1],
    ...rows.get(key)!,
  }));
}

export function percentChange(current: number, previous: number) {
  if (previous <= 0) return null;
  const value = ((current - previous) / previous) * 100;
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function monthSummary(bookings: AdminBooking[]) {
  const trend = monthlyTrend(bookings, 2);
  const [previous, current] = trend;
  return {
    revenue: current.revenue,
    bookings: current.bookings,
    revenueChange: percentChange(current.revenue, previous.revenue),
    bookingsChange: percentChange(current.bookings, previous.bookings),
  };
}

/** Sessions per package, counting only bookings that are still alive or completed. */
export function packageBreakdown(bookings: AdminBooking[]) {
  const counts = new Map<string, number>();
  for (const booking of bookings) {
    if (['REJECTED', 'EXPIRED', 'CANCELLED'].includes(booking.status)) continue;
    counts.set(booking.packageName, (counts.get(booking.packageName) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export { paidAmount };
