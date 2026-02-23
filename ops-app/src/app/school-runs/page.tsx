'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-provider';
import { Order } from '@/lib/types';
import { Plus, Building2, Package, Search } from 'lucide-react';
import { BulkOrderModal } from '@/components/BulkOrderModal';
import { format } from 'date-fns';

export default function SchoolBulkPage() {
    const adapter = useData();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editOrderId, setEditOrderId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const loadOrders = async () => {
        setLoading(true);
        try {
            const data = await adapter.getBulkOrders();
            setOrders(data);
        } catch (error) {
            console.error('Failed to load bulk orders', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOrders();
    }, []);

    const filteredOrders = orders.filter(o =>
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.school_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                        School Bulk Orders
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Create and manage manual B2B bulk orders for schools.
                    </p>
                </div>
                <button
                    onClick={() => { setEditOrderId(null); setIsModalOpen(true); }}
                    className="btn bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    Create Bulk Order
                </button>
            </div>

            {/* Controls */}
            <div className="flex gap-4 mb-6">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search bulk orders or schools..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-20 bg-slate-200 rounded"></div>
                        <div className="h-20 bg-slate-200 rounded"></div>
                        <div className="h-20 bg-slate-200 rounded"></div>
                    </div>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="card text-center py-16 border-dashed border-2 bg-slate-50/50">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900">No bulk orders found</h3>
                    <p className="text-slate-500 mt-1 mb-6 max-w-sm mx-auto">
                        Manually create a bulk order when a school requests stock via email or phone.
                    </p>
                    <button
                        onClick={() => { setEditOrderId(null); setIsModalOpen(true); }}
                        className="btn bg-white border shadow-sm text-slate-700 hover:bg-slate-50"
                    >
                        Create First Bulk Order
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[700px]">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-4">Order Number</th>
                                <th className="px-6 py-4">School</th>
                                <th className="px-6 py-4">Date ordered</th>
                                <th className="px-6 py-4">Items</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.map(order => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => {
                                        setEditOrderId(order.id);
                                        setIsModalOpen(true);
                                    }}
                                >
                                    <td className="px-6 py-4 font-medium text-slate-900">
                                        {order.order_number}
                                    </td>
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <span className="font-medium text-slate-700">{order.school_name}</span>
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {order.meta?.order_requested_at
                                            ? format(new Date(order.meta.order_requested_at), 'MMM d, yyyy')
                                            : format(new Date(order.created_at), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1.5 text-slate-600">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            <span>
                                                {order.items.reduce((sum, item) => sum + item.quantity, 0)} units
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                            order.order_status === 'Completed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            order.order_status === 'Processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            order.order_status === 'In Production' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                            order.order_status === 'Partial Completion' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                                            'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}>
                                            {order.order_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isModalOpen && (
                <BulkOrderModal
                    orderId={editOrderId}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditOrderId(null);
                    }}
                    onSave={() => {
                        setIsModalOpen(false);
                        setEditOrderId(null);
                        loadOrders();
                    }}
                />
            )}
        </div>
    );
}
