'use client';

import { ScheduleEvent, StaffMember } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductionCardProps {
    event: ScheduleEvent;
    staff: StaffMember[];
    onClick?: () => void;
}

export function ProductionCard({ event, staff, onClick }: ProductionCardProps) {
    const assignedStaff = staff.filter(s => event.staff_ids.includes(s.id));

    // Type Styles
    const typeStyles = {
        'PRODUCTION': 'border-l-indigo-500 bg-white',
        'EMBROIDERY': 'border-l-amber-500 bg-white',
        'DISPATCH': 'border-l-emerald-500 bg-white',
        'FIX_UP': 'border-l-rose-500 bg-rose-50/50',
        'SENIOR_PRIORITY': 'border-l-purple-600 bg-purple-50/30'
    };

    const statusIcon = {
        'SCHEDULED': <Clock className="w-3 h-3 text-slate-400" />,
        'IN_PROGRESS': <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />,
        'COMPLETED': <CheckCircle2 className="w-3 h-3 text-emerald-600" />,
        'DELIVERED': <CheckCircle2 className="w-3 h-3 text-slate-400" />, // Muted check
        'EXCEPTION': <AlertCircle className="w-3 h-3 text-red-600" />
    };

    return (
        <div
            onClick={onClick}
            className={cn(
                "group relative border border-slate-200 border-l-4 rounded p-2 text-xs shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden h-full flex flex-col",
                typeStyles[event.type] || 'border-l-slate-400 bg-white'
            )}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-1 gap-1">
                <span className="font-bold text-slate-800 leading-tight line-clamp-2">{event.title}</span>
                <div className="shrink-0 pt-0.5">
                    {statusIcon[event.status]}
                </div>
            </div>

            {/* Time / Metadata */}
            <div className="mt-auto pt-2 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400">
                    {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                {/* Staff Avatars */}
                <div className="flex -space-x-1.5">
                    {assignedStaff.map(s => (
                        <div
                            key={s.id}
                            className={cn(
                                "w-4 h-4 rounded-full flex items-center justify-center text-[8px] text-white font-bold ring-1 ring-white",
                                s.avatar_color || 'bg-slate-400'
                            )}
                            title={s.name}
                        >
                            {s.initials}
                        </div>
                    ))}
                </div>
            </div>

            {/* Hover Expansion (subtle) */}
            <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
}
