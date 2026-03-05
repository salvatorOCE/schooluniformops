'use client';

import { Order, OrderStatus } from '@/lib/types';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { OrderCard } from '@/components/OrderCard';
import { OrderDetailModal } from '@/components/OrderDetailModal';
import { useState } from 'react';

interface StorePickupViewProps {
    orders: Order[];
    onPack: (orderId: string) => void;
    onStage: (orderId: string, location: string) => void;
    onHandover: (orderId: string) => void;
    onPrintLabel: (order: Order) => void;
    onReportIssue: (order: Order) => void;
    /** Called when order is updated (e.g. status change) so parent can refresh the list. */
    onOrderUpdated?: () => void;
}

export function StorePickupView({ orders, onPack, onStage, onHandover, onPrintLabel, onReportIssue, onOrderUpdated }: StorePickupViewProps) {
    const [stagingLocs, setStagingLocs] = useState<Record<string, string>>({});
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Sort alphabetically by Parent Name
    const sortedOrders = [...orders].sort((a, b) => a.parent_name.localeCompare(b.parent_name));

    const handleStageClick = (orderId: string) => {
        const loc = stagingLocs[orderId];
        if (loc) {
            onStage(orderId, loc);
            setStagingLocs(prev => {
                const next = { ...prev };
                delete next[orderId];
                return next;
            });
        }
    };

    if (orders.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-4xl mb-4">🏪</p>
                <p className="text-xl font-semibold text-gray-700">No Store Pickup Orders</p>
                <p className="text-gray-500">Queue is empty.</p>
            </div>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedOrders.map(order => {
                    const isPacked = order.order_status === 'PACKED' && !order.staging_location;
                    const isStaged = order.order_status === 'PACKED' && !!order.staging_location;

                    return (
                        <OrderCard
                            key={order.id}
                            order={order}
                            showAge={true}
                            onClick={() => setSelectedOrder(order)}
                            actions={
                                <div className="w-full space-y-2">
                                    {/* State Indicator */}
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                            Current Step
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getStatusColor(order.order_status)}`}>
                                            {getStatusLabel(order.order_status)}
                                        </span>
                                    </div>

                                    {/* Actions based on state */}
                                    {order.order_status === 'AWAITING_PACK' && (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onPrintLabel(order)}
                                                className="btn btn-outline flex-1 text-xs"
                                            >
                                                Label
                                            </button>
                                            <button
                                                onClick={() => onPack(order.id)}
                                                className="btn btn-primary flex-1 text-xs"
                                            >
                                                Pack Order
                                            </button>
                                            <button
                                                onClick={() => onReportIssue(order)}
                                                className="btn btn-ghost text-red-500 hover:bg-red-50 px-2"
                                                title="Report Issue"
                                            >
                                                ⚠️
                                            </button>
                                        </div>
                                    )}

                                    {isPacked && (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Shelf / Bin..."
                                                className="input input-sm border-slate-300 flex-1 min-w-0"
                                                value={stagingLocs[order.id] || ''}
                                                onChange={(e) => setStagingLocs({ ...stagingLocs, [order.id]: e.target.value })}
                                            />
                                            <button
                                                onClick={() => handleStageClick(order.id)}
                                                className="btn btn-secondary text-xs px-3"
                                                disabled={!stagingLocs[order.id]}
                                            >
                                                Stage
                                            </button>
                                        </div>
                                    )}

                                    {isStaged && (
                                        <div className="space-y-2">
                                            <div className="text-sm bg-yellow-50 text-yellow-800 px-2 py-1 rounded border border-yellow-200">
                                                📍 Location: <strong>{order.staging_location}</strong>
                                            </div>
                                            <button
                                                onClick={() => onHandover(order.id)}
                                                className="btn btn-success w-full"
                                            >
                                                ✓ Customer Collected
                                            </button>
                                        </div>
                                    )}
                                </div>
                            }
                        />
                    );
                })}
            </div>

            <OrderDetailModal
                isOpen={!!selectedOrder}
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
                onOrderUpdated={onOrderUpdated}
            />
        </>
    );
}
