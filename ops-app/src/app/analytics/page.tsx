'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAnalyticsFilters } from '@/lib/analytics-context';
import { useData } from '@/lib/data-provider';
import { AnalyticsSummary } from '@/lib/analytics-types';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend,
    ComposedChart,
    Line
} from 'recharts';
import {
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    ShoppingCart,
    Package,
    TrendingUp,
    ChevronRight,
    Scissors,
    Building2,
    Tag,
    Clock,
    AlertTriangle,
    Truck
} from 'lucide-react';

type MetricType = 'revenue' | 'orders' | 'items';

export default function AnalyticsOverview() {
    const { filters } = useAnalyticsFilters();
    const adapter = useData();
    const [chartMetric, setChartMetric] = useState<MetricType>('revenue');
    const [data, setData] = useState<AnalyticsSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const summary = await adapter.getAnalyticsSummary(filters);
                setData(summary);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [adapter, filters]);

    if (loading || !data) {
        return <div className="p-12 text-center text-slate-400 font-medium">Loading live analytics...</div>;
    }

    const { kpis, kpiDeltas, trendData, schools, forecast, velocity, exceptions } = data;

    // Get top 5 schools for stacked chart
    const schoolNames = schools.slice(0, 5).map(s => s.schoolName);

    // Transform trend data for stacked chart
    const stackedData = trendData.map(d => ({
        date: d.date,
        ...d.schools,
    }));

    const CHART_COLORS = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'];

    return (
        <div className="space-y-6">
            {/* Operational Pulse (Velocity & Quality) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <VelocityCard
                    label="Paid -> Embroider"
                    value={`${velocity.avgPaidToEmbroidery}h`}
                    subtext="Avg time to start"
                    icon={Clock}
                />
                <VelocityCard
                    label="Embroider -> Packed"
                    value={`${velocity.avgEmbroideryToPacked}h`}
                    subtext="Avg process time"
                    icon={Scissors}
                />
                <VelocityCard
                    label="Packed -> Dispatch"
                    value={`${velocity.avgPackedToDispatched}h`}
                    subtext="Avg handling time"
                    icon={Truck}
                />
                <div className="bg-white border border-slate-200 rounded-md p-4 flex flex-col justify-between">
                    <div className="flex items-start justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Exception Rate</span>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-slate-900">{exceptions.rate}%</div>
                        <div className="text-xs text-slate-500">{exceptions.totalExceptions} orders affected</div>
                    </div>
                </div>
            </div>

            {/* Financial & Volume KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <TrendKpiCard
                    label="Gross Sales"
                    value={`$${kpis.grossSales.toLocaleString()}`}
                    delta={kpiDeltas.grossSales}
                    icon={DollarSign}
                />
                <TrendKpiCard
                    label="Orders"
                    value={kpis.orders.toLocaleString()}
                    delta={kpiDeltas.orders}
                    icon={ShoppingCart}
                />
                <TrendKpiCard
                    label="Items Sold"
                    value={kpis.itemsSold.toLocaleString()}
                    delta={kpiDeltas.itemsSold}
                    icon={Package}
                />
                <TrendKpiCard
                    label="Avg Order Value"
                    value={`$${kpis.avgOrderValue}`}
                    delta={kpiDeltas.avgOrderValue}
                    icon={TrendingUp}
                />
            </div>

            {/* Production Forecast Chart */}
            <div className="bg-white border border-slate-200 rounded-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Scissors className="w-5 h-5 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                            14-Day Production Forecast
                        </h3>
                    </div>
                </div>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={forecast}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(d) => new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short' })}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 10 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 10 }}
                            />
                            <Tooltip
                                contentStyle={{ fontSize: '12px', border: '1px solid #E2E8F0' }}
                                labelFormatter={(d) => new Date(d).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                            />
                            {/* Render bars for top 3 schools + Other using predefined colors */}
                            {schools.slice(0, 3).map((s, i) => (
                                <Bar key={s.schoolCode} dataKey={`schools.${s.schoolCode}`} name={s.schoolName} stackId="a" fill={CHART_COLORS[i]} />
                            ))}
                            <Bar dataKey="schools.OTHER" name="Other" stackId="a" fill={CHART_COLORS[4]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Navigation Shortcuts */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <NavShortcut href="/analytics/schools" icon={Building2} label="Schools Performance" />
                <NavShortcut href="/analytics/products" icon={Tag} label="Product Breakdown" />
                <NavShortcut href="/analytics/orders" icon={ShoppingCart} label="View Orders" />
                <NavShortcut href="/analytics/production" icon={Scissors} label="Production Analytics" />
            </div>

            {/* Hero Chart - Sales Trend */}
            <div className="bg-white border border-slate-200 rounded-md p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                        {chartMetric === 'revenue' ? 'Revenue' : chartMetric === 'orders' ? 'Orders' : 'Items Sold'} Trend
                    </h3>
                    <div className="flex gap-1">
                        {(['revenue', 'orders', 'items'] as MetricType[]).map(m => (
                            <button
                                key={m}
                                onClick={() => setChartMetric(m)}
                                className={`px-3 py-1 text-xs font-medium rounded transition-colors ${chartMetric === m
                                    ? 'bg-slate-900 text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                {m === 'revenue' ? 'Revenue' : m === 'orders' ? 'Orders' : 'Items'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendData}>
                            <defs>
                                <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0F172A" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#0F172A" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 11 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748B', fontSize: 11 }}
                                tickFormatter={(v) => chartMetric === 'revenue' ? `$${v}` : v}
                                width={50}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#fff',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}
                                formatter={(value: number | undefined) => [
                                    value !== undefined ? (chartMetric === 'revenue' ? `$${value.toLocaleString()}` : value.toLocaleString()) : '',
                                    chartMetric === 'revenue' ? 'Revenue' : chartMetric === 'orders' ? 'Orders' : 'Items'
                                ]}
                            />
                            <Area
                                type="monotone"
                                dataKey={chartMetric}
                                stroke="#0F172A"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorMetric)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function TrendKpiCard({
    label,
    value,
    delta,
    icon: Icon
}: {
    label: string;
    value: string;
    delta: number;
    icon: React.ElementType;
}) {
    const isPositive = delta >= 0;

    return (
        <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                <Icon className="w-4 h-4 text-slate-300" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
            <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'
                }`}>
                {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {Math.abs(delta)}% vs prev period
            </div>
        </div>
    );
}

function VelocityCard({ label, value, subtext, icon: Icon }: { label: string; value: string; subtext: string; icon: React.ElementType }) {
    return (
        <div className="bg-white border border-slate-200 rounded-md p-4">
            <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                <Icon className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
            <div className="text-xs text-slate-400">{subtext}</div>
        </div>
    );
}

function NavShortcut({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 bg-white border border-slate-200 rounded-md p-3 hover:bg-slate-50 hover:border-slate-300 transition-colors group"
        >
            <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
            <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900">{label}</span>
            <ChevronRight className="w-3 h-3 text-slate-300 ml-auto group-hover:text-slate-500" />
        </Link>
    );
}
