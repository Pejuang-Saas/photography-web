import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service';
import { pagination } from './gallery-errors';

export type PhotoFilter = 'all' | 'selected' | 'unselected';

/** Which kind of file a list shows: photos, videos, or both. */
export type MediaType = 'all' | 'photo' | 'video';

export type FolderSummary = {
  name: string;
  /** Names from the top, joined by "/", the same shape as a photo's `folderPath`. */
  path: string;
  /** Photos inside, subfolders included. */
  count: number;
  /** Of those, how many the session picked; 0 without a session. */
  selected: number;
};

export const parsePhotoFilter = (value?: string): PhotoFilter =>
  value === 'selected' || value === 'unselected' ? value : 'all';

export const parseMediaType = (value?: string): MediaType =>
  value === 'photo' || value === 'video' ? value : 'all';

const VIDEO = { startsWith: 'video/' };

/** A file with no recorded type counts as a photo, since that is all the sync kept before videos. */
export const mediaTypeWhere = (type: MediaType): Prisma.GalleryPhotoWhereInput =>
  type === 'video'
    ? { mimeType: VIDEO }
    : type === 'photo'
      ? { OR: [{ mimeType: null }, { NOT: { mimeType: VIDEO } }] }
      : {};

/**
 * One page of a gallery's photos, the way a person browses it: the open folder's own photos (or,
 * for the selected / unselected tabs, every folder at once). The folders directly inside the open
 * one come with the first page only, so scrolling further costs one query each.
 */
export async function browsePhotos(
  prisma: PrismaService,
  options: {
    galleryId: string;
    /** The open folder; "" is the shared folder itself. Undefined lists every photo flat. */
    folder?: string;
    filter?: PhotoFilter;
    type?: MediaType;
    /** The customer's draft, needed for the selected / unselected tabs and folder counts. */
    selectionId?: string;
    isActive?: boolean;
    page: number;
    limit: number;
    skip: number;
    select?: Prisma.GalleryPhotoSelect;
  },
) {
  const { galleryId, folder, selectionId, isActive, page, limit, skip, select } = options;
  const filter = options.filter ?? 'all';
  const type = options.type ?? 'all';

  const base: Prisma.GalleryPhotoWhereInput = {
    galleryId,
    ...(isActive !== undefined && { isActive }),
    ...(type !== 'all' && { AND: [mediaTypeWhere(type)] }),
  };
  const where: Prisma.GalleryPhotoWhereInput = { ...base };
  if (filter !== 'all' && selectionId) {
    where.selectionItems =
      filter === 'selected' ? { some: { selectionId } } : { none: { selectionId } };
  } else if (folder !== undefined) {
    where.folderPath = folder === '' ? null : folder;
  }

  const [items, total] = await Promise.all([
    prisma.galleryPhoto.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { filename: 'asc' }],
      skip,
      take: limit,
      ...(select && { select }),
    }),
    prisma.galleryPhoto.count({ where }),
  ]);

  const withFolders = page === 1 && folder !== undefined && filter === 'all';
  const folders = withFolders
    ? await folderSummaries(prisma, base, folder, selectionId)
    : undefined;

  return { items, ...(folders && { folders }), ...pagination(page, limit, total) };
}

async function folderSummaries(
  prisma: PrismaService,
  base: Prisma.GalleryPhotoWhereInput,
  folder: string,
  selectionId?: string,
): Promise<FolderSummary[]> {
  const prefix = folder ? `${folder}/` : '';
  const below: Prisma.GalleryPhotoWhereInput = {
    ...base,
    folderPath: prefix ? { startsWith: prefix } : { not: null },
  };

  const [counts, picked] = await Promise.all([
    prisma.galleryPhoto.groupBy({ by: ['folderPath'], where: below, _count: { _all: true } }),
    selectionId
      ? prisma.selectionItem.findMany({
          where: { selectionId, photo: below },
          select: { photo: { select: { folderPath: true } } },
        })
      : Promise.resolve([]),
  ]);

  const childOf = (path: string | null) =>
    path && path.startsWith(prefix) ? path.slice(prefix.length).split('/')[0] : null;
  const folders = new Map<string, FolderSummary>();
  const entry = (name: string) => {
    let found = folders.get(name);
    if (!found) {
      found = { name, path: `${prefix}${name}`, count: 0, selected: 0 };
      folders.set(name, found);
    }
    return found;
  };
  for (const row of counts) {
    const name = childOf(row.folderPath);
    if (name) entry(name).count += row._count._all;
  }
  for (const item of picked) {
    const name = childOf(item.photo.folderPath);
    if (name) entry(name).selected += 1;
  }

  return [...folders.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  );
}
