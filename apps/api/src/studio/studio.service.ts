import { Injectable } from '@nestjs/common';
import { Prisma, StudioSetting } from '@prisma/client';
import { revalidateWeb } from '../common/revalidate-web';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStudioSettingsDto } from './dto/studio.dto';
import { cleanGuarantees, normalizeInstagramHandle, normalizeWhatsappNumber } from './studio.utils';

export const DEFAULT_GUARANTEES = [
  '100% Garansi Slot Jadwal Terkunci',
  'Bebas Reschedule / Ganti Jadwal (maksimal H-3 sesi)',
  'Garansi Uang Kembali jika sesi dibatalkan oleh pihak studio',
];

const DEFAULTS = {
  id: 'default',
  studioName: 'Kayastory Photography',
  address: 'Jl. Tirto Agung No. 12, Tembalang, Semarang',
  instagramHandle: 'kayastory.id',
  city: 'Semarang',
  region: 'Jawa Tengah',
  openTime: '08:00',
  closeTime: '21:00',
  guarantees: DEFAULT_GUARANTEES,
};

function guaranteeList(value: Prisma.JsonValue | null): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

@Injectable()
export class StudioService {
  constructor(private readonly prisma: PrismaService) {}

  /** Reads the single settings row, creating it with defaults on first use (reads stay write-free after that). */
  async getCurrent(): Promise<StudioSetting> {
    const existing = await this.prisma.studioSetting.findUnique({ where: { id: 'default' } });
    if (existing) return existing;
    try {
      return await this.prisma.studioSetting.create({ data: DEFAULTS });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.prisma.studioSetting.findUniqueOrThrow({ where: { id: 'default' } });
      }
      throw error;
    }
  }

  private toView(settings: StudioSetting) {
    return {
      studioName: settings.studioName,
      whatsappNumber: settings.whatsappNumber,
      address: settings.address,
      mapsUrl: settings.mapsUrl,
      instagramHandle: settings.instagramHandle,
      city: settings.city,
      region: settings.region,
      openTime: settings.openTime,
      closeTime: settings.closeTime,
      instagramUrl: settings.instagramHandle
        ? `https://instagram.com/${settings.instagramHandle}`
        : null,
      guarantees: guaranteeList(settings.guarantees),
      // The general conditions every package is booked under, shown at checkout.
      reservationTerms: guaranteeList(settings.reservationTerms),
    };
  }

  async getPublic() {
    return this.toView(await this.getCurrent());
  }

  async getAdmin() {
    const settings = await this.getCurrent();
    return { ...this.toView(settings), updatedAt: settings.updatedAt };
  }

  async update(dto: UpdateStudioSettingsDto) {
    await this.getCurrent();
    const blankToNull = (value: string | undefined, normalize = (v: string) => v.trim()) =>
      value === undefined ? undefined : normalize(value) || null;

    const data: Prisma.StudioSettingUpdateInput = {
      whatsappNumber: blankToNull(dto.whatsappNumber, normalizeWhatsappNumber),
      address: blankToNull(dto.address),
      mapsUrl: blankToNull(dto.mapsUrl),
      instagramHandle: blankToNull(dto.instagramHandle, normalizeInstagramHandle),
      city: blankToNull(dto.city),
      region: blankToNull(dto.region),
      openTime: blankToNull(dto.openTime),
      closeTime: blankToNull(dto.closeTime),
    };
    if (dto.studioName !== undefined && dto.studioName.trim()) {
      data.studioName = dto.studioName.trim();
    }
    if (dto.guarantees !== undefined) data.guarantees = cleanGuarantees(dto.guarantees);
    if (dto.reservationTerms !== undefined) {
      data.reservationTerms = cleanGuarantees(dto.reservationTerms);
    }

    await this.prisma.studioSetting.update({ where: { id: 'default' }, data });
    void revalidateWeb();
    return this.getAdmin();
  }
}
