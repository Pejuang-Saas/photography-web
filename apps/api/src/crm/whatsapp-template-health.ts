import { VARIABLE_PATTERN, unknownVariables } from '../notifications/email-variables';

export type HealthIssue = { severity: 'error' | 'warning'; message: string };

export type TemplateHealth = {
  /** error: cannot be saved or sent, warning: allowed but risky, good: nothing found. */
  level: 'good' | 'warning' | 'error';
  issues: HealthIssue[];
  summary: string;
  length: number;
};

/** WhatsApp refuses messages longer than this. */
export const MAX_BODY_LENGTH = 4000;
const LONG_BODY = 1000;
const MAX_LINKS = 2;

/**
 * Looks for what makes a message read as spam or fail on the way out. It is advice, not a gate,
 * except for the problems that would send a broken message (an unknown variable, an empty body).
 */
export function checkTemplateHealth(body: string): TemplateHealth {
  const issues: HealthIssue[] = [];
  const text = body.trim();

  if (!text) {
    issues.push({ severity: 'error', message: 'Isi pesan masih kosong.' });
  }

  const unknown = unknownVariables(text);
  if (unknown.length) {
    issues.push({
      severity: 'error',
      message: `Variabel tidak dikenal: ${unknown.map((name) => `{${name}}`).join(', ')}. Pilih dari tombol variabel agar tidak salah ketik.`,
    });
  }

  // A brace that does not belong to a complete {name} would reach the customer as typed.
  const withoutVariables = text.replace(VARIABLE_PATTERN, '');
  if (/[{}]/.test(withoutVariables)) {
    issues.push({
      severity: 'error',
      message: 'Ada tanda kurung kurawal { } yang tidak lengkap atau berisi spasi.',
    });
  }

  if (text.length > MAX_BODY_LENGTH) {
    issues.push({
      severity: 'error',
      message: `Pesan terlalu panjang (${text.length} dari ${MAX_BODY_LENGTH} karakter).`,
    });
  } else if (text.length > LONG_BODY) {
    issues.push({
      severity: 'warning',
      message:
        'Pesan cukup panjang. Pesan singkat lebih nyaman dibaca dan lebih aman dari filter spam.',
    });
  }

  // Judged on what the customer reads: placeholders and links are not prose.
  const prose = withoutVariables.replace(/https?:\/\/\S+/g, '');
  const letters = prose.match(/\p{L}/gu) ?? [];
  const upper = prose.match(/\p{Lu}/gu) ?? [];
  if (letters.length >= 20 && upper.length / letters.length > 0.5) {
    issues.push({
      severity: 'warning',
      message:
        'Terlalu banyak huruf kapital, terkesan berteriak atau seperti pesan penipuan. Gunakan kalimat yang lebih tenang.',
    });
  }

  if (/[!?]{3,}/.test(prose)) {
    issues.push({
      severity: 'warning',
      message: 'Tanda seru atau tanya berulang (!!!) mudah dianggap spam. Cukup satu.',
    });
  }

  const links = text.match(/https?:\/\/\S+/g) ?? [];
  if (links.length > MAX_LINKS) {
    issues.push({
      severity: 'warning',
      message: `Terlalu banyak tautan (${links.length}). Maksimal ${MAX_LINKS} agar tidak dianggap spam.`,
    });
  }

  const level = issues.some((issue) => issue.severity === 'error')
    ? 'error'
    : issues.length
      ? 'warning'
      : 'good';
  const summary =
    level === 'good'
      ? 'Pesan ramah, terstruktur sopan, dan aman dari filter spam.'
      : level === 'warning'
        ? 'Perhatian: ada hal yang sebaiknya diperbaiki agar pesan tidak terkesan spam.'
        : 'Ada masalah yang harus diperbaiki sebelum template bisa disimpan.';
  return { level, issues, summary, length: text.length };
}
