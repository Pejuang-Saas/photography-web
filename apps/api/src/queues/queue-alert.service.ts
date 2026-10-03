import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { logStructured } from '../common/structured-log';
import { QueuesService } from './queues.service';

@Injectable()
export class QueueAlertService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueAlertService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly queues: QueuesService) {}

  onModuleInit() {
    const intervalSeconds = this.positiveInteger('QUEUE_ALERT_INTERVAL_SECONDS', 60);
    this.timer = setInterval(() => void this.check(), intervalSeconds * 1_000);
    this.timer.unref();
    void this.check();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async check() {
    try {
      const health = await this.queues.getHealth();
      const threshold = this.positiveInteger('QUEUE_FAILED_ALERT_THRESHOLD', 1);
      for (const [queue, counts] of Object.entries(health)) {
        if (counts.failed >= threshold) {
          logStructured(this.logger, 'warn', 'queue_failed_jobs_threshold', {
            queue,
            failed: counts.failed,
            threshold,
          });
        }
      }
    } catch (error) {
      logStructured(this.logger, 'error', 'queue_health_check_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private positiveInteger(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isSafeInteger(value) && value > 0 ? value : fallback;
  }
}
