'use client';

import { RunHistoryRecord } from '@/lib/types';
import { Activity, UserCog, Check } from 'lucide-react';
import { format } from 'date-fns';

interface RunHistoryTableProps {
    data: RunHistoryRecord[];
}

export function RunHistoryTable({ data }: RunHistoryTableProps) {
    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <Activity className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">No run logs found</p>
            </div>
        );
    }

    return (
        <div className="md:border border-slate-200 md:rounded-lg overflow-x-auto bg-white md:shadow-sm -mx-2 md:mx-0">
            <table className="w-full text-xs md:text-sm text-left min-w-[800px]">
                <thead className="bg-slate-50 border-b border-y md:border-t-0 border-slate-200 text-[10px] md:text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        <th className="px-2 py-2 md:px-4 md:py-3">Timestamp</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">Run ID</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">School</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">Product</th>
                        <th className="px-2 py-2 md:px-4 md:py-3 text-right">Units</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">Operator</th>
                        <th className="px-2 py-2 md:px-4 md:py-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((run) => (
                        <tr key={run.runId} className="group hover:bg-slate-50">
                            <td className="px-2 py-2 md:px-4 md:py-3 text-slate-500 text-[10px] md:text-xs whitespace-nowrap">
                                {format(run.timestamp, 'dd MMM HH:mm')}
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 font-medium text-slate-900 font-mono text-[10px] md:text-xs">
                                {run.runId}
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-slate-600">
                                {run.schoolName}
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3">
                                <div className="text-slate-800">{run.productName}</div>
                                <div className="text-[10px] md:text-xs text-slate-500">Size: {run.size}</div>
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-right font-medium text-slate-700">
                                {run.unitsRun}
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3">
                                <div className="flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs text-slate-600">
                                    <UserCog className="w-2.5 h-2.5 md:w-3 md:h-3 text-slate-400" />
                                    {run.operator}
                                </div>
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-right">
                                {run.status === 'COMPLETED' ? (
                                    <span className="text-[10px] md:text-xs text-emerald-600 font-medium bg-emerald-50 px-1.5 md:px-2 py-0.5 rounded">
                                        Completed
                                    </span>
                                ) : (
                                    <span className="text-[10px] md:text-xs text-amber-600 font-medium bg-amber-50 px-1.5 md:px-2 py-0.5 rounded">
                                        Partial
                                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
