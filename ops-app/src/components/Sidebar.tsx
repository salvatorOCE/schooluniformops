'use client';

import React, { useState, useEffect } from 'react';
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
    Search,
    LogOut,
    StickyNote,
    ListOrdered
} from 'lucide-react';
import { RefreshCw, CheckCircle2 } from 'lucide-react';
import { useMobile } from '@/lib/mobile-context';
import { useSession } from '@/lib/session-context';
import { useData } from '@/lib/data-provider';

export interface NavItem {
    href: string;
    label: string;
    icon: React.ElementType;
    badge?: number;
}

/** Important Notes — pinned at top for all modules */
export const importantNotesNavItem: NavItem = {
    href: '/important-notes',
    label: 'Important Notes',
    icon: StickyNote,
};

/** Nav for school users (non-admin): Orders, Recovery Center, Product list only */
export const schoolNavItems: NavItem[] = [
    { href: '/orders', label: 'Orders', icon: Clock },
    { href: '/exceptions', label: 'Recovery Center', icon: AlertTriangle },
    { href: '/products', label: 'Product list', icon: ListOrdered },
];

export const navItems: NavItem[] = [
    importantNotesNavItem,
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/schedule', label: 'Production Schedule', icon: Calendar },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/orders', label: 'Orders', icon: Clock },
    { href: '/embroidery', label: 'Embroidery', icon: Scissors },
    { href: '/distribution', label: 'Distribution', icon: Package },
    { href: '/school-runs', label: 'School Bulk', icon: Bus },
    { href: '/exceptions', label: 'Recovery Center', icon: AlertTriangle },
    { href: '/ai-bot', label: 'AI Assistant', icon: Bot },
    { href: '/digital-stock', label: 'Digital In-House Stock', icon: Package },
    { href: '/products', label: 'All Products', icon: ListOrdered },
    { href: '/tracking', label: 'Order Tracking', icon: Search },
];

/** Main production-ready modules (top of nav); Important Notes is first */
export const mainNavItems: NavItem[] = [
    importantNotesNavItem,
    { href: '/schedule', label: 'Production Schedule', icon: Calendar },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/orders', label: 'Orders', icon: Clock },
    { href: '/distribution', label: 'Distribution', icon: Package },
    { href: '/school-runs', label: 'School Bulk', icon: Bus },
    { href: '/exceptions', label: 'Recovery Center', icon: AlertTriangle },
    { href: '/digital-stock', label: 'Digital In-House Stock', icon: Package },
    { href: '/products', label: 'All Products', icon: ListOrdered },
];

