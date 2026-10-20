import { useCallback, useState } from 'react';
import type { FolderSummary } from '@/types/gallery';

/** The folders opened one inside the other, so each level above stays a click away. */
export function useFolderTrail() {
  const [trail, setTrail] = useState<FolderSummary[]>([]);
  const open = useCallback(
    (folder: FolderSummary) => setTrail((current) => [...current, folder]),
    [],
  );
  /** Back to a folder already in the trail; an empty path is the shared folder itself. */
  const goTo = useCallback(
    (path: string) =>
      setTrail((current) => {
        if (!path) return [];
        const index = current.findIndex((folder) => folder.path === path);
        return index < 0 ? current : current.slice(0, index + 1);
      }),
    [],
  );
  const current = trail.at(-1) ?? null;
  return { trail, current, path: current?.path ?? '', open, goTo };
}
