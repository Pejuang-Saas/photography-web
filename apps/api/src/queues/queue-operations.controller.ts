import { Controller, Get } from '@nestjs/common';
import { Roles } from '@thallesp/nestjs-better-auth';
import { QueuesService } from './queues.service';

@Roles(['admin'])
@Controller('admin/operations/queues')
export class QueueOperationsController {
  constructor(private readonly queues: QueuesService) {}

  @Get()
  getQueues() {
    return this.queues.getOperationalSnapshot();
  }
}
