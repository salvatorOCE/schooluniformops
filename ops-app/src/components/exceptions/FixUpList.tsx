'use client';

import { FixUpRequest } from '@/lib/types';
import { AlertCircle, RefreshCw, Scissors, Truck, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface FixUpListProps {
    fixUps: FixUpRequest[];
    onSelect: (fixUp: FixUpRequest) => void;
    onUpdateStatus: (id: string, status: any) => void;
}

const TYPE_CONFIG = {
    'SIZE_EXCHANGE': { icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100' },
    'PRINT_ERROR': { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    'EMBROIDERY_ERROR': { icon: Scissors, color: 'text-purple-600', bg: 'bg-purple-100' },
    'WRONG_PERSONALISATION': { icon: UserIcon, color: 'text-orange-600', bg: 'bg-orange-100' },
    'DAMAGED_ITEM': { icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-200' },
    'MISSING_ITEM': { icon: PackageX, color: 'text-amber-600', bg: 'bg-amber-100' },
    'OTHER': { icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-100' },
};

const STATUSES = {
    'OPEN': { label: 'Open', bg: 'bg-slate-100 text-slate-700' },
    'WAITING_STOCK': { label: 'Ordering Stock', bg: 'bg-amber-100 text-amber-700' },
    'IN_PRODUCTION': { label: 'In Production', bg: 'bg-purple-100 text-purple-700' },
    'PACKED': { label: 'Packed', bg: 'bg-blue-100 text-blue-700' },
    'DISPATCHED': { label: 'Completed', bg: 'bg-green-100 text-green-700' },
    'CLOSED': { label: 'Closed', bg: 'bg-slate-200 text-slate-500' }
};

// Icons helper
function UserIcon(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> }
function PackageX(props: any) { return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /><path d="m14.5 9-5 5" /><path d="m9.5 9 5 5" /></svg> }


export function FixUpList({ fixUps, onSelect, onUpdateStatus }: FixUpListProps) {
    if (fixUps.length === 0) {
        return (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900">No Active Fix-Ups</h3>
                <p className="text-slate-500">Production is running smoothly.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {fixUps.map((fix) => {
                const config = TYPE_CONFIG[fix.type] || TYPE_CONFIG['OTHER'];
                const Icon = config.icon;
                const statusConfig = STATUSES[fix.status] || STATUSES['OPEN'];

                return (
                    <div
                        key={fix.id}
                        className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all group relative"
                    >
                        <div className="flex items-start justify-between">
                            <div
                                className="flex items-start gap-4 flex-1 cursor-pointer"
                                onClick={() => onSelect(fix)}
                            >
                                <div className={`p-3 rounded-full ${config.bg} ${config.color} shrink-0`}>
                                    <Icon className="w-6 h-6" />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${fix.priority === 'CRITICAL' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-orange-100 text-orange-700'}`}>
                                            {fix.priority} PRIORITY
                                        </span>
                                        <span className="text-xs font-mono text-slate-400">{fix.original_order_number}</span>
                                    </div>

                                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">
                                        {fix.type.replace(/_/g, ' ')}
                                    </h3>

                                    <div className="text-sm text-slate-600 mb-2">
                                        <span className="font-medium text-slate-900">{fix.student_name}</span> • {fix.school_name}
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-2 py-1.5 rounded border border-slate-100 inline-block">
                                        <span className="font-bold">Items:</span>
                                        {fix.items.map((item, idx) => (
                                            <span key={item.id || idx}>
                                                {item.quantity}x {item.product_name} ({item.size})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end gap-2">
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</div>
                                <select
                                    value={fix.status}
                                    onChange={(e) => onUpdateStatus(fix.id, e.target.value)}
                                    className={`text-sm font-bold px-3 py-1.5 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none appearance-none cursor-pointer ${statusConfig.bg}`}
                                >
                                    {Object.entries(STATUSES).map(([key, val]) => (
                                        <option key={key} value={key}>{val.label}</option>
                                    ))}
                                </select>
                                <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(fix.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
