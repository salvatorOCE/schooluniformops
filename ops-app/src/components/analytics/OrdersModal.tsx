'use client';

import { AnalyticsOrderRow } from '@/lib/analytics-types';
import { OrderStatus } from '@/lib/types';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { X } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-export';

interface OrdersModalProps {
    isOpen: boolean;
    onClose: () => void;
    orders: AnalyticsOrderRow[];
    context: string;
}

export function OrdersDrilldownModal({ isOpen, onClose, orders, context }: OrdersModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-900/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">Orders Drilldown</h3>
                        <p className="text-sm text-slate-500">{context} • {orders.length} orders</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto p-4">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Order #</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Student</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Parent</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Delivery</th>
                                <th className="px-3 py-2 text-left font-semibold text-slate-600">Items</th>
                                <th className="px-3 py-2 text-right font-semibold text-slate-600">Total</th>
                                <th className="px-3 py-2 text-center font-semibold text-slate-600">Embroidery</th>
                                <th className="px-3 py-2 text-center font-semibold text-slate-600">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {orders.map((order) => (
                                <tr key={order.orderId} className="hover:bg-slate-50">
                                    <td className="px-3 py-2 font-mono text-slate-900">{order.orderNumber}</td>
                                    <td className="px-3 py-2 text-slate-700">{order.studentName}</td>
                                    <td className="px-3 py-2 text-slate-500">{order.parentName}</td>
                                    <td className="px-3 py-2">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${order.deliveryType === 'HOME' ? 'bg-blue-100 text-blue-700' :
                                            order.deliveryType === 'SCHOOL' ? 'bg-green-100 text-green-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {order.deliveryType}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-slate-600 max-w-xs truncate" title={order.itemsSummary}>
                                        {order.itemsSummary}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium text-slate-900">
                                        ${order.total}
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${order.embroideryStatus === 'DONE' ? 'bg-emerald-100 text-emerald-700' :
                                            'bg-amber-100 text-amber-700'
                                            }`}>
                                            {order.embroideryStatus}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getStatusColor(order.orderStatus as string)}`}>
                                            {getStatusLabel(order.orderStatus as OrderStatus)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {orders.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                            No orders found for this selection.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={() => exportToCSV(orders, {
                            filename: `orders_drilldown_${context.replace(/\s+/g, '_').toLowerCase()}`,
                            columns: [
                                { key: 'orderNumber', label: 'Order #' },
                                { key: 'studentName', label: 'Student' },
                                { key: 'parentName', label: 'Parent' },
                                { key: 'deliveryType', label: 'Delivery' },
                                { key: 'itemsSummary', label: 'Items' },
                                { key: 'total', label: 'Total', formatter: (v: number) => `$${v}` },
                                { key: 'embroideryStatus', label: 'Embroidery' },
                                { key: 'orderStatus', label: 'Status' },
                            ]
                        })}
                        className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors"
                    >
                        Export CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
