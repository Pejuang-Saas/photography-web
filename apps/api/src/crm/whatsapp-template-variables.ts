/**
 * Placeholders that come from a booking. They share the email template registry, so the same
 * {customer_name}, {session_date} and so on work in both channels. A conversation whose number has
 * no booking cannot fill these, and sending such a template is refused rather than sent half empty.
 */
export const BOOKING_BOUND_VARIABLES: ReadonlySet<string> = new Set([
  'booking_code',
  'package_name',
  'session_date',
  'session_time',
  'payment_plan',
  'total_price',
  'paid_amount',
  'remaining_amount',
  'invoice_number',
  'invoice_url',
]);
