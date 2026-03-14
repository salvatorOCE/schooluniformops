'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Redirect /proposals/[id]/edit to /proposals/[id] (detail page). Editor removed in PDF-only v1. */
export default function ProposalEditRedirectPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    useEffect(() => {
        if (id) router.replace(`/proposals/${id}`);
    }, [id, router]);

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center p-8">
            <p className="text-slate-500">Redirecting to proposal…</p>
        </div>
    );
}
