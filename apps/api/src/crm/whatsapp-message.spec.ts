import {
  bookingPlaceholdersIn,
  placeholdersIn,
  typingDelayMs,
  WINDOW_CLOSED_MESSAGE,
} from './whatsapp-message';

describe('typingDelayMs', () => {
  it('grows with the length of the message, within a floor and a ceiling', () => {
    expect(typingDelayMs('hi')).toBe(600);
    expect(typingDelayMs('x'.repeat(40))).toBe(1000);
    expect(typingDelayMs('x'.repeat(5000))).toBe(2500);
  });
});

describe('placeholdersIn', () => {
  it('lists each name once, in order', () => {
    expect(placeholdersIn('Halo {customer_name}, {booking_code} untuk {customer_name}')).toEqual([
      'customer_name',
      'booking_code',
    ]);
    expect(placeholdersIn('tanpa variabel')).toEqual([]);
  });
});

describe('bookingPlaceholdersIn', () => {
  it('picks out the ones that need a booking and leaves studio and name ones alone', () => {
    expect(
      bookingPlaceholdersIn(
        'Halo {customer_name} dari {studio_name}: {booking_code} {session_date}',
      ),
    ).toEqual(['booking_code', 'session_date']);
  });
});

describe('WINDOW_CLOSED_MESSAGE', () => {
  it('tells the admin what to do instead', () => {
    expect(WINDOW_CLOSED_MESSAGE).toContain('template');
  });
});
