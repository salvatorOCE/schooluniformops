'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAnalyticsFilters } from '@/lib/analytics-context';
import { useData } from '@/lib/data-provider';
import { AnalyticsSummary } from '@/lib/analytics-types';
import { Scissors, Ruler, Calendar, TrendingUp, TrendingDown, Minus, Wrench, Zap, BarChart3 } from 'lucide-react';
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

export default function AnalyticsProduction() {
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

    const productionData = useMemo(() => {
        if (!data) return [];
        return data.schools.map(school => {
            const embroideryItems = school.products.filter(p =>
                p.productName.includes('Polo') ||
                p.productName.includes('Dress') ||
                p.productName.includes('Cardigan') ||
                p.productName.includes('Jacket')
            );
            const totalUnits = embroideryItems.reduce((sum, p) => sum + p.unitsSold, 0);
            return {
                schoolName: school.schoolName,
                totalUnits,
                products: embroideryItems,
            };
        }).filter(s => s.totalUnits > 0).sort((a, b) => b.totalUnits - a.totalUnits);
    }, [data]);

    if (loading || !data) {
        return <div className="p-8 text-center text-slate-500">Loading production data...</div>;
    }
    const { forecast, sizeDistribution, schools, throughput, stageVelocities } = data;

    const grandTotal = productionData.reduce((sum, s) => sum + s.totalUnits, 0);
    const CHART_COLORS = ['#0F172A', '#334155', '#64748B', '#94A3B8', '#CBD5E1', '#E2E8F0'];

    const trendIcon = (trend: 'up' | 'down' | 'flat') => {
        if (trend === 'up') return <TrendingUp className="w-3.5 h-3.5 text-red-500" />;
        if (trend === 'down') return <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />;
        return <Minus className="w-3.5 h-3.5 text-slate-400" />;
    };

    const trendLabel = (trend: 'up' | 'down' | 'flat') => {
        if (trend === 'up') return 'Slower';
        if (trend === 'down') return 'Faster';
        return 'Steady';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Scissors className="w-5 h-5 text-slate-400" />
                    <h2 className="text-lg font-semibold text-slate-900">Embroidery & Production</h2>
                </div>
                <div className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-900">{grandTotal}</span> items in queue
                </div>
            </div>

            {/* Throughput KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{throughput.completedToday}</div>
                    <div className="text-xs text-slate-500 mt-1">orders dispatched</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">This Week</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{throughput.completedThisWeek}</div>
                    <div className="text-xs text-slate-500 mt-1">orders completed</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Daily</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{throughput.avgDailyThroughput}</div>
                    <div className="text-xs text-slate-500 mt-1">orders/day</div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <Wrench className="w-4 h-4 text-red-500" />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fix-Up Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-slate-900">{throughput.fixUpRate}%</div>
                    <div className="text-xs text-slate-500 mt-1">{throughput.fixUpCount} fix-ups total</div>
                </div>
            </div>

            {/* Stage Velocity Pipeline */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">
                    Order Velocity Pipeline
                </h3>
                <div className="flex flex-col md:flex-row items-stretch gap-0">
                    {stageVelocities.map((stage, idx) => (
                        <div key={stage.stage} className="flex-1 flex items-center">
                            <div className="flex-1 text-center p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                <div className="text-xs font-medium text-slate-500 mb-1">{stage.stage}</div>
                                <div className="text-2xl font-bold text-slate-900">
                                    {stage.avgHours < 24
                                        ? `${stage.avgHours}h`
                                        : `${(stage.avgHours / 24).toFixed(1)}d`
                                    }
                                </div>
                                <div className="flex items-center justify-center gap-1 mt-1.5">
                                    {trendIcon(stage.trend)}
                                    <span className={`text-xs font-medium ${stage.trend === 'up' ? 'text-red-500' :
                                        stage.trend === 'down' ? 'text-emerald-500' : 'text-slate-400'
                                        }`}>
                                        {trendLabel(stage.trend)}
                                    </span>
                                </div>
                            </div>
                            {idx < stageVelocities.length - 1 && (
                                <div className="hidden md:flex items-center px-2 text-slate-300">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M5 12h14M12 5l7 7-7 7" />
                                    </svg>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="mt-3 text-xs text-slate-400 text-center">
                    Total avg lead time: <span className="font-semibold text-slate-600">
                        {(stageVelocities.reduce((sum, s) => sum + s.avgHours, 0) / 24).toFixed(1)} days
                    </span>
                </div>
            </div>

            {/* 14-Day Forecast Chart */}
            <div className="bg-white border border-slate-200 rounded-md p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                        14-Day Production Load Forecast
                    </h3>
                </div>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={forecast}>
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
                                labelFormatter={(d) => new Date(d).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
                            />
                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                            {schools.slice(0, 3).map((s, i) => (
                                <Bar key={s.schoolCode} dataKey={`schools.${s.schoolCode}`} name={s.schoolName} stackId="a" fill={CHART_COLORS[i]} />
                            ))}
                            <Bar dataKey="schools.OTHER" name="Other" stackId="a" fill={CHART_COLORS[4]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Size Distribution Chart */}
                <div className="bg-white border border-slate-200 rounded-md p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Ruler className="w-4 h-4 text-slate-400" />
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                            Size Distribution
                        </h3>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sizeDistribution} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E2E8F0" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="size"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#64748B', fontSize: 11 }}
                                    width={40}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F1F5F9' }}
                                    contentStyle={{ fontSize: '12px', border: '1px solid #E2E8F0' }}
                                />
                                <Bar dataKey="units" fill="#334155" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Detailed Table */}
                <div className="bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col">
                    <div className="px-5 py-4 border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                            Workload by School
                        </h3>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">School</th>
                                    <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Total Units</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {productionData.map((school, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-900">
                                            <div>{school.schoolName}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-[200px]">
                                                {school.products.slice(0, 2).map(p => p.productName).join(', ')}
                                                {school.products.length > 2 && '...'}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-900">{school.totalUnits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
