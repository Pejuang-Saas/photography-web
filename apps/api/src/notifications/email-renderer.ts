import { singleLine } from '../common/single-line';
import { isVariableKey, VARIABLE_PATTERN, type VariableValues } from './email-variables';

/** Button colours an admin can pick; the text colour is chosen to stay readable on each. */
export const CTA_COLORS = ['#d9a521', '#18181b', '#059669'] as const;
const BUTTON_TEXT_COLOR: Record<string, string> = {
  '#d9a521': '#111111',
  '#18181b': '#ffffff',
  '#059669': '#ffffff',
};

export type RenderableTemplate = {
  subject: string;
  heading: string;
  bodyText: string;
  includeBookingTable: boolean;
  ctaText: string | null;
  ctaUrl: string | null;
  ctaColor: string;
  footerText: string | null;
};

export type BookingRow = { label: string; value: string };

export type RenderedEmail = { subject: string; html: string; text: string };

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Returns the URL only when it is a plain http(s) link; anything else (javascript:, data:...) is dropped. */
export function safeHttpUrl(value: string | null | undefined) {
  const candidate = value?.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Fills {placeholders}. The template's own text and every value both go through `escape`, so an
 * admin cannot inject HTML and a customer's name cannot either.
 */
export function substitute(
  template: string,
  values: VariableValues,
  escape: (text: string) => string,
) {
  let output = '';
  let cursor = 0;
  for (const match of template.matchAll(VARIABLE_PATTERN)) {
    const start = match.index ?? 0;
    output += escape(template.slice(cursor, start));
    // A name outside the registry stays as typed instead of silently disappearing.
    output += isVariableKey(match[1]) ? escape(values[match[1]] ?? '') : escape(match[0]);
    cursor = start + match[0].length;
  }
  return output + escape(template.slice(cursor));
}

const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

const BODY_PARAGRAPH = 'margin:0 0 16px;font-size:15px;line-height:1.65;color:#3f3f46';
const FOOTER_PARAGRAPH = 'margin:0 0 10px;font-size:12px;line-height:1.6;color:#71717a';

function paragraphs(text: string, values: VariableValues, style = BODY_PARAGRAPH) {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="${style}">${substitute(block, values, escapeHtml).replace(/\n/g, '<br>')}</p>`,
    )
    .join('');
}

function bookingTable(rows: BookingRow[]) {
  if (rows.length === 0) return '';
  const body = rows
    .map((row, index) => {
      const border = index === rows.length - 1 ? '' : 'border-bottom:1px solid #f4f4f5;';
      return `<tr><td style="padding:11px 16px;${border}font-size:13px;color:#71717a;width:42%;vertical-align:top">${escapeHtml(row.label)}</td><td style="padding:11px 16px;${border}font-size:14px;color:#18181b;font-weight:600;text-align:right;vertical-align:top">${escapeHtml(row.value)}</td></tr>`;
    })
    .join('');
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border:1px solid #e4e4e7;border-radius:10px;border-collapse:separate">${body}</table>`;
}

function button(text: string, url: string, color: string) {
  const background = (CTA_COLORS as readonly string[]).includes(color) ? color : CTA_COLORS[0];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:8px 0 28px"><tr><td style="background:${background};border-radius:8px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:${BUTTON_TEXT_COLOR[background]};text-decoration:none;border-radius:8px">${escapeHtml(text)}</a></td></tr></table>`;
}

function footerLines(values: VariableValues) {
  const whatsappUrl = safeHttpUrl(values.studio_whatsapp_url);
  const instagramUrl = safeHttpUrl(values.studio_instagram_url);
  const lines: string[] = [];
  if (values.studio_name)
    lines.push(`<strong style="color:#52525b">${escapeHtml(values.studio_name)}</strong>`);
  if (values.studio_address) lines.push(escapeHtml(values.studio_address));
  if (values.studio_hours) lines.push(`Jam operasional ${escapeHtml(values.studio_hours)}`);
  const contacts: string[] = [];
  if (values.studio_whatsapp) {
    const label = `WhatsApp ${escapeHtml(values.studio_whatsapp)}`;
    contacts.push(
      whatsappUrl
        ? `<a href="${escapeHtml(whatsappUrl)}" style="color:#71717a">${label}</a>`
        : label,
    );
  }
  if (values.studio_instagram) {
    const label = escapeHtml(values.studio_instagram);
    contacts.push(
      instagramUrl
        ? `<a href="${escapeHtml(instagramUrl)}" style="color:#71717a">${label}</a>`
        : label,
    );
  }
  if (contacts.length) lines.push(contacts.join(' &nbsp;·&nbsp; '));
  return lines;
}

/** Builds the email once, from stored template text, so the same output is previewed and sent. */
export function renderEmail(input: {
  template: RenderableTemplate;
  values: VariableValues;
  bookingRows: BookingRow[];
  /** `cid:` reference (sent email) or data URL (admin preview) of the studio logo, if there is one. */
  logoSrc?: string;
}): RenderedEmail {
  const { template, values } = input;
  const rows = template.includeBookingTable ? input.bookingRows : [];

  const subject = singleLine(substitute(template.subject, values, (text) => text));
  const heading = substitute(template.heading, values, escapeHtml);
  const ctaUrl = template.ctaUrl
    ? safeHttpUrl(substitute(template.ctaUrl, values, (t) => t))
    : null;
  const ctaText = template.ctaText ? substitute(template.ctaText, values, (t) => t).trim() : '';
  const footerNote = template.footerText
    ? paragraphs(template.footerText, values, FOOTER_PARAGRAPH)
    : '';
  const studio = footerLines(values);
  const logo = input.logoSrc
    ? `<td style="vertical-align:middle;padding-right:12px"><img src="${escapeHtml(input.logoSrc)}" width="44" height="44" alt="${escapeHtml(values.studio_name)}" style="display:block;width:44px;height:44px;border:0;border-radius:50%"></td>`
    : '';

  const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(subject)}</title>
<style>
  body{margin:0;padding:0;background:#f4f4f5}
  @media (max-width:620px){
    .container{width:100%!important}
    .pad{padding-left:20px!important;padding-right:20px!important}
    /* every table level must become a block, or the row in between keeps the button narrow */
    .btn,.btn tbody,.btn tr,.btn td,.btn a{display:block!important;width:100%!important;box-sizing:border-box;text-align:center!important}
    h1{font-size:21px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${FONT}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${heading}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:14px;border-collapse:separate;overflow:hidden">
    <tr><td class="pad" style="padding:22px 36px 16px;border-bottom:3px solid #d9a521;font-family:${FONT}">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        ${logo}
        <td style="vertical-align:middle;font-family:${FONT}"><span style="font-size:20px;font-weight:900;letter-spacing:-0.5px;color:#111111">${escapeHtml((values.studio_name.split(' ')[0] || 'STUDIO').toUpperCase())}<span style="color:#d9a521">.</span></span></td>
      </tr></table>
    </td></tr>
    <tr><td class="pad" style="padding:32px 36px 12px;font-family:${FONT}">
      <h1 style="margin:0 0 18px;font-size:24px;line-height:1.25;color:#111111">${heading}</h1>
      ${paragraphs(template.bodyText, values)}
      ${bookingTable(rows)}
      ${ctaUrl && ctaText ? button(ctaText, ctaUrl, template.ctaColor) : ''}
    </td></tr>
    <tr><td class="pad" style="padding:20px 36px 30px;border-top:1px solid #f4f4f5;font-family:${FONT};font-size:12px;line-height:1.7;color:#71717a">
      ${footerNote}${studio.map((line) => `<div>${line}</div>`).join('')}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const plain = (text: string) => substitute(text, values, (t) => t);
  const textParts = [plain(template.heading), '', plain(template.bodyText).trim()];
  if (rows.length) textParts.push('', ...rows.map((row) => `${row.label}: ${row.value}`));
  if (ctaUrl && ctaText) textParts.push('', `${ctaText}: ${ctaUrl}`);
  if (template.footerText) textParts.push('', plain(template.footerText).trim());
  const studioText = [
    values.studio_name,
    values.studio_address,
    values.studio_hours && `Jam operasional ${values.studio_hours}`,
    values.studio_whatsapp && `WhatsApp ${values.studio_whatsapp}`,
    values.studio_instagram,
  ].filter(Boolean);
  if (studioText.length) textParts.push('', '--', ...(studioText as string[]));

  return { subject, html, text: textParts.join('\n') };
}
