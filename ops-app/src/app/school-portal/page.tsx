'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** School portal module removed: school users see Orders, Recovery Center, Product list in the main app. Redirect to Orders. */
export default function SchoolPortalPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/orders');
    }, [router]);
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
            <p className="text-slate-500">Redirecting to Orders…</p>
        </div>
    );
}
