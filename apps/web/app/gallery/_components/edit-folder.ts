/** Same rule as the API: a photo in a folder named "edit" (any depth, any case) can get revisions. */
export const isEditPhoto = (photo: { folderPath: string | null }) =>
  !!photo.folderPath &&
  photo.folderPath.split('/').some((segment) => segment.trim().toLowerCase() === 'edit');

/** Longest note the API accepts. */
export const NOTE_MAX_LENGTH = 1000;
