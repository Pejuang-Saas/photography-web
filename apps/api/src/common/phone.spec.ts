import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateBookingDto } from '../bookings/dto/booking.dto';
import { UpdateStudioSettingsDto } from '../studio/dto/studio.dto';
import { isIdMobile } from './phone';

describe('Indonesian mobile number', () => {
  it.each([
    '081234567890',
    '0811111111',
    '08123456789012',
    '6281234567890',
    '+6281234567890',
    '085712345678',
  ])('accepts %s', (value) => {
    expect(isIdMobile(value)).toBe(true);
  });

  it.each([
    ['letters', '0812abc34567'],
    ['spaces', '0812 3456 7890'],
    ['dashes', '0812-3456-7890'],
    ['too short', '08123456'],
    ['too long', '081234567890123'],
    ['landline', '0247654321'],
    ['not 08', '0712345678901'],
    ['operator digit 0', '0801234567890'],
    ['plus in the middle', '0812+34567890'],
    ['wrong country code', '+6581234567'],
    ['empty', ''],
  ])('rejects %s', (_label, value) => {
    expect(isIdMobile(value)).toBe(false);
  });
});

describe('phone validation on the DTOs', () => {
  const booking = {
    packageId: '7d0f3a8e-6b0a-4c64-8f0e-7f4f6e0a1b11',
    customerName: 'Customer',
    customerEmail: 'customer@example.com',
    sessionDate: '2026-11-01',
    timeSlot: '08:30 - 09:30',
    paymentPlan: 'FULL',
  };
  const errorsFor = async (customerPhone: string) =>
    (await validate(plainToInstance(CreateBookingDto, { ...booking, customerPhone }))).map(
      (error) => error.property,
    );

  it('lets a valid booking phone through and blocks junk the old length check let in', async () => {
    expect(await errorsFor('081234567890')).toEqual([]);
    expect(await errorsFor('abcdefghijkl')).toContain('customerPhone');
    expect(await errorsFor('0812 3456 7890')).toContain('customerPhone');
  });

  it('applies the same rule to the studio WhatsApp number, where blank means "clear it"', async () => {
    const check = async (whatsappNumber: string) =>
      (await validate(plainToInstance(UpdateStudioSettingsDto, { whatsappNumber }))).length;

    expect(await check('')).toBe(0);
    expect(await check('+6281234567890')).toBe(0);
    expect(await check('0812-3456-7890')).toBe(1);
    expect(await check('halo')).toBe(1);
  });
});
