'use client';

import { AnalyticsKpis } from '@/lib/analytics-types';
import {
    DollarSign,
    ShoppingCart,
    Package,
    TrendingUp,
    Building2,
    Tag
} from 'lucide-react';

interface KpiCardsProps {
    kpis: AnalyticsKpis;
}

export function AnalyticsKpiCards({ kpis }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <KpiCard
                label="Gross Sales"
                value={`$${kpis.grossSales.toLocaleString()}`}
                icon={DollarSign}
            />
            <KpiCard
                label="Orders"
                value={kpis.orders.toLocaleString()}
                icon={ShoppingCart}
            />
            <KpiCard
                label="Items Sold"
                value={kpis.itemsSold.toLocaleString()}
                icon={Package}
            />
            <KpiCard
                label="Avg Order Value"
                value={`$${kpis.avgOrderValue}`}
                icon={TrendingUp}
            />
            <KpiCard
                label="Top School"
                value={kpis.topSchool.name.split(' ')[0] || 'N/A'}
                subValue={`$${kpis.topSchool.revenue.toLocaleString()}`}
                icon={Building2}
            />
            <KpiCard
                label="Top SKU"
                value={kpis.topSku.sku || 'N/A'}
                subValue={`${kpis.topSku.units} units`}
                icon={Tag}
            />
        </div>
    );
}

function KpiCard({
    label,
    value,
    subValue,
    icon: Icon
}: {
    label: string;
    value: string;
    subValue?: string;
    icon: React.ElementType;
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-md p-3">
            <div className="flex items-start justify-between mb-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
                <Icon className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <div className="text-lg font-bold text-slate-900 leading-tight">{value}</div>
            {subValue && (
                <div className="text-xs text-slate-500 mt-0.5">{subValue}</div>
            )}
        </div>
    );
}
