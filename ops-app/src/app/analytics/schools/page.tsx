'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAnalyticsFilters } from '@/lib/analytics-context';
import { useData } from '@/lib/data-provider';
import { AnalyticsSummary } from '@/lib/analytics-types';
import { AnalyticsOrderRow } from '@/lib/analytics-types';
import { SchoolDrilldownTable } from '@/components/analytics/SchoolDrilldownTable';
import { OrdersDrilldownModal } from '@/components/analytics/OrdersModal';

export default function AnalyticsSchools() {
    const { filters } = useAnalyticsFilters();
    const adapter = useData();
    const [modalOrders, setModalOrders] = useState<AnalyticsOrderRow[]>([]);
    const [modalContext, setModalContext] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
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

    if (loading || !data) {
        return <div className="p-8 text-center text-slate-500">Loading schools data...</div>;
    }

    const handleViewOrders = (orders: AnalyticsOrderRow[], context: string) => {
        setModalOrders(orders);
        setModalContext(context);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">School Performance</h2>
                <div className="text-sm text-slate-500">
                    {data.schools.length} schools • {data.kpis.orders} orders
                </div>
            </div>

            <SchoolDrilldownTable
                schools={data.schools}
                orders={data.orders}
                onViewOrders={handleViewOrders}
            />

            <OrdersDrilldownModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                orders={modalOrders}
                context={modalContext}
            />
        </div>
    );
}
