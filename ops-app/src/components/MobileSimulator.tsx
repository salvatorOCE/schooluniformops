'use client';

import React, { useState, useEffect } from 'react';
import { Smartphone, Monitor } from 'lucide-react';
import { useMobile } from '@/lib/mobile-context';

export function MobileSimulator({ children }: { children: React.ReactNode }) {
    const { isSimulating, setIsSimulating } = useMobile();
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

            {/* Toggle Button */}
            <button
                onClick={() => setIsSimulating(!isSimulating)}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-full shadow-lg hover:bg-slate-800 transition-all font-medium text-sm"
            >
                {isSimulating ? (
                    <>
                        <Monitor className="w-5 h-5" />
                        Exit Simulator
                    </>
                ) : (
                    <>
                        <Smartphone className="w-5 h-5" />
                        Simulate Mobile
                    </>
                )}
            </button>
        </div>
    );
}
