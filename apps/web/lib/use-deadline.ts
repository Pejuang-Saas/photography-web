'use client';

import { useEffect, useState } from 'react';

/**
 * Milliseconds left until `deadline` (a local timestamp), ticking every second and clamped at 0.
 * The deadline is derived from server time at the moment the booking was created, so a wrong
 * clock on the visitor's device cannot make the countdown lie.
 */
export function useDeadline(deadline: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  return deadline === null ? null : Math.max(0, deadline - now);
}
