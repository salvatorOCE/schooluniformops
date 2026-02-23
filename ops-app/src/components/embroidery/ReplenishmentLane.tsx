import { EmbroideryBatch } from '@/lib/types';
import { Package, AlertTriangle, Printer, Layers } from 'lucide-react';

interface ReplenishmentLaneProps {
    batches: EmbroideryBatch[];
    onOpen: (batch: EmbroideryBatch) => void;
}

export function ReplenishmentLane({ batches, onOpen }: ReplenishmentLaneProps) {
    const replenishmentBatches = batches.filter(b => b.is_replenishment);

    if (replenishmentBatches.length === 0) {
        return (
            <div className="mb-12 opacity-60">
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                    <div>
                        <h2 className="text-xl font-bold text-slate-700">Replenishment Lane</h2>
                        <p className="text-sm text-slate-500">Bulk Make-to-Stock for Low Inventory</p>
                    </div>
                </div>
                <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">All stock levels healthy. No replenishment needed.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Layers className="w-6 h-6 text-slate-600" />
                        Replenishment Lane
                    </h2>
                    <p className="text-sm text-slate-500">
                        Top-Up Jobs • {replenishmentBatches.length} School Batches Active
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {replenishmentBatches.map(batch => (
                    <div
                        key={batch.school_name}
                        className={`bg-white rounded-xl border-2 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden
                            ${batch.priority_level === 'URGENT' ? 'border-red-200' : 'border-slate-200 hover:border-indigo-300'}
                        `}
                        onClick={() => onOpen(batch)}
                    >
                        {/* Status Strip */}
                        <div className={`h-2 w-full ${batch.priority_level === 'URGENT' ? 'bg-red-500' : 'bg-slate-300'}`}></div>

                        <div className="p-5">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{batch.school_name}</h3>
                                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {batch.target_school_code || 'CODE'}
                                    </span>
                                </div>
                                {batch.priority_level === 'URGENT' && (
                                    <div className="flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-2 py-1 rounded-full animate-pulse">
                                        <AlertTriangle className="w-3 h-3" /> LOW STOCK
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-slate-500">Total Run Size</span>
                                    <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                                        {batch.total_units} Units
                                    </span>
                                </div>

                                <div className="text-xs text-slate-400 border-t border-slate-100 pt-3">
                                    <div className="flex flex-wrap gap-1">
                                        {Object.values(batch.sku_summary).slice(0, 3).map((sku, i) => (
                                            <span key={i} className="bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                                                {sku.name}
                                            </span>
                                        ))}
                                        {Object.keys(batch.sku_summary).length > 3 && (
                                            <span className="text-slate-300 ml-1">+{Object.keys(batch.sku_summary).length - 3} more</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-between items-center group-hover:text-indigo-600 transition-colors">
                                <span className="text-sm font-bold text-slate-400 group-hover:text-indigo-600">Start Run</span>
                                <Printer className="w-5 h-5 text-slate-300 group-hover:text-indigo-600" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
