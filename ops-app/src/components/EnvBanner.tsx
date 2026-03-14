'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Shows a banner when the server is not configured (e.g. missing Supabase env on Netlify).
 * Helps explain why orders/exceptions appear empty on deploy vs localhost.
 */
export function EnvBanner() {
    const [show, setShow] = useState<boolean | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetch('/api/env-check')
            .then((res) => res.json())
            .then((data: { configured?: boolean }) => {
                if (!cancelled && data?.configured === false) setShow(true);
                else if (!cancelled) setShow(false);
            })
            .catch(() => {
                if (!cancelled) setShow(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    if (show !== true || dismissed) return null;

    return (
        <div
            role="alert"
            className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900"
        >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">Data not loading — environment not configured</p>
                <p className="mt-1 text-amber-800">
                    Set <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_URL</code>,{' '}
                    <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, and{' '}
                    <code className="rounded bg-amber-100 px-1">SUPABASE_SERVICE_ROLE_KEY</code> in{' '}
                    <code className="rounded bg-amber-100 px-1">.env.local</code> for local dev (restart the dev server after changing), or in Netlify (Site configuration → Environment variables) for deploy.
                </p>
            </div>
            <button
                type="button"
                onClick={() => setDismissed(true)}
                className="shrink-0 rounded p-1 text-amber-600 hover:bg-amber-100"
                aria-label="Dismiss"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
