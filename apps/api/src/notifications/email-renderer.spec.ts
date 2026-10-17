import {
  escapeHtml,
  renderEmail,
  safeHttpUrl,
  substitute,
  type RenderableTemplate,
} from './email-renderer';
import { emptyValues, SAMPLE_VALUES, type VariableValues } from './email-variables';

const template: RenderableTemplate = {
  subject: '[Invoice #{invoice_number}] Halo {customer_name}',
  heading: 'Halo {customer_name}!',
  bodyText: 'Pesanan {booking_code} diterima.\n\nSampai jumpa pada {session_date}.',
  includeBookingTable: true,
  ctaText: 'Hubungi Kami',
  ctaUrl: '{studio_whatsapp_url}',
  ctaColor: '#d9a521',
  footerText: 'Email otomatis.',
};

const rows = [
  { label: 'Paket', value: 'Solo Kebaya' },
  { label: 'Total biaya', value: 'Rp 450.000' },
];

function values(overrides: Partial<VariableValues> = {}): VariableValues {
  return { ...SAMPLE_VALUES, ...overrides };
}

const render = (
  overrides: Partial<VariableValues> = {},
  change: Partial<RenderableTemplate> = {},
) =>
  renderEmail({
    template: { ...template, ...change },
    values: values(overrides),
    bookingRows: rows,
  });

describe('substitute', () => {
  it('fills known placeholders and keeps unknown ones as typed', () => {
    expect(
      substitute(
        'Halo {customer_name}, {tidak_ada}!',
        values({ customer_name: 'Anisa' }),
        (t) => t,
      ),
    ).toBe('Halo Anisa, {tidak_ada}!');
  });

  it('escapes the surrounding template text as well as the values', () => {
    const out = substitute(
      '<b>{customer_name}</b>',
      values({ customer_name: '<i>x</i>' }),
      escapeHtml,
    );

    expect(out).toBe('&lt;b&gt;&lt;i&gt;x&lt;/i&gt;&lt;/b&gt;');
  });

  it('treats a missing value as empty', () => {
    expect(substitute('[{invoice_number}]', emptyValues(), (t) => t)).toBe('[]');
  });
});

