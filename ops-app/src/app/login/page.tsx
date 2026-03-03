'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session-context';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const { refetch } = useSession();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const trimmed = value.trim();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed, password: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Invalid code or password');
        return;
      }
      // Refetch session so Sidebar and other components see the new role (admin vs school)
      await refetch();
      if (data.role === 'school') {
        router.push('/orders');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-950 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="bg-white/95 backdrop-blur border border-slate-200/80 rounded-2xl shadow-xl p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="mb-3 rounded-full bg-slate-50 p-3 shadow-inner">
              <Image
                src="/logo.png"
                alt="School Uniform Solutions logo"
                width={56}
                height={56}
                className="h-14 w-14 object-contain"
                priority
              />
            </div>
            <h1 className="text-xl font-bold text-slate-900 text-center">
              School Uniform Solutions
            </h1>
            <p className="text-sm text-slate-500 text-center">
              Operations portal
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="access" className="block text-sm font-medium text-slate-700 mb-1">
                Access code or school password
              </label>
              <input
                id="access"
                type="password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Enter code or password"
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 font-medium">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !value.trim()}
              className="w-full rounded-lg bg-[var(--brand-primary)] text-white font-medium py-2.5 hover:bg-[var(--brand-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors shadow-sm hover:shadow-md"
            >
              {loading ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                  Checking…
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
