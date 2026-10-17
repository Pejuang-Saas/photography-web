jest.mock('../common/public.decorator', () => ({ Public: () => () => undefined }));

import { InvoicesController } from './invoices.controller';

describe('InvoicesController', () => {
  it('serves the PDF inline, with a length and no caching by shared proxies', async () => {
    const buffer = Buffer.from('%PDF-1.7 fake');
    const pdfs = { render: jest.fn().mockResolvedValue({ filename: 'INV-1.pdf', buffer }) };

    const file = await new InvoicesController(pdfs as never).pdf(
      '7d0f3a8e-6b0a-4c64-8f0e-7f4f6e0a1b11',
    );

    expect(pdfs.render).toHaveBeenCalledWith('7d0f3a8e-6b0a-4c64-8f0e-7f4f6e0a1b11');
    expect(file.getHeaders()).toEqual({
      type: 'application/pdf',
      disposition: 'inline; filename="INV-1.pdf"',
      length: buffer.length,
    });
    expect(Reflect.getMetadata('__headers__', InvoicesController.prototype.pdf)).toEqual([
      { name: 'Cache-Control', value: 'private, no-store' },
    ]);
  });
});
