'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAnalyticsFilters } from '@/lib/analytics-context';
import { useData } from '@/lib/data-provider';
import { AnalyticsSummary } from '@/lib/analytics-types';

export default function AnalyticsProducts() {
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

    // Aggregate products across all schools (must be above any early returns)
    const aggregatedProducts = useMemo(() => {
        if (!data) return [];
        const productMap = new Map<string, { sku: string; name: string; units: number; revenue: number }>();

        data.schools.forEach(school => {
            school.products.forEach(product => {
                const existing = productMap.get(product.sku);
                if (existing) {
                    existing.units += product.unitsSold;
                    existing.revenue += product.revenue;
                } else {
                    productMap.set(product.sku, {
                        sku: product.sku,
                        name: product.productName,
                        units: product.unitsSold,
                        revenue: product.revenue,
                    });
                }
            });
        });

        return Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);
    }, [data]);

    if (loading || !data) {
        return <div className="p-8 text-center text-slate-500">Loading products data...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Product Rankings</h2>
                <div className="text-sm text-slate-500">
                    {aggregatedProducts.length} products across all schools
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Rank</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">SKU</th>
                            <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-wider">Product Name</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Units Sold</th>
                            <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-wider">Revenue</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {aggregatedProducts.map((product, index) => (
                            <tr key={product.sku} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-slate-400 font-medium">{index + 1}</td>
                                <td className="px-4 py-3 font-mono text-slate-600">{product.sku}</td>
                                <td className="px-4 py-3 text-slate-900 font-medium">{product.name}</td>
                                <td className="px-4 py-3 text-right text-slate-600">{product.units.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right font-medium text-slate-900">
                                    ${product.revenue.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
