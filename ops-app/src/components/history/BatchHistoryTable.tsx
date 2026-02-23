'use client';

import { BatchHistoryRecord } from '@/lib/types';
import { Layers, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';

interface BatchHistoryTableProps {
    data: BatchHistoryRecord[];
}

export function BatchHistoryTable({ data }: BatchHistoryTableProps) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <Layers className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">No batches found</p>
            </div>
        );
    }

    return (
        <div className="md:border border-slate-200 md:rounded-lg overflow-x-auto bg-white md:shadow-sm -mx-2 md:mx-0">
            <table className="w-full text-xs md:text-sm text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b border-y md:border-t-0 border-slate-200 text-[10px] md:text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="px-2 py-2 md:px-4 md:py-3">Batch ID</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">School</th>
                        <th className="px-2 py-2 md:px-4 md:py-3 text-center">Progress</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">Date Created</th>
                        <th className="px-2 py-2 md:px-4 md:py-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((batch) => {
                        const percent = Math.round((batch.completedUnits / batch.totalUnits) * 100) || 0;
                        return (
                            <tr key={batch.batchId} className="group hover:bg-slate-50">
                                <td className="px-2 py-2 md:px-4 md:py-3 font-medium text-slate-900 font-mono">
                                    {batch.batchId}
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3 text-slate-600">
                                    {batch.schoolName}
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3">
                                    <div className="flex items-center gap-1 md:gap-2">
                                        <div className="flex-1 h-1.5 md:h-2 bg-slate-100 rounded-full overflow-hidden max-w-[80px] md:max-w-[100px]">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] md:text-xs text-slate-500 w-6 md:w-8 text-right">{percent}%</span>
                                    </div>
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3 text-slate-500 text-[10px] md:text-xs">
                                    {format(batch.createdAt, 'dd MMM yyyy')}
                                </td>
                                <td className="px-2 py-2 md:px-4 md:py-3 text-right">
                                    <span className={`inline-flex items-center gap-1 md:gap-1.5 px-2 md:px-2.5 py-0.5 rounded-full text-[10px] md:text-xs font-medium border ${batch.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                        batch.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                            'bg-slate-50 text-slate-600 border-slate-100'
                                        }`}>
                                        {batch.status === 'COMPLETED' ? <CheckCircle2 className="w-2.5 h-2.5 md:w-3 md:h-3" /> : <Circle className="w-2.5 h-2.5 md:w-3 md:h-3" />}
                                        {batch.status.replace('_', ' ')}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
