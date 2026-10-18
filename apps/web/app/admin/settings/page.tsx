import { redirect } from 'next/navigation';

/** The old mock settings page is gone; send anyone with a bookmark to the real thing. */
export default function AdminSettingsPage() {
  redirect('/admin/settings/profil-studio');
}
