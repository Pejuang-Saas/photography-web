import type { Photo } from '@/types/gallery';

export const isVideo = (photo: Photo) => photo.mimeType?.startsWith('video/') ?? false;

/** Drive's own player, built to be embedded; it streams the file without it being downloaded first. */
export const videoPlayerUrl = (photo: Photo) =>
  `https://drive.google.com/file/d/${photo.driveFileId}/preview`;
