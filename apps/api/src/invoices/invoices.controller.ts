import { Controller, Get, Header, Param, ParseUUIDPipe, StreamableFile } from '@nestjs/common';
import { Public } from '../common/public.decorator';
import { InvoicePdfService } from './invoice-pdf.service';

@Controller()
export class InvoicesController {
  constructor(private readonly pdfs: InvoicePdfService) {}

  /**
   * Download link used in emails. The invoice id is an unguessable UUID, and the PDF carries only
   * the customer's name, the package and the amounts: no phone number or email address.
   */
  @Public()
  @Get('public/invoices/:id/pdf')
  @Header('Cache-Control', 'private, no-store')
  async pdf(@Param('id', ParseUUIDPipe) id: string) {
    const { filename, buffer } = await this.pdfs.render(id);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `inline; filename="${filename}"`,
      length: buffer.length,
    });
  }
}
