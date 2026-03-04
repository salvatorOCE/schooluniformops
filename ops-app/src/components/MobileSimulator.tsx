'use client';

import React, { useState, useEffect } from 'react';
import { useMobile } from '@/lib/mobile-context';

export function MobileSimulator({ children }: { children: React.ReactNode }) {
    const { isSimulating } = useMobile();
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) {
        return <div className="min-h-screen w-full">{children}</div>;
    }

    return (
        <div className={isSimulating ? "min-h-screen w-full bg-slate-200 flex items-center justify-center p-4 relative" : ""}>
            {/* The actual app container */}
            <div
                className={
                    isSimulating
                        ? "w-full max-w-[390px] h-[844px] bg-white border-[14px] border-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col"
                        : "min-h-screen w-full"
                }
            >
                {/* Simulated Notch when in mobile mode */}
                {isSimulating && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-3xl z-50"></div>
                )}

                {children}
            </div>
        </div>
    );
}
