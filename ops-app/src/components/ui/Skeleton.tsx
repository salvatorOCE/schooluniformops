'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'card' | 'kpi' | 'table-row' | 'circle';
}

function SkeletonBase({ className }: { className?: string }) {
    return (
        <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />
    );
}

export function Skeleton({ className, variant = 'text' }: SkeletonProps) {
    switch (variant) {
        case 'kpi':
            return (
                <div className={cn('bg-white rounded-xl border border-slate-200 p-6 space-y-3', className)}>
                    <SkeletonBase className="h-4 w-24" />
                    <SkeletonBase className="h-8 w-16" />
                    <SkeletonBase className="h-3 w-32" />
                </div>
            );
        case 'card':
            return (
                <div className={cn('bg-white rounded-xl border border-slate-200 p-5 space-y-4', className)}>
                    <div className="flex justify-between items-start">
                        <SkeletonBase className="h-5 w-40" />
                        <SkeletonBase className="h-5 w-16 rounded-full" />
                    </div>
                    <SkeletonBase className="h-4 w-full" />
                    <SkeletonBase className="h-4 w-3/4" />
                    <div className="flex gap-2 pt-2">
                        <SkeletonBase className="h-6 w-20 rounded-full" />
                        <SkeletonBase className="h-6 w-20 rounded-full" />
                    </div>
                </div>
            );
        case 'table-row':
            return (
                <div className={cn('flex items-center gap-4 py-3 px-4 border-b border-slate-100', className)}>
                    <SkeletonBase className="h-4 w-24" />
                    <SkeletonBase className="h-4 w-32" />
                    <SkeletonBase className="h-4 w-20" />
                    <SkeletonBase className="h-4 w-16 ml-auto" />
                </div>
            );
        case 'circle':
            return <SkeletonBase className={cn('h-10 w-10 rounded-full', className)} />;
        default:
            return <SkeletonBase className={cn('h-4 w-full', className)} />;
    }
}

// Convenience component for loading grids of cards
export function SkeletonGrid({ count = 6, variant = 'card' }: { count?: number; variant?: SkeletonProps['variant'] }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton key={i} variant={variant} />
            ))}
        </div>
    );
}
