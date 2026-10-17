/**
 * What an email needs attached, stored on the log row as plain data. The files themselves are only
 * produced when the worker sends, so jobs and logs stay small and a retry rebuilds them fresh.
 */
export type EmailAttachmentSpec = { type: 'invoice-pdf'; invoiceId: string } | { type: 'logo' };

export function parseAttachmentSpecs(value: unknown): EmailAttachmentSpec[] {
  if (!Array.isArray(value)) return [];
  const specs: EmailAttachmentSpec[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const { type, invoiceId } = item as { type?: unknown; invoiceId?: unknown };
    if (type === 'logo') specs.push({ type: 'logo' });
    else if (type === 'invoice-pdf' && typeof invoiceId === 'string') {
      specs.push({ type: 'invoice-pdf', invoiceId });
    }
  }
  return specs;
}
