import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/admin-auth';
import AdminShell from './admin-shell';

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/login?next=/admin');
  }

  return <AdminShell user={admin}>{children}</AdminShell>;
}
