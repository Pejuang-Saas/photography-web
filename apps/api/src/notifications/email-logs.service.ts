import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { EmailLogStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueuesService } from '../queues/queues.service';

export type EmailLogQuery = {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

const MAX_PAGE_SIZE = 100;

const LIST_FIELDS = {
  id: true,
  to: true,
  subject: true,
  templateCode: true,
  bookingId: true,
  status: true,
  attempts: true,
  error: true,
  sentAt: true,
  createdAt: true,
} satisfies Prisma.EmailLogSelect;

@Injectable()
export class EmailLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queues: QueuesService,
  ) {}

  async list(query: EmailLogQuery) {
    const pageSize = Math.min(Math.max(Math.trunc(query.pageSize) || 20, 1), MAX_PAGE_SIZE);
    const page = Math.max(Math.trunc(query.page) || 1, 1);
    const search = query.search?.trim();

    const where: Prisma.EmailLogWhereInput = {
      status: this.parseStatus(query.status),
      ...(search && {
        OR: [
          { to: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [items, total, counts] = await Promise.all([
      this.prisma.emailLog.findMany({
        where,
        select: LIST_FIELDS,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      // Whole-table totals for the filter chips, independent of the current filter and search.
      counts: Object.fromEntries(
        Object.values(EmailLogStatus).map((status) => [
          status,
          counts.find((row) => row.status === status)?._count._all ?? 0,
        ]),
      ),
    };
  }

  async get(id: string) {
    const log = await this.prisma.emailLog.findUnique({
      where: { id },
      select: { ...LIST_FIELDS, text: true, html: true },
    });
    if (!log) throw new NotFoundException('Email log not found');
    return log;
  }

  /** Puts a failed email back on the queue. The stored message is sent as it was written. */
  async resend(id: string) {
    const claimed = await this.prisma.emailLog.updateMany({
      where: { id, status: EmailLogStatus.FAILED },
      data: { status: EmailLogStatus.QUEUED, error: null, attempts: 0 },
    });
    if (claimed.count !== 1) {
      const exists = await this.prisma.emailLog.findUnique({ where: { id }, select: { id: true } });
      if (!exists) throw new NotFoundException('Email log not found');
      throw new ConflictException('Hanya email yang gagal terkirim yang bisa dikirim ulang');
    }
    await this.queues.scheduleEmail(id, { resend: true });
    return this.get(id);
  }

  private parseStatus(status?: string) {
    if (!status) return undefined;
    const value = status.toUpperCase();
    return Object.values(EmailLogStatus).find((known) => known === value);
  }
}
