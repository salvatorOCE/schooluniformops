'use client';

import { useMemo } from 'react';
import { useAnalyticsFilters } from '@/lib/analytics-context';
import { getAnalyticsSummary } from '@/lib/analytics-mock';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export default function AnalyticsExceptions() {
    const { filters } = useAnalyticsFilters();
    const data = useMemo(() => getAnalyticsSummary(filters), [filters]);
    const { exceptions, orders } = data;

    // Transform data for charts
    const typeData = Object.entries(exceptions.byType).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    const schoolData = Object.entries(exceptions.bySchool).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);

    const exceptionOrders = orders.filter(o => o.hasException);
    const COLORS = ['#F59E0B', '#EF4444', '#3B82F6', '#10B981'];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <h2 className="text-lg font-semibold text-slate-900">Operational Exceptions</h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-center items-center text-center">
                    <div className="text-4xl font-bold text-slate-900 mb-1">{exceptions.rate}%</div>
                    <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Overall Exception Rate</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-md p-5 flex flex-col justify-center items-center text-center">
                    <div className="text-4xl font-bold text-slate-900 mb-1">{exceptions.totalExceptions}</div>
                    <div className="text-sm text-slate-500 font-medium uppercase tracking-wide">Total Orders with Issues</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Exception Types */}
                <div className="bg-white border border-slate-200 rounded-md p-5">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                        Issues by Type
                    </h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={typeData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 11 }}
                                    width={100}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ fontSize: '12px', border: '1px solid #E2E8F0' }}
                                />
                                <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Schools Issues */}
                <div className="bg-white border border-slate-200 rounded-md p-5">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                        Issues by School
                    </h3>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={schoolData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis
                                    dataKey="name"
                                    tickFormatter={(v) => v.split(' ')[0]}
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
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ fontSize: '12px', border: '1px solid #E2E8F0' }}
                                />
                                <Bar dataKey="value" fill="#64748B" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                        Recent Exceptions
                    </h3>
                </div>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Order</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Customer</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Issue Type</th>
                            <th className="px-4 py-3 text-center font-semibold text-slate-600 text-xs uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {exceptionOrders.map((order) => (
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
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-100">
                                        <AlertTriangle className="w-3 h-3" />
                                        {order.exceptionType}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">Open</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