/** Work in progress (bottom section) */
export const workInProgressNavItems: NavItem[] = [
    { href: '/', label: 'Overview', icon: LayoutDashboard },
    { href: '/embroidery', label: 'Embroidery', icon: Scissors },
    { href: '/ai-bot', label: 'AI Assistant', icon: Bot },
    { href: '/tracking', label: 'Order Tracking', icon: Search },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isMobile } = useMobile();
    const adapter = useData();
    const { role, schoolCode, loading: sessionLoading } = useSession();
    // While session is loading, show school (restricted) nav so school users never see a flash of admin modules
    const isSchool = sessionLoading || role === 'school';
    const [recoveryCount, setRecoveryCount] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState<{ success: boolean, message: string } | null>(null);
    const [showSettings, setShowSettings] = useState(false);

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

    // Load Recovery Center badge count (exceptions + active fix-ups), scoped by school for school users
    useEffect(() => {
        let cancelled = false;
        const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();

        const loadRecoveryCount = async () => {
            try {
                const [exceptions, fixUps] = await Promise.all([
                    adapter.getExceptions(),
                    adapter.getFixUps()
                ]);

                let scopedExceptions = exceptions;
                let scopedFixUps = fixUps;

                if (isSchool && schoolCode) {
                    const target = norm(schoolCode);
                    if (target) {
                        const matchBySchool = (name?: string | null, code?: string | null) => {
                            const n = norm(name);
                            const c = norm(code);
                            if (c && (c === target || c.startsWith(target) || target.startsWith(c))) return true;
                            if (n && (n.includes(target) || target.includes(n))) return true;
                            return false;
                        };
                        scopedExceptions = exceptions.filter(e => matchBySchool(e.school_name, e.school_code));
                        scopedFixUps = fixUps.filter(f => matchBySchool(f.school_name, (f as any).school_code));
                    }
                }

                const activeFixUps = scopedFixUps.filter(f => f.status !== 'CLOSED');
                const count = scopedExceptions.length + activeFixUps.length;
                if (!cancelled) setRecoveryCount(count);
            } catch (e) {
                if (!cancelled) setRecoveryCount(0);
            }
        };

        loadRecoveryCount();
        return () => { cancelled = true; };
    }, [adapter, isSchool, schoolCode]);

    if (isMobile) return null;

    return (
        <aside className="w-64 min-h-screen flex flex-col z-20 bg-[#002D2B] text-white border-r border-[#004440] shadow-xl">
            {/* Brand Header — light green banner, logo fills height */}
            <div className="px-3 py-0 flex items-stretch border-b border-emerald-200 bg-emerald-100 h-[125px] min-h-[125px]">
                <Link href="/" className="flex items-stretch w-full">
                    <img src="/logo.png" alt="School Uniform Solutions" className="h-full w-auto max-w-full object-contain object-left" />
                </Link>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 flex flex-col overflow-y-auto">
                <div className="px-3 mb-2 text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest">
                    {isSchool ? 'School view' : 'Modules'}
                </div>
                <div className="space-y-1">
                    {(isSchool ? schoolNavItems : mainNavItems).map((item) => {
                        const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');
                        const isRecovery = item.href === '/exceptions';
                        const showBadge = isRecovery && recoveryCount > 0;

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
                                        {recoveryCount}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Work in progress — bottom section (admin only) */}
                {!isSchool && (
                <div className="mt-auto pt-6 pb-2">
                    <div className="px-3 mb-2 text-[10px] font-bold text-amber-500/70 uppercase tracking-widest">Work in progress</div>
                    <div className="space-y-1">
                        {workInProgressNavItems.map((item) => {
                            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/');

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 group relative',
                                        isActive
                                            ? 'bg-[#19966D] text-white shadow-md shadow-emerald-900/20 font-medium'
                                            : 'text-emerald-100/50 hover:bg-[#003836] hover:text-emerald-100/80'
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-4 h-4 transition-colors",
                                        isActive ? "text-white" : "text-emerald-500/50 group-hover:text-emerald-400/70"
                                    )} />
                                    <span className="flex-1 text-sm tracking-wide">{item.label}</span>
                                    {isActive && <ChevronRight className="w-3 h-3 text-emerald-200" />}
                                </Link>
                        );
                    })}
                    </div>
                </div>
                )}
            </nav>

            {/* User Profile / Context */}
            <div className="p-4 border-t border-[#004440] bg-[#002523] space-y-4">

                {/* Manual Sync Utility (admin only) */}
                {!isSchool && (
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
                )}

                <div className="flex items-center gap-3 group p-2 rounded-lg">
                    <div className="w-9 h-9 rounded bg-[#004440] flex items-center justify-center border border-[#005550] shadow-inner text-emerald-200">
                        <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-sm font-semibold text-emerald-50 truncate">
                            {isSchool ? `${schoolCode ?? 'School'} Portal` : 'School Uniform Solutions Admin'}
                        </span>
                        <span className="text-[10px] text-emerald-400/80 truncate">{isSchool ? 'School view' : 'Admin'}</span>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 -m-2 rounded-lg text-emerald-600 hover:text-emerald-400 hover:bg-[#003836] transition-colors"
                        title="Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-300/90 hover:bg-[#003836] hover:text-white text-xs font-medium transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign out
                </button>
            </div>

            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 sm:items-center sm:p-4" onClick={() => setShowSettings(false)}>
                    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-slate-500" />
                                App settings
                            </h3>
                            <button onClick={() => setShowSettings(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                                <span className="sr-only">Close</span>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-4 space-y-6">
                            <div className="pt-2 border-t border-slate-100">
                                <p className="text-xs text-slate-500">WooCommerce sync is in the sidebar (SYNC / FULL). Sign out below.</p>
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => setShowSettings(false)} className="w-full px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Done</button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
