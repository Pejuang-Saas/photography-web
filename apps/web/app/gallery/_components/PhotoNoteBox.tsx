'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NOTE_MAX_LENGTH } from './edit-folder';

/**
 * A note field for one photo with its own save button. Keyed by photo by the caller, so stepping to
 * another photo starts from that photo's saved text.
 */
export default function PhotoNoteBox({
  label,
  placeholder,
  saved,
  readOnly,
  onSave,
}: {
  label: string;
  placeholder: string;
  /** What the server has now. */
  saved: string;
  /** After submitting a pick: the note is shown, not edited. */
  readOnly: boolean;
  /** Rejects with a message to show when saving fails. */
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(saved);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = text.trim() !== saved.trim();

  if (readOnly) {
    return saved ? (
      <div className="w-full text-xs">
        <p className="font-semibold text-zinc-300">{label}</p>
        <p className="mt-1 whitespace-pre-wrap text-zinc-400">{saved}</p>
      </div>
    ) : null;
  }

  const save = async () => {
    setPending(true);
    setError(null);
    try {
      await onSave(text);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Gagal menyimpan catatan');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="w-full space-y-2">
      <label className="block text-xs font-semibold text-zinc-300" htmlFor="photo-note">
        {label}
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id="photo-note"
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          rows={2}
          placeholder={placeholder}
          className="min-h-[3.25rem] w-full resize-y rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:border-amber-500 focus-visible:outline-none"
        />
        <Button
          size="sm"
          disabled={pending || !dirty}
          onClick={save}
          className="shrink-0 gap-1.5 bg-amber-500 font-bold text-zinc-950 hover:bg-amber-600"
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : !dirty && saved ? (
            <Check className="size-3.5" strokeWidth={3} />
          ) : null}
          {!dirty && saved ? 'Tersimpan' : 'Simpan'}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
