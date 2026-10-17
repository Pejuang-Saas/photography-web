import { parseAttachmentSpecs } from './email-attachments';

describe('parseAttachmentSpecs', () => {
  it('reads the stored attachment list', () => {
    expect(
      parseAttachmentSpecs([{ type: 'logo' }, { type: 'invoice-pdf', invoiceId: 'inv-1' }]),
    ).toEqual([{ type: 'logo' }, { type: 'invoice-pdf', invoiceId: 'inv-1' }]);
  });

  it('drops anything that is not a known, complete attachment', () => {
    expect(
      parseAttachmentSpecs([
        null,
        'logo',
        42,
        {},
        { type: 'script' },
        { type: 'invoice-pdf' },
        { type: 'invoice-pdf', invoiceId: 7 },
      ]),
    ).toEqual([]);
  });

  it('treats anything that is not a list as no attachments', () => {
    expect(parseAttachmentSpecs(null)).toEqual([]);
    expect(parseAttachmentSpecs({ type: 'logo' })).toEqual([]);
    expect(parseAttachmentSpecs(undefined)).toEqual([]);
  });
});
