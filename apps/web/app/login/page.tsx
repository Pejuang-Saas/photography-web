import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/lib/admin-auth';
import AdminLoginForm from './login-form';

export default async function LoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect('/admin');
  }

  return <AdminLoginForm />;
}
