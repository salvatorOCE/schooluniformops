'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Scissors,
    Package,
    Bus,
    AlertTriangle,
    User,
    BarChart3,
    Clock,
    Bot,
    ChevronRight,
    Settings,
    Calendar,
    School,
    Search,
    LogOut
} from 'lucide-react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { DensityToggle } from './DensityToggle';
import { useMobile } from '@/lib/mobile-context';

export interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
}

export const navItems: NavItem[] = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/schedule', label: 'Production Schedule', icon: Calendar },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/orders', label: 'Orders', icon: Clock },
    { href: '/embroidery', label: 'Embroidery', icon: Scissors },
    { href: '/distribution', label: 'Distribution', icon: Package },
    { href: '/school-runs', label: 'School Bulk', icon: Bus },
    { href: '/exceptions', label: 'Recovery Center', icon: AlertTriangle },
    { href: '/ai-bot', label: 'AI Assistant', icon: Bot },
    { href: '/school-portal', label: 'School Portal', icon: School },
    { href: '/digital-stock', label: 'Digital In-House Stock', icon: Package },
    { href: '/tracking', label: 'Order Tracking', icon: Search },
];

interface SidebarProps {
    exceptionCount?: number;
}

export function Sidebar({ exceptionCount = 0 }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { isMobile } = useMobile();
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean, message: string } | null>(null);

    const handleManualSync = async (fullSync = false) => {
        if (fullSync && !confirm('Full re-sync will fetch ALL orders from WooCommerce. This may take a minute. Continue?')) {
            return;
        }
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await fetch('/api/woo/pull-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullSync })
            });
            const data = await res.json();
            if (data.success) {
                setSyncResult({
                    success: true,
                    message: data.count > 0 ? `Updated ${data.count} order${data.count > 1 ? 's' : ''}` : 'All up to date ✓'
                });
            } else {
                setSyncResult({ success: false, message: data.error || 'Sync failed' });
            }
        } catch (err) {
            setSyncResult({ success: false, message: 'Network error' });
        } finally {
            setSyncing(false);
            setTimeout(() => setSyncResult(null), 5000);
        }
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    if (isMobile) return null;

    return (
        <aside className="w-64 min-h-screen flex flex-col z-20 bg-[#002D2B] text-white border-r border-[#004440] shadow-xl">
            {/* Brand Header */}
            <div className="h-20 px-6 flex items-center border-b border-[#004440] bg-[#002523]">
                <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-[#19966D] rounded-md flex items-center justify-center shadow-lg shadow-emerald-900/50">
                            <span className="font-bold text-white text-lg">S</span>
                        </div>
                        <span className="font-bold text-lg tracking-tight text-white">OPS MANAGER</span>
                    </div>
                    <span className="text-[10px] text-emerald-400/80 font-medium pl-10 -mt-1 tracking-wider uppercase">School Uniform Solutions</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
                <div className="px-3 mb-2 text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">Modules</div>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
                    const isRecovery = item.href === '/exceptions';
                    const showBadge = isRecovery && exceptionCount > 0;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group relative',
                                isActive
                                    ? 'bg-[#19966D] text-white shadow-md shadow-emerald-900/20 font-medium'
                                    : 'text-emerald-100/70 hover:bg-[#003836] hover:text-white'
                            )}
                        >
                            <item.icon className={cn(
                                "w-4 h-4 transition-colors",
                                isActive ? "text-white" : "text-emerald-400/70 group-hover:text-emerald-300"
                            )} />
                            <span className="flex-1 text-sm tracking-wide">{item.label}</span>

                            {isActive && <ChevronRight className="w-3 h-3 text-emerald-200" />}

                            {showBadge && (
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                    {exceptionCount}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User Profile / Context */}
            <div className="p-4 border-t border-[#004440] bg-[#002523] space-y-4">

                {/* Manual Sync Utility */}
                <div className="bg-[#001D1B] p-2 rounded-lg border border-[#003B38] space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-emerald-400/80 px-2 flex-1">
                            {syncResult ? (
                                <span className={syncResult.success ? "text-emerald-400 flex items-center gap-1" : "text-red-400 flex items-center gap-1"}>
                                    {syncResult.success && <CheckCircle2 className="w-3 h-3" />}
                                    {syncResult.message}
                                </span>
                            ) : "WooCommerce Data"}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => handleManualSync(false)}
                                disabled={syncing}
                                className="p-1.5 flex items-center gap-1 bg-[#19966D] hover:bg-[#15805C] disabled:opacity-50 text-white rounded text-[10px] font-bold tracking-wider transition-colors shadow-sm"
                            >
                                <RefreshCw className={cn("w-3 h-3", syncing && "animate-spin")} />
                                SYNC
                            </button>
                            <button
                                onClick={() => handleManualSync(true)}
                                disabled={syncing}
                                className="p-1.5 flex items-center gap-1 bg-[#004440] hover:bg-[#005550] disabled:opacity-50 text-emerald-300 rounded text-[10px] font-bold tracking-wider transition-colors shadow-sm border border-[#005550]"
                                title="Full re-sync: fetch ALL orders from WooCommerce"
                            >
                                FULL
                            </button>
                        </div>
                    </div>
                </div>

                <DensityToggle />

                <div className="flex items-center gap-3 group cursor-pointer hover:bg-[#003836] p-2 rounded-lg transition-colors">
                    <div className="w-9 h-9 rounded bg-[#004440] flex items-center justify-center border border-[#005550] shadow-inner text-emerald-200">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold text-emerald-50 truncate">Michael B.</span>
                        <span className="text-[10px] text-emerald-400/80 truncate">Warehouse Manager</span>
                    </div>
                    <Settings className="w-4 h-4 text-emerald-600 group-hover:text-emerald-400 transition-colors" />
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-300/90 hover:bg-[#003836] hover:text-white text-xs font-medium transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
