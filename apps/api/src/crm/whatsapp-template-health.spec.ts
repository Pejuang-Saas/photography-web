import { checkTemplateHealth } from './whatsapp-template-health';

const issues = (body: string) => checkTemplateHealth(body).issues.map((issue) => issue.message);

describe('checkTemplateHealth', () => {
  it('calls a friendly message good', () => {
    const health = checkTemplateHealth('Halo {customer_name}! Jadwal sesi kamu {session_date}.');

    expect(health.level).toBe('good');
    expect(health.issues).toEqual([]);
  });

  it('refuses an empty message', () => {
    expect(checkTemplateHealth('   ').level).toBe('error');
  });

  it('refuses a variable that does not exist, and names it', () => {
    const health = checkTemplateHealth('Halo {nama_klien}, jadwal {session_date}');

    expect(health.level).toBe('error');
    expect(issues('Halo {nama_klien}')[0]).toContain('{nama_klien}');
  });

  it('refuses a brace that would reach the customer as typed', () => {
    expect(checkTemplateHealth('Halo {customer_name').level).toBe('error');
    expect(checkTemplateHealth('Halo { customer_name }').level).toBe('error');
    expect(checkTemplateHealth('Halo customer_name}').level).toBe('error');
  });

  it('warns about shouting, but not about a short capitalised word', () => {
    expect(checkTemplateHealth('PROMO DISKON GILA-GILAAN HARI INI SAJA KAMU').level).toBe(
      'warning',
    );
    expect(
      checkTemplateHealth('Halo, ini pengingat dari KAYASTORY ya kak, sampai jumpa.').level,
    ).toBe('good');
  });

  it('does not count variables or links as capital letters', () => {
    expect(
      checkTemplateHealth('Halo {customer_name} {booking_code} {studio_name} https://KAYA.ID/ABC')
        .level,
    ).toBe('good');
  });

  it('warns about repeated exclamation or question marks', () => {
    expect(checkTemplateHealth('Halo kak, ayo booking sekarang!!!').level).toBe('warning');
    expect(checkTemplateHealth('Halo kak, jadi hadir?? Kabari ya!').level).toBe('good');
  });

  it('warns about too many links', () => {
    const body = 'a https://a.id b https://b.id c https://c.id';

    expect(checkTemplateHealth(body).level).toBe('warning');
    expect(checkTemplateHealth('a https://a.id b https://b.id').level).toBe('good');
  });

  it('warns about a long message and refuses one WhatsApp would reject', () => {
    expect(checkTemplateHealth('Halo kak. '.repeat(120)).level).toBe('warning');
    expect(checkTemplateHealth('Halo kak. '.repeat(450)).level).toBe('error');
  });

  it('reports every problem at once and how long the message is', () => {
    const health = checkTemplateHealth('{salah} HARI INI SAJA KAMU HARUS DATANG!!!');

    expect(health.issues.length).toBeGreaterThanOrEqual(3);
    expect(health.level).toBe('error');
    expect(health.length).toBe('{salah} HARI INI SAJA KAMU HARUS DATANG!!!'.length);
  });
});
