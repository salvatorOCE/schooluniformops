'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut } from 'lucide-react';
import { navItems } from './Sidebar';
import { cn } from '@/lib/utils';
import { useMobile } from '@/lib/mobile-context';

export function MobileHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { isMobile } = useMobile();

    const handleLogout = async () => {
        setIsOpen(false);
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    if (!isMobile) return null;

    return (
        <>
            {/* Top Navigation Bar — light green banner, logo fills height */}
            <header className="relative h-[104px] min-h-[104px] bg-emerald-100 flex items-stretch px-3 py-0 border-b border-emerald-200 z-40 sticky top-0 shadow-md w-full">
                <Link href="/" className="flex items-stretch flex-1 min-w-0 justify-start">
                    <img src="/logo.png" alt="School Uniform Solutions" className="h-full w-auto max-w-full object-contain object-left" />
                </Link>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 hover:bg-emerald-200/80 rounded-md transition-colors text-slate-700 absolute right-4 top-1/2 -translate-y-1/2"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </header>

            {/* Slide-over Menu Overlay */}
            {isOpen && (
                <div className="absolute inset-0 z-50 flex flex-col bg-[#002D2B] text-white animate-in slide-in-from-right duration-200 h-full w-full">
                    <div className="relative h-[104px] min-h-[104px] flex items-stretch px-3 py-0 border-b border-emerald-200 bg-emerald-100 shrink-0">
                        <Link href="/" onClick={() => setIsOpen(false)} className="flex items-stretch flex-1 min-w-0 justify-start">
                            <img src="/logo.png" alt="School Uniform Solutions" className="h-full w-auto max-w-full object-contain object-left" />
                        </Link>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-emerald-200/80 rounded-md transition-colors text-slate-700 absolute right-4 top-1/2 -translate-y-1/2"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-2">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all font-medium text-[15px]',
                                        isActive
                                            ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg'
                                            : 'text-emerald-50 hover:bg-[#004440]/60 hover:text-white'
                                    )}
                                >
                                    <Icon className={cn("w-5 h-5", isActive ? "opacity-100" : "opacity-70")} />
                                    {item.label}
                                </Link>
                            );
                        })}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-emerald-50 hover:bg-[#004440]/60 hover:text-white font-medium text-[15px] mt-4 border-t border-[#004440] pt-4"
                        >
                            <LogOut className="w-5 h-5 opacity-70" />
                            Sign out
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
