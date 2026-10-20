import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateServicePackageDto } from './package.dto';

const read = async (plain: Record<string, unknown>) => {
  const dto = plainToInstance(UpdateServicePackageDto, plain);
  return { dto, errors: await validate(dto, { whitelist: true, forbidNonWhitelisted: true }) };
};

describe('package attributes', () => {
  it('keeps null as null, so an edit can take a promise back', async () => {
    const { dto, errors } = await read({ editedPhotos: null, bonusPriorityEdits: null });

    expect(errors).toEqual([]);
    expect(dto.editedPhotos).toBeNull();
    expect(dto.bonusPriorityEdits).toBeNull();
  });

  it('reads numbers sent as text and keeps the terms as sentences', async () => {
    const { dto, errors } = await read({
      editedPhotos: '25',
      lateToleranceMinutes: 10,
      terms: ['Toleransi keterlambatan maksimal 10 menit.'],
    });

    expect(errors).toEqual([]);
    expect(dto.editedPhotos).toBe(25);
    expect(dto.terms).toEqual(['Toleransi keterlambatan maksimal 10 menit.']);
  });

  it('refuses a negative or fractional number', async () => {
    expect((await read({ maxSpots: -1 })).errors).not.toEqual([]);
    expect((await read({ driveActiveDays: 1.5 })).errors).not.toEqual([]);
  });
});
