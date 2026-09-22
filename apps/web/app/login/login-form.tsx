'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Camera, LoaderCircle, LockKeyhole, Mail } from 'lucide-react';
import { authClient, apiUrl } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function safeDestination(value: string | null) {
  return value?.startsWith('/admin') && !value.startsWith('//')
    ? value
    : '/admin';
}

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const next = safeDestination(searchParams.get('next'));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    });

    if (signInError) {
      setError('Email atau password tidak valid.');
      setIsSubmitting(false);
      return;
    }

    const access = await fetch(`${apiUrl}/admin/auth/me`, {
      credentials: 'include',
    });

    if (!access.ok) {
      await authClient.signOut();
      setError('Akun ini tidak memiliki akses admin.');
      setIsSubmitting(false);
      return;
    }

    router.replace(next);
    router.refresh();
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(120,113,108,0.14),transparent_32%)]" />
      <section className="relative w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-white">
          <ArrowLeft className="size-3.5" />
          Kembali ke website
        </Link>
        <div className="mb-8">
          <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20">
            <Camera className="size-5" />
          </div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-400">Kayastory Studio</p>
          <h1 className="text-2xl font-extrabold tracking-tight">Masuk ke Admin</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">Gunakan akun admin untuk mengelola reservasi dan operasional studio.</p>
        </div>
        {searchParams.get('reason') === 'forbidden' && !error && (
          <p className="mb-5 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-200">Sesi tidak memiliki akses admin. Silakan masuk dengan akun yang benar.</p>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-zinc-300">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@kayastory.com" required className="h-11 border-zinc-700 bg-zinc-950/70 pl-10 text-sm text-white placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20" />
            </div>
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-semibold text-zinc-300">Password</span>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <Input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Masukkan password" required className="h-11 border-zinc-700 bg-zinc-950/70 pl-10 text-sm text-white placeholder:text-zinc-600 focus-visible:border-amber-500 focus-visible:ring-amber-500/20" />
            </div>
          </label>
          {error && <p className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2.5 text-xs leading-relaxed text-rose-200">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-xl bg-amber-500 font-bold text-zinc-950 hover:bg-amber-400">
            {isSubmitting ? <><LoaderCircle className="size-4 animate-spin" />Memeriksa akun…</> : 'Masuk ke Dashboard'}
          </Button>
        </form>
      </section>
    </main>
  );
}