describe('safeHttpUrl', () => {
  it.each(['https://wa.me/6281234567890?text=Halo%20Kak', 'http://example.test/path'])(
    'accepts %s',
    (url) => expect(safeHttpUrl(url)).not.toBeNull(),
  );

  it.each([
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'mailto:a@b.test',
    'ftp://example.test',
    '//evil.test',
    'not a url',
    '',
    '   ',
  ])('rejects %j', (url) => expect(safeHttpUrl(url)).toBeNull());

  it('rejects empty and missing values', () => {
    expect(safeHttpUrl(null)).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});

describe('renderEmail', () => {
  it('never lets a customer-supplied value inject markup', () => {
    const { html } = render({
      customer_name: '<script>alert(1)</script><img src=x onerror=alert(2)>',
    });

    expect(html).not.toContain('<script>alert(1)');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('shows HTML typed into the template as text instead of obeying it', () => {
    const { html } = render({}, { bodyText: 'Klik <a href="http://evil.test">di sini</a>' });

    expect(html).not.toContain('<a href="http://evil.test"');
    expect(html).toContain('&lt;a href=&quot;http://evil.test&quot;&gt;');
  });

  it('builds a one-line subject that cannot inject headers', () => {
    const { subject } = render({ customer_name: 'Anisa\r\nBcc: attacker@example.test' });

    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain('Anisa Bcc: attacker@example.test');
  });

  it('keeps raw text in the subject and plain-text part, but escapes it in the HTML title', () => {
    const out = render({ customer_name: 'A & B' });

    expect(out.subject).toContain('A & B');
    expect(out.text).toContain('Halo A & B!');
    expect(out.html).toContain('<title>[Invoice #INV-KYA-2026-904123] Halo A &amp; B</title>');
  });

  it('turns blank lines into paragraphs and single line breaks into <br>', () => {
    const { html } = render({}, { bodyText: 'Baris satu\nBaris dua\n\nParagraf dua' });

    expect(html.match(/<p style="margin:0 0 16px/g)).toHaveLength(2);
    expect(html).toContain('Baris satu<br>Baris dua');
  });

  it('includes the booking table only when the template asks for it', () => {
    expect(render().html).toContain('Total biaya');
    expect(render().text).toContain('Total biaya: Rp 450.000');

    const without = render({}, { includeBookingTable: false });
    expect(without.html).not.toContain('Total biaya');
    expect(without.text).not.toContain('Total biaya');
  });

  it('escapes the values inside the booking table', () => {
    const { html } = renderEmail({
      template,
      values: values(),
      bookingRows: [{ label: 'Paket', value: '<b>Mewah</b>' }],
    });

    expect(html).toContain('&lt;b&gt;Mewah&lt;/b&gt;');
  });

  it('renders a bulletproof button with the chosen colour and a readable text colour', () => {
    const amber = render().html;
    expect(amber).toContain('href="https://wa.me/6281234567890"');
    expect(amber).toContain('background:#d9a521');
    expect(amber).toContain('color:#111111');

    const dark = render({}, { ctaColor: '#18181b' }).html;
    expect(dark).toContain('background:#18181b');
    expect(dark).toContain('color:#ffffff');
  });

  it('falls back to the default colour for a colour outside the allowed set', () => {
    const { html } = render({}, { ctaColor: 'red;background:url(javascript:alert(1))' });

    expect(html).toContain('background:#d9a521');
    expect(html).not.toContain('javascript');
  });

  it.each([
    ['empty value', { studio_whatsapp_url: '' }],
    ['javascript link', { studio_whatsapp_url: 'javascript:alert(1)' }],
    ['data link', { studio_whatsapp_url: 'data:text/html,x' }],
  ])('leaves the button out instead of linking to a %s', (_label, overrides) => {
    const out = render(overrides);

    expect(out.html).not.toContain('Hubungi Kami');
    expect(out.html).not.toContain('class="btn"');
    expect(out.text).not.toContain('Hubungi Kami');
  });

  it('escapes the link target so it cannot break out of the attribute', () => {
    const { html } = render({ studio_whatsapp_url: 'https://wa.me/1?x="onmouseover="alert(1)' });

    expect(html).not.toContain('"onmouseover=');
  });

  it('is responsive: fluid container, viewport meta and a mobile breakpoint', () => {
    const { html } = render();

    expect(html).toContain('name="viewport"');
    expect(html).toContain('max-width:100%');
    expect(html).toContain('@media (max-width:620px)');
    // The button must be full width on phones, which needs every table level switched to a block.
    expect(html).toContain(
      '.btn,.btn tbody,.btn tr,.btn td,.btn a{display:block!important;width:100%!important',
    );
    expect(html).toContain('lang="id"');
  });

  it('shows studio details in the footer and links the contacts', () => {
    const { html, text } = render();

    expect(html).toContain('Jl. Tirto Agung No. 12');
    expect(html).toContain('href="https://instagram.com/kayastory.id"');
    expect(text).toContain('--\nKayastory Photography');
    expect(text).toContain('WhatsApp 081234567890');
  });

  it('drops footer lines for details the studio has not filled in', () => {
    const { html, text } = render({
      studio_address: '',
      studio_hours: '',
      studio_whatsapp: '',
      studio_instagram: '',
    });

    expect(html).not.toContain('Jam operasional');
    expect(html).not.toContain('WhatsApp ');
    expect(text).not.toContain('Jam operasional');
  });

  it('produces a complete plain-text alternative', () => {
    const { text } = render();

    expect(text.split('\n')[0]).toBe('Halo Anisa Rahmawati!');
    expect(text).toContain('Pesanan KYA-2026-904123 diterima.');
    expect(text).toContain('Hubungi Kami: https://wa.me/6281234567890');
    expect(text).toContain('Email otomatis.');
    expect(text).not.toContain('<');
  });

  describe('logo', () => {
    const withLogo = (logoSrc?: string, overrides: Partial<VariableValues> = {}) =>
      renderEmail({ template, values: values(overrides), bookingRows: rows, logoSrc }).html;

    it('shows the logo beside the studio name when there is one', () => {
      const html = withLogo('cid:studio-logo');

      expect(html).toContain('<img src="cid:studio-logo"');
      expect(html).toContain('width="44" height="44"');
      expect(html).toContain('alt="Kayastory Photography"');
    });

    it('leaves the header as text only without a logo', () => {
      expect(withLogo(undefined)).not.toContain('<img');
    });

    it('escapes the logo address and the alt text', () => {
      const html = withLogo('x" onerror="alert(1)', { studio_name: 'A "B" <c>' });

      expect(html).not.toContain('onerror="alert(1)"');
      expect(html).toContain('alt="A &quot;B&quot; &lt;c&gt;"');
    });
  });
});
