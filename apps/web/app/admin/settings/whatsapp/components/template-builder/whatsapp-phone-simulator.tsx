import { Fragment } from 'react';
import {
  ArrowLeft,
  BatteryFull,
  CheckCheck,
  MoreVertical,
  Phone,
  Signal,
  Video,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { linesOf, parseWhatsapp, type Piece } from './whatsapp-format';

function Pieces({ pieces }: { pieces: Piece[] }) {
  return (
    <>
      {pieces.map((piece, index) => {
        if (piece.type === 'text') return <Fragment key={index}>{piece.text}</Fragment>;
        if (piece.type === 'link') {
          return (
            <span key={index} className="break-all text-sky-600 underline dark:text-sky-400">
              {piece.text}
            </span>
          );
        }
        const Tag = piece.marker === '*' ? 'strong' : piece.marker === '_' ? 'em' : 's';
        return (
          <Tag key={index}>
            <Pieces pieces={piece.children} />
          </Tag>
        );
      })}
    </>
  );
}

/** The message as WhatsApp draws it: formatting applied, links in blue, line breaks kept. */
export function FormattedMessage({ text }: { text: string }) {
  return (
    <>
      {linesOf(text).map((line, index) => (
        <div key={index} className="min-h-[1.25em] whitespace-pre-wrap break-words">
          <Pieces pieces={parseWhatsapp(line)} />
        </div>
      ))}
    </>
  );
}

const clock = new Intl.DateTimeFormat('id-ID', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * A phone showing the message the way the customer will read it. `text` is already filled with
 * example data by the server.
 */
export default function WhatsappPhoneSimulator({
  text,
  loading,
  studioName = 'Kayastory Photography Studio',
}: {
  text: string | null;
  loading?: boolean;
  studioName?: string;
}) {
  const time = clock.format(new Date()).replace('.', ':');

  return (
    <div
      className="mx-auto w-full max-w-[320px] rounded-[2.6rem] border-[10px] border-zinc-900 bg-zinc-900 shadow-xl dark:border-zinc-700 dark:bg-zinc-700"
      aria-label="Simulator layar WhatsApp"
    >
      <div className="overflow-hidden rounded-[2rem] bg-[#efeae2] dark:bg-[#0b141a]">
        <div className="bg-[#075e54] text-white dark:bg-[#202c33]">
          <div className="flex items-center justify-between px-5 pt-2 text-[10px] font-semibold">
            <span>{time}</span>
            <span className="flex items-center gap-1">
              <Signal className="size-3" />
              <Wifi className="size-3" />
              <BatteryFull className="size-3.5" />
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 pb-2.5 pt-2">
            <ArrowLeft className="size-4 shrink-0" />
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-extrabold text-zinc-950">
              K
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[13px] font-semibold">{studioName}</span>
              <span className="block text-[10px] text-emerald-200">online</span>
            </span>
            <Video className="size-4 shrink-0" />
            <Phone className="size-3.5 shrink-0" />
            <MoreVertical className="size-4 shrink-0" />
          </div>
        </div>

        <div className="flex min-h-[360px] flex-col justify-end gap-1.5 px-3 py-4">
          <div className="mx-auto mb-2 rounded-md bg-white/80 px-2.5 py-1 text-[10px] font-medium text-zinc-600 shadow-sm dark:bg-[#182229] dark:text-zinc-400">
            Hari ini
          </div>
          {text ? (
            <div
              className={cn(
                'relative ml-auto max-w-[88%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-2.5 pb-1 pt-1.5 text-[13px] leading-snug text-zinc-900 shadow-sm transition-opacity dark:bg-[#005c4b] dark:text-zinc-100',
                loading && 'opacity-60',
              )}
            >
              <FormattedMessage text={text} />
              <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-zinc-500 dark:text-zinc-300/70">
                <span>{time}</span>
                <CheckCheck className="size-3.5 text-sky-500" />
              </div>
            </div>
          ) : (
            <p className="px-4 pb-10 text-center text-xs text-zinc-500">
              Ketik isi pesan untuk melihat tampilannya di sini.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
