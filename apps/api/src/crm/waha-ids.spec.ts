import {
  canonicalPhone,
  isUserChat,
  messageChatId,
  phoneFromChatId,
  phoneVariants,
  previewOf,
  pushNameOf,
  toDate,
} from './waha-ids';

describe('isUserChat', () => {
  it.each(['6281234567890@c.us', '123456789012345@lid'])('keeps %s', (id) => {
    expect(isUserChat(id)).toBe(true);
  });

  it.each([
    '120363025@g.us',
    'status@broadcast',
    '1203@newsletter',
    '6281234567890',
    '@c.us',
    '',
    undefined,
    null,
  ])('drops %s', (id) => {
    expect(isUserChat(id as never)).toBe(false);
  });
});

describe('messageChatId', () => {
  it('is the sender for incoming messages and the recipient for outgoing ones', () => {
    expect(messageChatId({ from: 'a@c.us', to: 'me@c.us', fromMe: false })).toBe('a@c.us');
    expect(messageChatId({ from: 'me@c.us', to: 'a@c.us', fromMe: true })).toBe('a@c.us');
  });
});

describe('canonicalPhone', () => {
  it.each([
    ['081234567890', '6281234567890'],
    ['+62 812-3456-7890', '6281234567890'],
    ['6281234567890', '6281234567890'],
    ['81234567890', '6281234567890'],
  ])('writes %s as %s', (input, expected) => {
    expect(canonicalPhone(input)).toBe(expected);
  });

  it.each(['', '   ', 'abc', '123', null, undefined])('rejects %j', (input) => {
    expect(canonicalPhone(input)).toBeNull();
  });
});

describe('phoneFromChatId / phoneVariants', () => {
  it('reads the number from a @c.us id, but never from a LID', () => {
    expect(phoneFromChatId('6281234567890@c.us')).toBe('6281234567890');
    expect(phoneFromChatId('227183428292844@lid')).toBeNull();
  });

  it('lists both ways a booking phone may have been stored', () => {
    expect(phoneVariants('6281234567890')).toEqual(['6281234567890', '081234567890']);
  });
});

describe('toDate', () => {
  it('reads seconds and tolerates milliseconds', () => {
    expect(toDate(1_760_000_000).toISOString()).toBe('2025-10-09T08:53:20.000Z');
    expect(toDate(1_760_000_000_000).toISOString()).toBe('2025-10-09T08:53:20.000Z');
  });
});

describe('previewOf', () => {
  it('flattens whitespace and truncates', () => {
    expect(previewOf('  halo\n\n kak  ', false)).toBe('halo kak');
    expect(previewOf('x'.repeat(500), false)).toHaveLength(140);
  });

  it('labels media without text', () => {
    expect(previewOf('', true)).toBe('[Media]');
    expect(previewOf(null, false)).toBe('');
  });
});

describe('pushNameOf', () => {
  it('finds the name wherever the engine puts it', () => {
    expect(pushNameOf({ id: '1', timestamp: 1, _data: { Info: { PushName: ' Anisa ' } } })).toBe(
      'Anisa',
    );
    expect(pushNameOf({ id: '1', timestamp: 1, _data: { notifyName: 'Budi' } })).toBe('Budi');
    expect(pushNameOf({ id: '1', timestamp: 1 })).toBeUndefined();
    expect(
      pushNameOf({ id: '1', timestamp: 1, _data: { Info: { PushName: '  ' } } }),
    ).toBeUndefined();
  });
});
