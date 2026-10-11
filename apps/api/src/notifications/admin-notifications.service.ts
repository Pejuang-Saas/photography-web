import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(limit = 30) {
    const take = Math.min(Math.max(Math.trunc(limit) || 30, 1), 100);
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ orderBy: { createdAt: 'desc' }, take }),
      this.prisma.notification.count({ where: { isRead: false } }),
    ]);
    return { items, unreadCount };
  }

  async markRead(id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id },
      data: { isRead: true },
    });
    if (result.count !== 1) throw new NotFoundException('Notification not found');
  }

  async markAllRead() {
    await this.prisma.notification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
  }
}
