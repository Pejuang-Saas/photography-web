import { Module } from '@nestjs/common';
import { StudioModule } from '../studio/studio.module';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesController } from './invoices.controller';

@Module({
  imports: [StudioModule],
  controllers: [InvoicesController],
  providers: [InvoicePdfService],
  exports: [InvoicePdfService],
})
export class InvoicesModule {}
