import { WahaError } from '../waha/waha.client';
import { SYSTEM_WHATSAPP_TEMPLATES } from './whatsapp-template-defaults';
import { WhatsappTemplatesService } from './whatsapp-templates.service';

type Row = Record<string, any>;

function setup(rows: Row[] = [], options: { sendError?: Error } = {}) {
  const table = [...rows];
  const prisma = {
    whatsappTemplate: {
      upsert: jest.fn(async ({ where, create, update }: any) => {
        const existing = table.find((row) => row.code === where.code);
        if (existing) Object.assign(existing, update);
        else table.push({ id: `id-${table.length}`, createdAt: new Date(), ...create });
      }),
      findMany: jest.fn(async () => table),
      findUnique: jest.fn(
        async ({ where }: any) => table.find((row) => row.id === where.id) ?? null,
      ),
      aggregate: jest.fn(async () => ({
        _max: { sortOrder: Math.max(-1, ...table.map((row) => row.sortOrder ?? 0)) },
      })),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: `id-${table.length}`, createdAt: new Date(), ...data };
        table.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = table.find((item) => item.id === where.id)!;
        Object.assign(row, data);
        return row;
      }),
      delete: jest.fn(async ({ where }: any) => {
        table.splice(
          table.findIndex((row) => row.id === where.id),
          1,
        );
      }),
    },
  };
  const studio = { getCurrent: jest.fn().mockResolvedValue(null) };
  const config = { get: jest.fn(() => 'https://kayastory.id') };
  const waha = {
    sendTextToChat: jest.fn(async () => {
      if (options.sendError) throw options.sendError;
      return { id: 'sent' };
    }),
  };
  return {
    table,
    prisma,
    waha,
    service: new WhatsappTemplatesService(
      prisma as never,
      studio as never,
      config as never,
      waha as never,
    ),
  };
}

const content = {
  name: ' Promo Kebaya ',
  category: 'FOLLOW_UP' as const,
  body: ' Halo {customer_name}! ',
};

describe('WhatsappTemplatesService builder', () => {
  it('creates the built-in templates once and never overwrites an edited one', async () => {
    const edited = {
      id: 'x',
      code: 'PENGINGAT_H1',
      name: 'Diubah',
      body: 'teks admin',
      isSystem: false,
    };
    const { service, table } = setup([edited]);

    await service.adminList();
    await service.adminList();

    expect(table).toHaveLength(SYSTEM_WHATSAPP_TEMPLATES.length);
    expect(table.find((row) => row.code === 'PENGINGAT_H1')).toMatchObject({
      name: 'Diubah',
      body: 'teks admin',
      isSystem: true,
    });
  });

  it('lists switched-off templates too, with what triggers them and how healthy they are', async () => {
    const { service } = setup();

    const list = await service.adminList();

    const verified = list.find((row) => row.code === 'PAYMENT_VERIFIED')!;
    expect(verified.trigger).toBe('Otomatis saat pembayaran diverifikasi');
    expect(verified.health).toBe('good');
    expect(list.find((row) => row.code === 'PENGINGAT_H1')!.trigger).toBeNull();
  });

  it('makes sure every built-in template passes its own health check', async () => {
    const { service } = setup();

    const list = await service.adminList();

    expect(list.every((row) => row.health === 'good')).toBe(true);
  });

  it('creates a custom template with a generated code, trimmed, switched on, after the others', async () => {
    const { service } = setup();
    await service.adminList();

    const created = await service.create(content);

    expect(created).toMatchObject({
      name: 'Promo Kebaya',
      body: 'Halo {customer_name}!',
      category: 'FOLLOW_UP',
      isSystem: false,
      isActive: true,
    });
    expect(created.code).toMatch(/^CUSTOM_[0-9A-F]{8}$/);
    expect(created.sortOrder).toBe(SYSTEM_WHATSAPP_TEMPLATES.length);
  });

  it('refuses to save a template with an unknown variable, listing the problem', async () => {
    const { service, prisma } = setup();

    await expect(service.create({ ...content, body: 'Halo {nama}' })).rejects.toMatchObject({
      status: 400,
      response: { message: [expect.stringContaining('{nama}')] },
    });
    expect(prisma.whatsappTemplate.create).not.toHaveBeenCalled();
  });

  it('updates a template and keeps whether it is switched on', async () => {
    const { service, table } = setup();
    await service.adminList();
    const id = table[0].id;
    await service.setActive(id, false);

    await service.update(id, { ...content, body: 'Halo {customer_name}, sampai jumpa.' });

    expect(table[0]).toMatchObject({
      body: 'Halo {customer_name}, sampai jumpa.',
      isActive: false,
    });
  });

  it('says so when the template does not exist', async () => {
    const { service } = setup();

    await expect(service.get('missing')).rejects.toMatchObject({ status: 404 });
  });

  it('duplicates a template as a custom, editable copy', async () => {
    const { service, table } = setup();
    await service.adminList();

    const copy = await service.duplicate(table.find((row) => row.code === 'PAYMENT_VERIFIED')!.id);

    expect(copy).toMatchObject({ isSystem: false, name: 'Pembayaran Terverifikasi (Salinan)' });
    expect(copy.code).toMatch(/^CUSTOM_/);
  });

  it('resets a built-in template to its shipped text, but not a custom one', async () => {
    const { service, table } = setup();
    await service.adminList();
    const builtIn = table.find((row) => row.code === 'PENGINGAT_H1')!;
    await service.update(builtIn.id, { ...content, body: 'ganti' });

    await service.reset(builtIn.id);

    expect(builtIn.body).toBe(
      SYSTEM_WHATSAPP_TEMPLATES.find((template) => template.code === 'PENGINGAT_H1')!.body,
    );
    const custom = await service.create(content);
    await expect(service.reset(custom.id)).rejects.toMatchObject({ status: 409 });
  });

  it('deletes a custom template but never a built-in one', async () => {
    const { service, table } = setup();
    await service.adminList();
    const custom = await service.create(content);

    await service.remove(custom.id);
    await expect(service.remove(table[0].id)).rejects.toMatchObject({ status: 409 });

    expect(table.some((row) => row.id === custom.id)).toBe(false);
  });

  it('previews a draft with example data and reports its health', async () => {
    const { service } = setup();

    const preview = await service.preview('Halo {customer_name}, sesi {session_date}!');

    expect(preview.text).toBe('Halo Anisa Rahmawati, sesi 25 Agustus 2026!');
    expect(preview.health.level).toBe('good');
    expect(preview.variables).toEqual(['customer_name', 'session_date']);
  });

  it('sends a test to the number, marked as a test, with example data', async () => {
    const { service, waha } = setup();

    const result = await service.sendTest('Halo {customer_name}', '0812-1594-1614');

    expect(result).toEqual({ sent: true, to: '6281215941614' });
    expect(waha.sendTextToChat).toHaveBeenCalledWith(
      '6281215941614@c.us',
      '[UJI COBA TEMPLATE]\n\nHalo Anisa Rahmawati',
    );
  });

  it('refuses to send a broken draft, and turns a WhatsApp failure into a readable error', async () => {
    const { service, waha } = setup([], { sendError: new WahaError(422, 'Sesi belum terhubung') });

    await expect(service.sendTest('Halo {salah}', '081215941614')).rejects.toMatchObject({
      status: 400,
    });
    expect(waha.sendTextToChat).not.toHaveBeenCalled();
    await expect(service.sendTest('Halo', '081215941614')).rejects.toMatchObject({
      status: 422,
      response: { message: 'Sesi belum terhubung' },
    });
  });
});
