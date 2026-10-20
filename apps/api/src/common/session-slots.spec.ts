import { findSlot, occupied, overlaps, parseSlotLabel, slotsForDuration } from './session-slots';

describe('session slots', () => {
  it('reads a label into clock minutes', () => {
    expect(parseSlotLabel('13:00 - 14:30')).toEqual({ start: 780, end: 870 });
    expect(parseSlotLabel('8:30-9:30')).toEqual({ start: 510, end: 570 });
    expect(parseSlotLabel('pagi')).toBeNull();
    expect(parseSlotLabel('10:00 - 09:00')).toBeNull();
  });

  it('offers a package only the slots of its own length', () => {
    expect(slotsForDuration(60).map((s) => s.label)).toEqual([
      '08:30 - 09:30',
      '09:30 - 10:30',
      '10:30 - 11:30',
    ]);
    expect(slotsForDuration(90).map((s) => s.label)).toEqual(['13:00 - 14:30', '15:00 - 16:30']);
  });

  it('falls back to slots that are long enough, then to all, for an unusual length', () => {
    expect(slotsForDuration(75).map((s) => s.label)).toEqual(['13:00 - 14:30', '15:00 - 16:30']);
    expect(slotsForDuration(240)).toHaveLength(5);
  });

  it('finds a slot however its label is spaced, and not one that does not exist', () => {
    expect(findSlot('13:00-14:30')?.label).toBe('13:00 - 14:30');
    expect(findSlot('14:00 - 15:00')).toBeUndefined();
  });

  it('stretches the occupied time by the add-ons and tells when two bookings collide', () => {
    const morning = occupied('08:30 - 09:30', 30)!;
    expect(morning).toEqual({ start: 510, end: 600 });
    expect(overlaps(morning, occupied('09:30 - 10:30', 0)!)).toBe(true);
    expect(overlaps(morning, occupied('10:30 - 11:30', 0)!)).toBe(false);
    // Back to back is fine: one ends as the next begins.
    expect(overlaps(occupied('08:30 - 09:30', 0)!, occupied('09:30 - 10:30', 0)!)).toBe(false);
  });
});
