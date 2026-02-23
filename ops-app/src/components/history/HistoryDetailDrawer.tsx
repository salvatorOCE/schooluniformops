'use client';

import { Fragment } from 'react';
import { OrderHistoryRecord } from '@/lib/types';
import { X, Calendar, User, ShoppingBag, Truck, AlertOctagon } from 'lucide-react';
import { format } from 'date-fns';
import { OrderTimeline } from './OrderTimeline';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { useData } from '@/lib/data-provider';
import { useToast } from '@/lib/toast-context';
import { SystemEvent } from '@/lib/types';
import { useEffect, useState } from 'react';

interface HistoryDetailDrawerProps {
    order: OrderHistoryRecord | null;
    onClose: () => void;
}

export function HistoryDetailDrawer({ order, onClose }: HistoryDetailDrawerProps) {
    const adapter = useData();
    const { toast } = useToast();
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(order?.status || '');

    useEffect(() => {
        if (order) {
            setCurrentStatus(order.status);
            adapter.getSystemEvents(order.orderId).then(setEvents);
        }
    }, [order, adapter]);

    if (!order) return null;

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        if (newStatus === currentStatus) return;

        setIsUpdating(true);
        try {
            await adapter.updateOrderStatus(order.orderId, newStatus);
            setCurrentStatus(newStatus);
            toast.success(`Order changed to ${newStatus}`);

            // Reload events to show the new event
            const updatedEvents = await adapter.getSystemEvents(order.orderId);
            setEvents(updatedEvents);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
            // Revert dropdown if failed
            e.target.value = currentStatus;
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-900">{order.orderId}</h2>
                            <select
                                className={`px-2 py-0.5 text-xs font-bold rounded border cursor-pointer outline-none focus:ring-2 focus:ring-slate-400 ${getStatusColor(currentStatus)}`}
                                value={currentStatus}
                                disabled={isUpdating}
                                onChange={handleStatusChange}
                            >
                                {['Pending payment', 'Processing', 'On hold', 'Completed', 'Cancelled', 'Refunded', 'Failed', 'Trash'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            {isUpdating && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-4">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.studentName}</span>
                            <span className="flex items-center gap-1 border-l border-slate-200 pl-4"><ShoppingBag className="w-3 h-3" /> {order.schoolName}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Items Section */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Order Items</h3>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 text-left">
                                    <tr>
                                        <th className="px-3 py-2">Item</th>
                                        <th className="px-3 py-2">SKU</th>
                                        <th className="px-3 py-2 text-center">Size</th>
                                        <th className="px-3 py-2 text-center">Qty</th>
                                        <th className="px-3 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {order.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-3 py-2 font-medium text-slate-800">{item.productName}</td>
                                            <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.sku}</td>
                                            <td className="px-3 py-2 text-center">{item.size}</td>
                                            <td className="px-3 py-2 text-center font-bold">{item.qty}</td>
                                            <td className="px-3 py-2">
                                                <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                                    {getStatusLabel(item.status)}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Timeline Section */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Audit Log</h3>
                        <OrderTimeline events={events} />
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">
                        Print Label
                    </button>
                    <button className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800 shadow-sm">
                        Add Note
                    </button>
                </div>
            </div>
        </div>
    );
}
