'use client';

import { Order } from '@/lib/types';
import { OrderCard } from '@/components/OrderCard';
import { useMemo } from 'react';

interface HomeShippingViewProps {
    orders: Order[];
    onDispatch: (orderId: string) => void;
    onBatchDispatch: (carrier: string) => void;
    onPrintLabel: (order: Order) => void;
    onReportIssue: (order: Order) => void;
}

export function HomeShippingView({ orders, onDispatch, onBatchDispatch, onPrintLabel, onReportIssue }: HomeShippingViewProps) {
    const groupedByCarrier = useMemo(() => {
        const groups: Record<string, Order[]> = {};
        orders.forEach(order => {
            const carrier = order.carrier || 'Unassigned';
            if (!groups[carrier]) groups[carrier] = [];
            groups[carrier].push(order);
        });
        return groups;
    }, [orders]);

    const carriers = Object.keys(groupedByCarrier).sort();

    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-4xl mb-4">🏠</p>
                <p className="text-xl font-semibold text-gray-700">No Shipping Orders</p>
                <p className="text-gray-500">All home delivery orders are dispatched or queue is empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {carriers.map(carrier => (
                <div key={carrier}>
                    <div className="flex items-center justify-between mb-4 border-b pb-2">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-800">{carrier}</h2>
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-sm font-medium">
                                {groupedByCarrier[carrier].length} Orders
                            </span>
                        </div>
                        <button
                            onClick={() => onBatchDispatch(carrier)}
                            className="btn btn-outline border-slate-300 hover:bg-slate-50 text-slate-700"
                        >
                            Refreshed & Ready
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groupedByCarrier[carrier].map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                showAge={true}
                                actions={
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={() => onPrintLabel(order)}
                                            className="btn btn-outline flex-1 text-xs"
                                        >
                                            Label
                                        </button>
                                        <button
                                            onClick={() => onDispatch(order.id)}
                                            className="btn btn-primary flex-1 text-xs"
                                        >
                                            Dispatch
                                        </button>
                                        <button
                                            onClick={() => onReportIssue(order)}
                                            className="btn btn-ghost text-red-500 hover:bg-red-50 px-2"
                                            title="Report Issue"
                                        >
                                            ⚠️
                                        </button>
                                    </div>
                                }
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
