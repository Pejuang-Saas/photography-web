/**
 * The link to send a customer. NEXT_PUBLIC_GALLERY_BASE_URL overrides the address the API was
 * configured with, for when the public site lives somewhere else than the API thinks.
 */
export function galleryLink(gallery: { publicToken: string; publicUrl: string }) {
  const base = process.env.NEXT_PUBLIC_GALLERY_BASE_URL?.replace(/\/$/, '');
  return base ? `${base}/${gallery.publicToken}` : gallery.publicUrl;
}
