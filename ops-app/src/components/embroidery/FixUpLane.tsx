'use client';

import { FixUpRequest, OrderStatus } from '@/lib/types';
import { getStatusLabel } from '@/lib/utils';
import { AlertTriangle, ArrowRight, Scissors } from 'lucide-react';

interface FixUpLaneProps {
    fixUps: FixUpRequest[];
    onRun: (fixUpId: string, itemId: string) => void;
}

export function FixUpLane({ fixUps, onRun }: FixUpLaneProps) {
    // Filter for items that actually need embroidery actions
    // In a real app we'd filter at the page level or here.

    if (fixUps.length === 0) return null;

    return (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl overflow-hidden mb-8 shadow-sm">
            <div className="bg-red-100/50 px-6 py-3 border-b border-red-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-red-600 text-white p-1.5 rounded-full animate-pulse">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-bold text-red-900">Priority Fix-Up Lane</h2>
                </div>
                <div className="text-sm font-bold text-red-700 bg-white/50 px-3 py-1 rounded-full">
                    {fixUps.length} ACTIVE JOBS
                </div>
            </div>

            <div className="divide-y divide-red-100">
                {fixUps.map(fix => (
                    <div key={fix.id} className="p-4 flex items-center gap-4 hover:bg-white/40 transition-colors">
                        {/* Priority Indicator */}
                        <div className="w-2 h-12 bg-red-500 rounded-full" />

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-slate-900 text-lg">{fix.student_name}</span>
                                <span className="text-xs font-mono text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                                    {fix.original_order_number}
                                </span>
                            </div>
                            <div className="text-sm text-red-800 font-medium flex items-center gap-2">
                                <span className="uppercase tracking-wider text-[10px] font-bold bg-white/80 px-1 rounded border border-red-200">
                                    {fix.type.replace(/_/g, ' ')}
                                </span>
                                <span className="text-slate-500">• {fix.school_name}</span>
                            </div>
                            {fix.notes && (
                                <div className="mt-1 text-xs text-slate-600 italic">
                                    "{fix.notes}"
                                </div>
                            )}
                        </div>

                        {/* Items to Run */}
                        <div className="flex gap-3">
                            {fix.items.filter(i => i.requires_embroidery && i.embroidery_status !== 'DONE').map(item => (
                                <div key={item.id} className="bg-white border-2 border-red-100 rounded-lg p-3 flex items-center gap-4 shadow-sm min-w-[250px]">
                                    <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center font-bold text-slate-700 shrink-0">
                                        {item.size}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900 text-sm truncate">{item.product_name}</div>
                                        <div className="text-xs text-slate-500">{item.sku}</div>
                                    </div>
                                    <button
                                        onClick={() => onRun(fix.id, item.id)}
                                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow-md hover:scale-105 active:scale-95 transition-all"
                                        title="Run Job"
                                    >
                                        <Scissors className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
