import { EmbroideryBatch } from '@/lib/types';
import { Clock, Calendar, AlertTriangle, PlayCircle, BarChart3 } from 'lucide-react';
import { parseISO } from 'date-fns';

interface SeniorBatchCardProps {
    batch: EmbroideryBatch;
    onOpen: (batch: EmbroideryBatch) => void;
}

export function SeniorBatchCard({ batch, onOpen }: SeniorBatchCardProps) {
    const cutoffDate = batch.cutoff_date ? parseISO(batch.cutoff_date) : new Date();
    const daysUntilCutoff = Math.ceil((cutoffDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    // Risk Logic
    let riskLevel: 'LOW' | 'MED' | 'HIGH' = 'LOW';
    if (daysUntilCutoff <= 3) riskLevel = 'HIGH';
    else if (daysUntilCutoff <= 7) riskLevel = 'MED';

    // Progress Logic
    const totalItems = batch.total_units;
    // Calculate completed based on skew summary (naive approximation for card)
    let completedItems = 0;
    Object.values(batch.sku_summary).forEach(sku => {
        Object.values(sku.sizes).forEach(size => {
            completedItems += size.completed;
        });
    });
    const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    // Smart Trigger: Ready to Run? (e.g. > 20 items or High Risk)
    const isReadyToRun = totalItems >= 20 || riskLevel === 'HIGH';

    return (
        <div
            onClick={() => onOpen(batch)}
            className={`group relative bg-white rounded-xl border-2 transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-lg
                ${riskLevel === 'HIGH' ? 'border-red-300 ring-red-100' : 'border-purple-200 hover:border-purple-400'}
            `}
        >
            {/* Header / Banner */}
            <div className={`px-5 py-3 flex justify-between items-center text-white
                ${riskLevel === 'HIGH' ? 'bg-red-600' : 'bg-purple-600'}
            `}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {riskLevel === 'HIGH' ? '🔥 Critical Campaign' : '🎓 Senior Campaign'}
                    </span>
                </div>
                {isReadyToRun && (
                    <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">
                        <PlayCircle className="w-3 h-3" /> READY TO RUN
                    </div>
                )}
            </div>

            <div className="p-5">
                {/* Main Info */}
                <div className="mb-4">
                    <h3 className="font-bold text-slate-900 text-xl group-hover:text-purple-700 transition-colors">
                        {batch.school_name}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-600">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Total Garments</span>
                            <span className="font-mono font-bold text-slate-900">{batch.total_units} units</span>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-100"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Orders</span>
                            <span className="font-mono font-bold text-slate-900">{batch.order_count}</span>
                        </div>
                        <div className="h-8 w-[1px] bg-slate-100"></div>
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase text-slate-400 font-bold">Cutoff</span>
                            <span className={`font-mono font-bold ${riskLevel === 'HIGH' ? 'text-red-600' : 'text-slate-900'}`}>
                                {daysUntilCutoff} days
                            </span>
                        </div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-500">Production Progress</span>
                        <span className="font-bold text-purple-700">{progressPercent}%</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${riskLevel === 'HIGH' ? 'bg-red-500' : 'bg-purple-600'}`}
                            style={{ width: `${progressPercent}%` }}
                        ></div>
                    </div>
                </div>

                {/* Footer Logic: SKU Preview or Status */}
                <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        <span>{Object.keys(batch.sku_summary).length} SKU Varieties</span>
                    </div>
                    {batch.batch_status === 'LOCKED' && <span className="text-red-500 font-bold">BATCH LOCKED</span>}
                </div>
            </div>

            {/* Hover Effect Line */}
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-amber-400 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    );
}
