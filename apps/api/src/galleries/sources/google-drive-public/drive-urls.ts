export const DRIVE_THUMBNAIL_URL = (fileId: string, size = 'w400') =>
  `https://drive.google.com/thumbnail?id=${fileId}&sz=${size}`;

export const DRIVE_VIEW_URL = (fileId: string) => `https://drive.google.com/file/d/${fileId}/view`;

export const DRIVE_THUMBNAIL_FALLBACK = (fileId: string) =>
  `https://lh3.googleusercontent.com/d/${fileId}`;
