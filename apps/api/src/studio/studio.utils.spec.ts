import { cleanGuarantees, normalizeInstagramHandle, normalizeWhatsappNumber } from './studio.utils';

describe('studio utils', () => {
  it.each([
    ['0812-3456-7890', '6281234567890'],
    ['+62 812 3456 7890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['(0274) 555-123', '62274555123'],
  ])('normalizes WhatsApp number %s', (input, expected) => {
    expect(normalizeWhatsappNumber(input)).toBe(expected);
  });

  it.each([
    ['@kayastory.id', 'kayastory.id'],
    ['kayastory.id', 'kayastory.id'],
    ['https://www.instagram.com/kayastory.id/', 'kayastory.id'],
    ['https://instagram.com/kayastory.id?igsh=abc', 'kayastory.id'],
  ])('normalizes Instagram handle %s', (input, expected) => {
    expect(normalizeInstagramHandle(input)).toBe(expected);
  });

  it('drops blank guarantee lines and trims the rest', () => {
    expect(cleanGuarantees(['  Garansi A ', '', '   ', 'Garansi B'])).toEqual([
      'Garansi A',
      'Garansi B',
    ]);
  });
});
