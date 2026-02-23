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
            {/* Top Navigation Bar */}
            <header className="h-16 bg-[#002D2B] text-white flex items-center justify-between px-4 border-b border-[#004440] z-40 sticky top-0 shadow-md w-full">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#19966D] rounded-md flex items-center justify-center shadow-lg">
                        <span className="font-bold text-white text-lg">S</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight text-white">OPS APP</span>
                </div>
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-2 hover:bg-[#004440] rounded-md transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </header>

            {/* Slide-over Menu Overlay */}
            {isOpen && (
                <div className="absolute inset-0 z-50 flex flex-col bg-[#002D2B] text-white animate-in slide-in-from-right duration-200 h-full w-full">
                    <div className="h-16 flex items-center justify-between px-4 border-b border-[#004440] bg-[#002523] shrink-0">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-[#19966D] rounded-md flex items-center justify-center shadow-lg">
                                    <span className="font-bold text-white text-lg">S</span>
                                </div>
                                <span className="font-bold text-lg tracking-tight text-white">OPS MANAGER</span>
                            </div>
                            <span className="text-[10px] text-emerald-400/80 font-medium pl-10 -mt-1 tracking-wider uppercase">School Uniform Solutions</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-[#004440] rounded-md transition-colors bg-[#002D2B] shadow-lg"
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
