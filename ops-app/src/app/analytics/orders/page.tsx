'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAnalyticsFilters } from '@/lib/analytics-context';
import { useData } from '@/lib/data-provider';
import { AnalyticsSummary } from '@/lib/analytics-types';
import { OrderStatus } from '@/lib/types';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { Download, Truck, Clock, AlertTriangle } from 'lucide-react';
import { exportToCSV } from '@/lib/csv-export';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

export default function AnalyticsOrders() {
    const { filters } = useAnalyticsFilters();
    const adapter = useData();
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const summary = await adapter.getAnalyticsSummary(filters);
                setData(summary);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [adapter, filters]);

    // Delivery Trend Data (must be above any early returns — Rules of Hooks)
    const deliveryTrendData = useMemo(() => {
        if (!data) return [];
        return data.trendData.map(d => ({
            date: d.date,
            HOME: Math.round(d.orders * 0.4),
            SCHOOL: Math.round(d.orders * 0.35),
            STORE: Math.round(d.orders * 0.25),
        }));
    }, [data]);

    if (loading || !data) {
        return <div className="p-8 text-center text-slate-500">Loading orders analytics...</div>;
    }

    const { orders, velocity, trendData } = data;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Order Processing & Logistics</h2>
                <button
                    onClick={() => exportToCSV(orders, {
                        filename: 'analytics_orders',
                        columns: [
                            { key: 'orderNumber', label: 'Order #' },
                            { key: 'parentName', label: 'Customer' },
                            { key: 'schoolName', label: 'School' },
                            { key: 'deliveryType', label: 'Delivery' },
                            { key: 'itemsSummary', label: 'Items' },
                            { key: 'orderStatus', label: 'Status' },
                            { key: 'hasException', label: 'Exception', formatter: (v: boolean) => v ? 'Yes' : 'No' },
                            { key: 'exceptionType', label: 'Exception Type', formatter: (v: string | undefined) => v || '' },
                            { key: 'createdAt', label: 'Created', formatter: (v: string) => v ? new Date(v).toLocaleDateString() : '' },
                        ]
                    })}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Velocity Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Embroidery Lead Time</span>
                        <Clock className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{velocity.avgPaidToEmbroidery}h</div>
                        <div className="text-xs text-slate-500">Avg Paid → Embroidery</div>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Packing Speed</span>
                        <Clock className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{velocity.avgEmbroideryToPacked}h</div>
                        <div className="text-xs text-slate-500">Avg Embroidery → Packed</div>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Dispatch Handling</span>
                        <Truck className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{velocity.avgPackedToDispatched}h</div>
                        <div className="text-xs text-slate-500">Avg Packed → Dispatched</div>
                    </div>
                </div>
            </div>

            {/* Delivery Trend Chart */}
            <div className="bg-white border border-slate-200 rounded-md p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                        Delivery Method Trends
                    </h3>
                </div>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={deliveryTrendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(d) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 11 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 11 }}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: '12px', border: '1px solid #E2E8F0' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <Bar dataKey="HOME" name="Home Delivery" stackId="a" fill="#3B82F6" />
                            <Bar dataKey="SCHOOL" name="School Pickup" stackId="a" fill="#10B981" />
                            <Bar dataKey="STORE" name="Store Collection" stackId="a" fill="#F59E0B" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Order</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Delivery</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Items</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Flags</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {orders.slice(0, 50).map((order) => (
                            <tr key={order.orderId} className="hover:bg-slate-50">
                                <td className="px-4 py-3">
                                    <div className="font-mono text-slate-900">{order.orderNumber}</div>
                                    <div className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <div className="text-slate-900 font-medium">{order.parentName}</div>
                                    <div className="text-xs text-slate-500">{order.schoolName}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${order.deliveryType === 'HOME' ? 'bg-blue-100 text-blue-700' :
                                        order.deliveryType === 'SCHOOL' ? 'bg-green-100 text-green-700' :
                                            'bg-amber-100 text-amber-700'
                                        }`}>
                                        {order.deliveryType}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right text-slate-600 text-xs max-w-[200px] truncate">
                                    {order.itemsSummary}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getStatusColor(order.orderStatus as string)}`}>
                                        {getStatusLabel(order.orderStatus as OrderStatus)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    {order.hasException && (
                                        <div className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                            <AlertTriangle className="w-3 h-3" />
                                            {order.exceptionType}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="text-sm text-slate-500 text-center">
                Showing {Math.min(50, orders.length)} of {orders.length} orders
            </div>
        </div>
    );
}
