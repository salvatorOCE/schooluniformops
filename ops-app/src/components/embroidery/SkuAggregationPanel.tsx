import { Order, OrderItem } from '@/lib/types';
import { CheckCircle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';

interface Props {
    orders: Order[];
    onCompleteRun?: (sku: string, size: string) => void;
}

interface RunData {
    id: string;
    sku: string;
    productName: string;
    size: string;
    total: number;
    completed: number;
    isDone: boolean;
}

export function SkuAggregationPanel({ orders, onCompleteRun }: Props) {
    const [showCompleted, setShowCompleted] = useState(false);

    // Dynamic Aggregation from Orders (Source of Truth)
    const runs = useMemo(() => {
        const map = new Map<string, RunData>();

        orders.forEach(order => {
            order.items.forEach(item => {
                if (!item.requires_embroidery) return;

                const size = item.size || 'STD';
                // Base SKU without size suffix for grouping if needed, but usually we run by specific SKU-Size
                // Use a composite key that matches what we expect
                // Assuming item.sku might contain size, but let's trust product_name + size + raw sku base
                const key = `${item.sku}-${size}`;

                if (!map.has(key)) {
                    map.set(key, {
                        id: key,
                        sku: item.sku,
                        productName: item.product_name,
                        size: size,
                        total: 0,
                        completed: 0,
                        isDone: false
                    });
                }

                const entry = map.get(key)!;
                entry.total += item.quantity;
                if (item.embroidery_status === 'DONE') {
                    entry.completed += item.quantity;
                }
            });
        });

        // Convert to array and determine Done state
        return Array.from(map.values()).map(run => ({
            ...run,
            isDone: run.completed >= run.total
        })).sort((a, b) => {
            // Sort: Active first, then Name, then Size
            if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
            if (a.productName !== b.productName) return a.productName.localeCompare(b.productName);
            return a.size.localeCompare(b.size, undefined, { numeric: true });
        });
    }, [orders]);

    const activeRuns = runs.filter(r => !r.isDone);
    const completedRuns = runs.filter(r => r.isDone);

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center justify-between px-1">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    Machine Control Queue
                </span>
                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                    {activeRuns.length} Active
                </span>
            </h3>

            <div className="space-y-2">
                {/* ACTIVE RUNS */}
                {activeRuns.map((run) => (
                    <RunRow key={run.id} run={run} onRun={onCompleteRun} />
                ))}

                {activeRuns.length === 0 && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-md bg-white">
                        <CheckCircle className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm font-medium">All active runs complete!</p>
                    </div>
                )}
            </div>

            {/* COMPLETED RUNS SECTION */}
            {completedRuns.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-200">
                    <button
                        onClick={() => setShowCompleted(!showCompleted)}
                        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors w-full mb-2"
                    >
                        {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        Completed Runs ({completedRuns.length})
                    </button>

                    {showCompleted && (
                        <div className="space-y-1 opacity-75">
                            {completedRuns.map((run) => (
                                <RunRow key={run.id} run={run} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function RunRow({ run, onRun }: { run: RunData, onRun?: (sku: string, size: string) => void }) {
    const percentage = Math.min((run.completed / run.total) * 100, 100);
    const remaining = run.total - run.completed;

    return (
        <div className={`
            grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 
            border rounded-md p-3 transition-all duration-300 shadow-sm
            ${run.isDone
                ? 'bg-emerald-50/50 border-emerald-100/50 grayscale-[0.2]'
                : 'bg-white border-slate-200 hover:border-indigo-300'
            }
        `}>
            {/* 1. PRODUCT & SKU */}
            <div className="flex flex-col min-w-0 mr-auto">
                <span className={`font-bold text-base leading-tight truncate ${run.isDone ? 'text-slate-500' : 'text-slate-900'}`}>
                    {run.productName}
                </span>
                <span className="text-[11px] font-mono text-slate-400 truncate mt-0.5">
                    {run.sku}
                </span>
            </div>

            {/* 2. SIZE BADGE */}
            <span className="font-mono font-bold text-sm border border-slate-200 bg-slate-50 px-2.5 py-1 rounded text-slate-700 whitespace-nowrap">
                {run.size}
            </span>

            {/* 3. COUNTS */}
            <div className={`text-sm font-bold font-mono text-right min-w-[40px] ${run.isDone ? 'text-emerald-600' : 'text-slate-700'}`}>
                {run.completed}/{run.total}
            </div>

            {/* 4. ACTION */}
            <div className="w-[80px] flex justify-end">
                {!run.isDone && onRun ? (
                    <button
                        onClick={() => onRun(run.sku, run.size)}
                        className="w-full bg-slate-900 hover:bg-indigo-600 text-white text-[11px] font-bold py-2 px-2 rounded shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1 animate-in fade-in zoom-in duration-200"
                    >
                        RUN {remaining}
                    </button>
                ) : (
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                )}
            </div>
        </div>
    );
}
