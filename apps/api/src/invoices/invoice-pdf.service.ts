import { Injectable, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentStatus } from '@prisma/client';
// pdfkit is a CommonJS module with no default export, and this project compiles without
// esModuleInterop, so a default import would be undefined at runtime.
import PDFDocument = require('pdfkit');
import { studioLogo } from '../common/logo';
import { PrismaService } from '../prisma/prisma.service';
import { StudioService } from '../studio/studio.service';

const INK = '#111111';
const MUTED = '#71717a';
const LINE = '#e4e4e7';
const AMBER = '#d9a521';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const longDate = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const issueDate = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
});

/** File names go into a header, so keep them to plain characters. */
export function safeFilename(invoiceNumber: string) {
  return `${invoiceNumber.replace(/[^A-Za-z0-9._-]+/g, '-')}.pdf`;
}

@Injectable()
export class InvoicePdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly studio: StudioService,
  ) {}

  /** Builds the invoice PDF on request, so it always reflects the current studio profile. */
  async render(invoiceId: string): Promise<{ filename: string; buffer: Buffer }> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        booking: {
          include: {
            addOns: { orderBy: { createdAt: 'asc' } },
            payments: {
              where: { status: { in: [PaymentStatus.PAID_DP, PaymentStatus.PAID_FULL] } },
            },
          },
        },
      },
    });
    // A voided invoice is no longer a valid document, so it is not served either.
    if (!invoice || invoice.status === InvoiceStatus.VOID) {
      throw new NotFoundException('Invoice not found');
    }

    const { booking } = invoice;
    const studio = await this.studio.getCurrent();
    const paid = booking.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, booking.totalAmount - paid);
    const settled = remaining === 0;
    const plan = booking.paymentPlan === 'FULL' ? 'Bayar Lunas' : 'DP 50%';

    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: { Title: `Invoice ${invoice.invoiceNumber}`, Author: studio.studioName },
      // Uncompressed streams keep the text readable to tests; real documents are compressed.
      compress: process.env.NODE_ENV !== 'test',
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const finished = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks))),
    );

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    // --- Letterhead ---
    const logo = studioLogo();
    if (logo) doc.image(logo, left, 44, { width: 56, height: 56 });
    const textLeft = logo ? left + 70 : left;
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .fillColor(INK)
      .text(studio.studioName, textLeft, 46, {
        width: width * 0.55,
      });
    doc.font('Helvetica').fontSize(9).fillColor(MUTED);
    const contactLines = [
      studio.address,
      studio.whatsappNumber && `WhatsApp ${studio.whatsappNumber}`,
      studio.instagramHandle && `@${studio.instagramHandle}`,
    ].filter(Boolean) as string[];
    for (const line of contactLines) doc.text(line, textLeft, doc.y + 1, { width: width * 0.55 });

    doc.font('Helvetica-Bold').fontSize(24).fillColor(AMBER).text('INVOICE', left, 46, {
      width,
      align: 'right',
    });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(invoice.invoiceNumber, left, 76, {
      width,
      align: 'right',
    });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Diterbitkan ${issueDate.format(invoice.issuedAt)}`, left, 90, {
        width,
        align: 'right',
      });

    const ruleY = 118;
    doc.moveTo(left, ruleY).lineTo(right, ruleY).lineWidth(2).strokeColor(AMBER).stroke();

    // --- Customer and session ---
    const blockY = 142;
    const half = width / 2 - 12;
    const block = (title: string, rows: Array<[string, string]>, x: number) => {
      doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text(title.toUpperCase(), x, blockY, {
        width: half,
      });
      let y = blockY + 16;
      for (const [label, value] of rows) {
        doc.font('Helvetica').fontSize(9).fillColor(MUTED).text(label, x, y, { width: 80 });
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(INK)
          .text(value, x + 84, y - 1, {
            width: half - 84,
          });
        y = Math.max(doc.y, y + 16) + 4;
      }
    };
    block(
      'Ditagihkan kepada',
      [
        ['Nama', booking.customerName],
        ['Kode booking', booking.bookingCode],
      ],
      left,
    );
    block(
      'Detail sesi foto',
      [
        ['Tanggal', longDate.format(booking.sessionDate)],
        [
          'Jam',
          booking.extraMinutes > 0
            ? `${booking.timeSlot} WIB (+${booking.extraMinutes} menit)`
            : `${booking.timeSlot} WIB`,
        ],
      ],
      left + width / 2 + 12,
    );

    // --- Line items ---
    const tableY = 238;
    doc.rect(left, tableY, width, 26).fillColor('#f4f4f5').fill();
    doc.font('Helvetica-Bold').fontSize(9).fillColor(MUTED);
    doc.text('DESKRIPSI', left + 12, tableY + 9, { width: width * 0.6 });
    doc.text('JUMLAH', left, tableY + 9, { width: width - 12, align: 'right' });

    const rowY = tableY + 40;
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(INK)
      .text(booking.packageName, left + 12, rowY, {
        width: width * 0.65,
      });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(`Sesi foto wisuda - skema ${plan}`, left + 12, doc.y + 2, { width: width * 0.65 });
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(INK)
      .text(rupiah.format(booking.packagePrice), left, rowY, { width: width - 12, align: 'right' });
    let cursor = Math.max(doc.y, rowY + 34) + 4;

    // What the customer added to the package, as it was priced when they booked.
    for (const addOn of booking.addOns) {
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(addOn.name, left + 12, cursor, { width: width * 0.65 });
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor(MUTED)
        .text(
          `${addOn.quantity} x ${addOn.unitLabel} @ ${rupiah.format(addOn.unitPrice)}`,
          left + 12,
          doc.y + 1,
          { width: width * 0.65 },
        );
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor(INK)
        .text(rupiah.format(addOn.subtotal), left, cursor, { width: width - 12, align: 'right' });
      cursor = Math.max(doc.y, cursor + 28) + 6;
    }
    const afterRow = cursor + 8;
    doc.moveTo(left, afterRow).lineTo(right, afterRow).lineWidth(0.5).strokeColor(LINE).stroke();

    // --- Totals ---
    const boxW = 240;
    const boxX = right - boxW;
    let y = afterRow + 18;
    const totalRow = (label: string, value: string, strong = false) => {
      doc
        .font(strong ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(strong ? 11 : 10)
        .fillColor(strong ? INK : MUTED);
      doc.text(label, boxX, y, { width: boxW / 2 });
      doc
        .font('Helvetica-Bold')
        .fontSize(strong ? 11 : 10)
        .fillColor(INK)
        .text(value, boxX, y, {
          width: boxW,
          align: 'right',
        });
      y += strong ? 22 : 18;
    };
    totalRow('Total biaya', rupiah.format(booking.totalAmount));
    totalRow('Sudah dibayar', rupiah.format(paid));
    if (!settled) {
      doc
        .moveTo(boxX, y - 4)
        .lineTo(right, y - 4)
        .lineWidth(0.5)
        .strokeColor(LINE)
        .stroke();
      y += 4;
      totalRow('Sisa pelunasan', rupiah.format(remaining), true);
    }

    // --- Status stamp ---
    const stampText = settled ? 'LUNAS' : 'DP TERVERIFIKASI';
    const stampY = afterRow + 16;
    doc
      .roundedRect(left, stampY, 150, 30, 5)
      .lineWidth(1.5)
      .strokeColor(settled ? '#059669' : AMBER)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(settled ? '#059669' : AMBER)
      .text(stampText, left, stampY + 9, { width: 150, align: 'center' });

    // --- Footer ---
    const footerY = doc.page.height - 110;
    doc.moveTo(left, footerY).lineTo(right, footerY).lineWidth(0.5).strokeColor(LINE).stroke();
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(
        `Terima kasih sudah mempercayakan momen wisudamu kepada ${studio.studioName}.`,
        left,
        footerY + 14,
        { width, align: 'center' },
      );
    doc
      .fontSize(8)
      .text(
        'Dokumen ini diterbitkan secara otomatis oleh sistem dan sah tanpa tanda tangan.',
        left,
        footerY + 30,
        { width, align: 'center' },
      );

    doc.end();
    return { filename: safeFilename(invoice.invoiceNumber), buffer: await finished };
  }
}
