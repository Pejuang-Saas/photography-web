import {
  baseMime,
  canonicalPhone,
  cleanDisplayName,
  isInlineMedia,
  mediaExtension,
  chatIdFromMessageId,
  isGroupJid,
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

describe('chatIdFromMessageId', () => {
  it.each([
    ['false_6281234567890@c.us_3EB0AAAA', '6281234567890@c.us'],
    ['true_186316436332790@lid_3EB058A9BA548FE47D3272', '186316436332790@lid'],
    [
      'true_120363429116882627@g.us_3AE6B91D0EC238405AA2_176330318553252@lid',
      '120363429116882627@g.us',
    ],
    [
      'false_120363429116882627@g.us_3AE6B91D0EC238405AA2_227183428292844@lid',
      '120363429116882627@g.us',
    ],
    ['false_status@broadcast_3EB0', 'status@broadcast'],
  ])('reads the chat out of %s', (id, expected) => {
    expect(chatIdFromMessageId(id)).toBe(expected);
  });

  it.each(['', undefined, null, 'qa-1', 'garbage', 'true_nochat_ABC'])(
    'finds nothing in %j',
    (id) => {
      expect(chatIdFromMessageId(id as never)).toBeUndefined();
    },
  );
});

describe('messageChatId prefers the id over from/to', () => {
  it('says "group" for a group message even though to holds the sender own id', () => {
    expect(
      messageChatId({
        id: 'true_120363429116882627@g.us_3AE6B91D0EC238405AA2_176330318553252@lid',
        from: '176330318553252@lid',
        to: '176330318553252@lid',
        fromMe: true,
      }),
    ).toBe('120363429116882627@g.us');
  });

  it('keeps working for a private message', () => {
    expect(
      messageChatId({
        id: 'true_186316436332790@lid_3EB0',
        from: '999@lid',
        to: '186316436332790@lid',
        fromMe: true,
      }),
    ).toBe('186316436332790@lid');
  });
});

describe('isGroupJid', () => {
  it('recognises group addresses only', () => {
    expect(isGroupJid('120363429116882627@g.us')).toBe(true);
    expect(isGroupJid('6281234567890@c.us')).toBe(false);
    expect(isGroupJid('1@lid')).toBe(false);
    expect(isGroupJid(undefined)).toBe(false);
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

describe('cleanDisplayName', () => {
  it('removes invisible marks that WhatsApp puts around names', () => {
    expect(cleanDisplayName('‎Muhammad Ilham Maulana')).toBe('Muhammad Ilham Maulana');
    expect(cleanDisplayName('Anisa​ Rahmawati﻿')).toBe('Anisa Rahmawati');
    expect(cleanDisplayName('‪Budi‬')).toBe('Budi');
  });

  it('tidies spaces and control characters, and caps the length', () => {
    expect(cleanDisplayName('  Dewi \t  Lestari\n')).toBe('Dewi Lestari');
    expect(cleanDisplayName('x'.repeat(300))).toHaveLength(120);
  });

  it('keeps ordinary names, emoji and non-Latin scripts intact', () => {
    expect(cleanDisplayName('Siti 🌸')).toBe('Siti 🌸');
    expect(cleanDisplayName('اسم')).toBe('اسم');
  });

  it.each(['', '   ', '‎‏', null, undefined])('turns %j into nothing', (value) => {
    expect(cleanDisplayName(value as never)).toBeUndefined();
  });
});

describe('attachment types', () => {
  it('reads the base type out of a full one', () => {
    expect(baseMime('audio/ogg; codecs=opus')).toBe('audio/ogg');
    expect(baseMime(' IMAGE/JPEG ')).toBe('image/jpeg');
    expect(baseMime(undefined)).toBe('');
  });

  it('shows photos, video, voice notes and PDFs in the page', () => {
    for (const mime of [
      'image/jpeg',
      'image/webp',
      'video/mp4',
      'audio/ogg; codecs=opus',
      'application/pdf',
    ]) {
      expect(isInlineMedia(mime)).toBe(true);
    }
  });

  it('never shows anything that could run code', () => {
    for (const mime of [
      'text/html',
      'image/svg+xml',
      'application/xhtml+xml',
      'application/javascript',
      'text/xml',
      '',
    ]) {
      expect(isInlineMedia(mime)).toBe(false);
    }
  });

  it('chooses an extension from the name first, then the type', () => {
    expect(mediaExtension('application/pdf', 'invoice.PDF')).toBe('pdf');
    expect(mediaExtension('image/jpeg', null)).toBe('jpg');
    expect(mediaExtension('audio/ogg; codecs=opus')).toBe('ogg');
    expect(mediaExtension('application/x-weird')).toBe('bin');
  });
});
