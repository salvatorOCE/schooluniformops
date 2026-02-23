'use client';

import { useState, useEffect } from 'react';
import { Check, CloudOff, Loader2 } from 'lucide-react';

interface WooSyncBadgeProps {
    synced: boolean;
    syncing?: boolean;
    className?: string;
}

export function WooSyncBadge({ synced, syncing = false, className = '' }: WooSyncBadgeProps) {
    if (syncing) {
        return (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 ${className}`}>
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                Syncing
            </span>
        );
    }

    if (synced) {
        return (
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 ${className}`}>
                <Check className="w-2.5 h-2.5" />
                Synced
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-medium text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 ${className}`}>
            <CloudOff className="w-2.5 h-2.5" />
            Pending
        </span>
    );
}
