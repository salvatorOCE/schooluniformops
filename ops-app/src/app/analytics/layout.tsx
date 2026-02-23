'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AnalyticsFilterProvider } from '@/lib/analytics-context';
import { SmartFilterBar } from '@/components/analytics/SmartFilterBar';

const tabs = [
    { label: 'Overview', href: '/analytics' },
    { label: 'Schools', href: '/analytics/schools' },
    { label: 'Products', href: '/analytics/products' },
    { label: 'Orders', href: '/analytics/orders' },
    { label: 'Production', href: '/analytics/production' },
    { label: 'Exceptions', href: '/analytics/exceptions' },
];

export default function AnalyticsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <AnalyticsFilterProvider>
            <div className="flex flex-col h-full">
                <div className="mb-4">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-4">Analytics</h1>

                    {/* Tab Navigation */}
                    <div className="flex items-center gap-1 border-b border-slate-200 mb-4">
                        {tabs.map((tab) => {
                            const isActive = pathname === tab.href;
                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                        isActive
                                            ? "border-slate-900 text-slate-900"
                                            : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                                    )}
                                >
                                    {tab.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Smart Filter Bar */}
                    <SmartFilterBar />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </AnalyticsFilterProvider>
    );
}
