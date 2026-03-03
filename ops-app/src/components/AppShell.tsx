'use client';

import React from 'react';
import { useMobile } from '@/lib/mobile-context';
import { MobileHeader } from './MobileHeader';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
    const { isMobile } = useMobile();

    return (
        <div className={`flex w-full bg-[#F8FAFC] ${isMobile ? 'flex-col h-full' : 'flex-row min-h-[100dvh]'}`}>
            <MobileHeader />
            <Sidebar />
            <main className={`flex-1 overflow-y-auto w-full animate-in relative ${isMobile ? 'px-0 py-2 sm:p-4' : 'p-8'}`}>
                {children}
            </main>
        </div>
    );
}
