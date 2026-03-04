'use client';

import { OrderHistoryRecord } from '@/lib/types';
import { AlertTriangle, Clock, MapPin, Package, User, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { getStatusLabel, getStatusColor } from '@/lib/utils';

interface HistoryListProps {
    data: OrderHistoryRecord[];
    onOrderClick: (order: OrderHistoryRecord) => void;
    /** Selected order IDs (orderId e.g. SUS-0188). When set, checkboxes are shown. */
    selectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getStatusColor(status)}`}>
            {getStatusLabel(status)}
        </span>
    );
}

export function HistoryList({ data, onOrderClick, selectedIds, onSelectionChange }: HistoryListProps) {
    const isSelectable = selectedIds != null && onSelectionChange != null;
    const allSelected = isSelectable && data.length > 0 && data.every(o => selectedIds.has(o.orderId));
    const someSelected = isSelectable && data.some(o => selectedIds.has(o.orderId));

    const toggleOne = (orderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSelectionChange) return;
        const next = new Set(selectedIds ?? []);
        if (next.has(orderId)) next.delete(orderId);
        else next.add(orderId);
        onSelectionChange(next);
    };

    const toggleAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSelectionChange) return;
        if (allSelected) onSelectionChange(new Set());
        else onSelectionChange(new Set(data.map(o => o.orderId)));
    };

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                <Package className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-slate-500 font-medium">No results found</p>
                <p className="text-slate-400 text-sm">Try adjusting your filters</p>
            </div>
        );
    }

    return (
        <div className="md:border border-slate-200 md:rounded-lg overflow-x-auto bg-white md:shadow-sm -mx-2 md:mx-0">
            <table className="w-full text-xs md:text-sm text-left min-w-[700px]">
                <thead className="bg-slate-50 border-b border-y md:border-t-0 border-slate-200 text-[10px] md:text-xs uppercase text-slate-500 font-semibold">
                    <tr>
                        {isSelectable && (
                            <th className="px-2 py-2 md:px-4 md:py-3 w-10">
                                <button
                                    type="button"
                                    onClick={toggleAll}
                                    className="w-5 h-5 flex items-center justify-center rounded border-2 border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
                                    title={allSelected ? 'Deselect all' : 'Select all'}
                                    aria-label={allSelected ? 'Deselect all' : 'Select all'}
                                >
                                    {allSelected ? '✓' : (someSelected ? '−' : '')}
                                </button>
                            </th>
                        )}
                        <th className="px-2 py-2 md:px-4 md:py-3 w-28 md:w-32">Order #</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">Student / Parent</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">School</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">Delivery</th>
                        <th className="px-2 py-2 md:px-4 md:py-3 text-center">Items</th>
                        <th className="px-2 py-2 md:px-4 md:py-3">Dates</th>
                        <th className="px-2 py-2 md:px-4 md:py-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.map((order) => (
                        <tr
                            key={order.orderId}
                            onClick={() => onOrderClick(order)}
                            className={`group hover:bg-slate-50 cursor-pointer transition-colors ${isSelectable && selectedIds?.has(order.orderId) ? 'bg-emerald-50/50' : ''}`}
                        >
                            {isSelectable && (
                                <td className="px-2 py-2 md:px-4 md:py-3" onClick={(e) => toggleOne(order.orderId, e)}>
                                    <button
                                        type="button"
                                        className="w-5 h-5 flex items-center justify-center rounded border-2 border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold"
                                        aria-label={selectedIds?.has(order.orderId) ? 'Deselect' : 'Select'}
                                    >
                                        {selectedIds?.has(order.orderId) ? '✓' : ''}
                                    </button>
                                </td>
                            )}
                            <td className="px-2 py-2 md:px-4 md:py-3 font-medium text-slate-900 group-hover:text-blue-600">
                                {order.orderId}
                                {order.hasIssues && (
                                    <AlertTriangle className="inline w-3 h-3 text-amber-500 ml-1 md:ml-2" />
                                )}
                                {order.hasNotes && (
                                    <span title="Has notes"><MessageSquare className="inline w-3 h-3 text-slate-500 ml-1 md:ml-2" /></span>
                                )}
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3">
                                <div className="font-medium text-slate-800">{order.studentName}</div>
                                <div className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1">
                                    <User className="w-3 h-3" /> {order.parentName}
                                </div>
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-slate-600 line-clamp-2 md:line-clamp-none">
                                {order.schoolName}
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-slate-600">
                                <div className="flex items-center gap-1 md:gap-1.5 text-xs">
                                    <MapPin className="w-3 h-3 text-slate-400" />
                                    {order.deliveryType}
                                </div>
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-center">
                                <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-medium h-5 md:h-6 px-1.5 md:px-2 rounded-full text-[10px] md:text-xs">
                                    {(Array.isArray(order.items) ? order.items : []).reduce((acc, i) => acc + (Number(i?.qty) || 0), 0)}
                                </span>
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-slate-500 text-[10px] md:text-xs">
                                <div className="flex items-center gap-1 md:gap-1.5 whitespace-nowrap">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>Order date {format(order.paidAt || order.createdAt || new Date(), 'dd MMM p')}</span>
                                </div>
                            </td>
                            <td className="px-2 py-2 md:px-4 md:py-3 text-right">
                                <StatusBadge status={order.status} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
