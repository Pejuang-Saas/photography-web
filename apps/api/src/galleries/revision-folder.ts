/** The Drive folder the studio puts finished edits in; photos inside it can get revision requests. */
const EDIT_FOLDER = 'edit';

/** True when a photo sits in a folder named "edit" (any depth, any letter case). */
export function isEditFolder(folderPath: string | null | undefined): boolean {
  if (!folderPath) return false;
  return folderPath.split('/').some((segment) => segment.trim().toLowerCase() === EDIT_FOLDER);
}
