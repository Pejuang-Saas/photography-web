const WIB = 'Asia/Jakarta';

/** Calendar day in the studio's timezone, as YYYY-MM-DD, for comparing "today" and "yesterday". */
function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: WIB }).format(date);
}

function dayDiff(date: Date, now: Date) {
  const a = new Date(`${dayKey(date)}T00:00:00Z`).getTime();
  const b = new Date(`${dayKey(now)}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function formatClockWib(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: WIB,
  })
    .format(new Date(iso))
    .replace('.', ':');
}

/** Short time for the conversation list: the hour today, then "Kemarin", a weekday, or a date. */
export function formatListTime(iso: string | null, now: Date = new Date()) {
  if (!iso) return '';
  const date = new Date(iso);
  const diff = dayDiff(date, now);
  if (diff <= 0) return formatClockWib(iso);
  if (diff === 1) return 'Kemarin';
  if (diff < 7)
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long', timeZone: WIB }).format(date);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: WIB,
  }).format(date);
}

/** Heading above a run of messages from the same day. */
export function formatDayHeading(iso: string, now: Date = new Date()) {
  const date = new Date(iso);
  const diff = dayDiff(date, now);
  if (diff <= 0) return 'Hari ini';
  if (diff === 1) return 'Kemarin';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: WIB,
  }).format(date);
}

/** Whether two instants fall on different days in the studio's timezone. */
export function isNewDay(previousIso: string | undefined, iso: string) {
  return !previousIso || dayKey(new Date(previousIso)) !== dayKey(new Date(iso));
}

/** "23 jam 12 menit", or just minutes when under an hour. */
export function formatRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  if (hours <= 0) return `${Math.max(minutes, 0)} menit`;
  return `${hours} jam ${minutes % 60} menit`;
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}
