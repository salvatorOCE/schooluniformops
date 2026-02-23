'use client';

import { SystemEvent, OrderStatus } from '@/lib/types';
import { getStatusLabel } from '@/lib/utils';
import { Circle, CheckCircle, Truck, Package, Edit, AlertCircle } from 'lucide-react';

interface OrderTimelineProps {
    events: SystemEvent[];
}

export function OrderTimeline({ events }: OrderTimelineProps) {
    if (events.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                No history recorded for this order yet.
            </div>
        );
    }

    return (
        <div className="relative space-y-8 pl-4 top-2">
            {/* Vertical Line */}
            <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-slate-200" />

            {events.map((event, idx) => {
                const date = new Date(event.timestamp);
                const isLatest = idx === 0;

                return (
                    <div key={event.id} className="relative flex gap-4">
                        {/* Icon Node */}
                        <div className={`
                            relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 
                            ${isLatest ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-300 text-slate-400'}
                        `}>
                            {getEventIcon(event)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-1">
                            <div className="flex items-center justify-between">
                                <p className={`text-sm font-medium ${isLatest ? 'text-blue-900' : 'text-slate-900'}`}>
                                    {getEventTitle(event)}
                                </p>
                                <time className="text-xs text-slate-500 whitespace-nowrap ml-2">
                                    {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </time>
                            </div>

                            <p className="text-sm text-slate-600 mt-1">
                                {getEventDescription(event)}
                            </p>

                            {/* Metadata/Diff */}
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="mt-2 text-xs bg-slate-50 p-2 rounded border border-slate-100 font-mono text-slate-500">
                                    {JSON.stringify(event.metadata, null, 2)}
                                </div>
                            )}

                            <div className="mt-1 text-xs text-slate-400">
                                Actor: <span className="font-medium text-slate-600">{event.actor_id}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function getEventIcon(event: SystemEvent) {
    switch (event.event_type) {
        case 'STATUS_CHANGE':
            if (event.new_state?.status === 'DISPATCHED') return <Truck className="w-3 h-3" />;
            if (event.new_state?.status === 'PACKED') return <Package className="w-3 h-3" />;
            if (event.new_state?.status === 'AWAITING_PACK') return <CheckCircle className="w-3 h-3" />;
            return <Circle className="w-3 h-3" />;
        case 'EDIT':
            return <Edit className="w-3 h-3" />;
        case 'NOTE':
            return <AlertCircle className="w-3 h-3" />;
        default:
            return <Circle className="w-3 h-3" />;
    }
}

function getEventTitle(event: SystemEvent) {
    switch (event.event_type) {
        case 'STATUS_CHANGE':
            return `Status Updated: ${event.new_state?.status ? getStatusLabel(event.new_state.status as OrderStatus) : 'Unknown'}`;
        case 'EDIT':
            return 'Order Details Edited';
        case 'NOTE':
            return 'Note Added';
        default:
            return 'System Event';
    }
}

function getEventDescription(event: SystemEvent) {
    if (event.event_type === 'STATUS_CHANGE') {
        const prev = event.prev_state?.status ? getStatusLabel(event.prev_state.status as OrderStatus) : 'None';
        const next = event.new_state?.status ? getStatusLabel(event.new_state.status as OrderStatus) : 'Unknown';
        return `Changed from ${prev} to ${next}`;
    }
    return 'Event recorded in system log.';
}
