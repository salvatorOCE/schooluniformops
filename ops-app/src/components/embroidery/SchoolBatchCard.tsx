import { EmbroideryBatch } from '@/lib/types';
import { ChevronRight, Clock, Package } from 'lucide-react';

interface Props {
    batch: EmbroideryBatch;
    onOpen: (batch: EmbroideryBatch) => void;
}

export function SchoolBatchCard({ batch, onOpen }: Props) {
    const timeSince = (dateStr: string) => {
        const days = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        return days === 0 ? 'Today' : `${days}d ago`;
    };

    // calculate progress
    const completedOrders = batch.orders.filter(o => o.embroidery_status === 'DONE').length;
    const progress = Math.round((completedOrders / batch.orders.length) * 100);

    // Status Logic
    const ageHours = (new Date().getTime() - new Date(batch.oldest_order_date).getTime()) / (1000 * 60 * 60);
    const isAtRisk = ageHours > 48; // Older than 2 days
    const isInProgress = progress > 0 && progress < 100;

    // Derived Styles
    let borderClass = 'border-slate-200 hover:border-indigo-300';
    let statusDot = 'bg-slate-300';
    let statusLabel = 'Ready';

    if (isAtRisk) {
        borderClass = 'border-l-4 border-l-amber-500 border-y-slate-200 border-r-slate-200';
        statusDot = 'bg-amber-500';
        statusLabel = 'Aged Batch';
    } else if (isInProgress) {
        borderClass = 'border-l-4 border-l-indigo-500 border-y-slate-200 border-r-slate-200';
        statusDot = 'bg-indigo-500';
        statusLabel = 'In Progress';
    }

    return (
        <div
            onClick={() => onOpen(batch)}
            className={`group bg-white rounded-lg p-5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden ${borderClass}`}
        >
            {/* Progress Bar Background */}
            <div
                className="absolute bottom-0 left-0 h-1 transition-all duration-500"
                style={{
                    width: `${progress}%`,
                    backgroundColor: isAtRisk ? '#f59e0b' : '#6366f1' // amber-500 or indigo-500
                }}
            />

            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${statusDot}`} />
                        <span className="text-xs uppercase font-bold tracking-wider text-slate-500">{statusLabel}</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {batch.school_name}
                    </h3>
                    <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded">
                            <Package className="w-3 h-3" />
                            {batch.order_count} Orders
                        </span>
                        <span className={`flex items-center gap-1 font-medium px-2 py-0.5 rounded ${isAtRisk ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'}`}>
                            <Clock className="w-3 h-3" />
                            Oldest: {timeSince(batch.oldest_order_date)}
                        </span>
                    </div>
                </div>
                <div className="bg-slate-100 text-slate-800 font-mono text-xl font-bold px-3 py-1 rounded">
                    {batch.total_units} <span className="text-xs font-normal text-slate-500 text-base">pc</span>
                </div>
            </div>

            {/* SKU Summary Preview */}
            <div className="space-y-1 mb-4">
                {Object.entries(batch.sku_summary).slice(0, 3).map(([sku, item]) => (
                    <div key={sku} className="flex justify-between text-sm text-slate-600">
                        <span className="truncate pr-2">{item.name}</span>
                        <span className="font-semibold">{Object.values(item.sizes).reduce((a, b) => a + b.total, 0)}</span>
                    </div>
                ))}
                {Object.keys(batch.sku_summary).length > 3 && (
                    <div className="text-xs text-slate-400 italic">
                        + {Object.keys(batch.sku_summary).length - 3} more items...
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                <span className={`text-xs font-medium px-2 py-1 rounded ${progress === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                    {progress === 100 ? 'Complete' : `${completedOrders}/${batch.orders.length} Done`}
                </span>
                <div className="text-indigo-600 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                    Open Batch <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        </div>
    );
}
