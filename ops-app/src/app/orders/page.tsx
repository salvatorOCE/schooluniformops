'use client';

import { useState } from 'react';
import { HistoryProvider, useHistory } from '@/lib/history-context';
import { HistoryFilterBar, HistoryFilters } from '@/components/history/HistoryFilterBar';
import { HistoryList } from '@/components/history/HistoryList';
import { HistoryDetailDrawer } from '@/components/history/HistoryDetailDrawer';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { Package, Layers, Activity, Download, RefreshCw } from 'lucide-react';
import { OrderHistoryRecord } from '@/lib/types';
import { BatchHistoryTable } from '@/components/history/BatchHistoryTable';
import { RunHistoryTable } from '@/components/history/RunHistoryTable';
import { exportToCSV } from '@/lib/csv-export';
import { useToast } from '@/lib/toast-context';

function HistoryPageContent() {
    const { orders, batches, runs, refresh } = useHistory();
    const { toast } = useToast();
    const [syncingDates, setSyncingDates] = useState(false);
    const [activeTab, setActiveTab] = useState<'ORDERS' | 'BATCHES' | 'RUNS'>('ORDERS');
    const [selectedOrder, setSelectedOrder] = useState<OrderHistoryRecord | null>(null);

    const [filters, setFilters] = useState<HistoryFilters>({
        search: '',
        schools: [],
        deliveryTypes: [],
        statuses: [],
        hasIssues: false,
    });

    // --- Filtering Logic ---
    const filteredOrders = orders.filter(order => {
        if (filters.search) {
            const searchTerms = [
                order.orderId,
                order.studentName,
                order.parentName,
                order.schoolName
            ];
            const hasMatch = searchTerms.some(term => fuzzyMatch(filters.search, term, 0.4));
            if (!hasMatch) return false;
        }

        if (filters.schools.length > 0 && !filters.schools.includes(order.schoolCode)) return false;
        if (filters.deliveryTypes.length > 0 && !filters.deliveryTypes.includes(order.deliveryType)) return false;
        if (filters.statuses.length > 0 && !filters.statuses.includes(order.status)) return false;
        if (filters.hasIssues && !order.hasIssues) return false;

        return true;
    });

    // Sort by order date (paid or created), newest first – matches Dates column
    const orderDate = (o: OrderHistoryRecord) => (o.paidAt || o.createdAt).getTime();
    const sortedOrders = [...filteredOrders].sort((a, b) => orderDate(b) - orderDate(a));

    return (
        <div className="space-y-3 md:space-y-6 px-2 md:px-0">
            <header>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Orders & History</h1>
                        <p className="hidden md:block text-slate-500 text-sm">Investigate past orders, production batches, and run logs.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {activeTab === 'ORDERS' && (
                            <button
                                onClick={async () => {
                                    setSyncingDates(true);
                                    try {
                                        const res = await fetch('/api/woo/backfill-order-dates', { method: 'POST' });
                                        const data = await res.json().catch(() => ({}));
                                        if (!res.ok) throw new Error(data.error || 'Backfill failed');
                                        await refresh();
                                        toast.success(data.updated != null ? `Order dates updated: ${data.updated} orders now show correct placed/paid dates.` : 'Order dates refreshed from WooCommerce.');
                                    } catch (e: any) {
                                        toast.error(e.message || 'Failed to refresh dates from WooCommerce');
                                    } finally {
                                        setSyncingDates(false);
                                    }
                                }}
                                disabled={syncingDates}
                                className="flex items-center w-fit gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs md:text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-60"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncingDates ? 'animate-spin' : ''}`} />
                                {syncingDates ? 'Syncing…' : 'Refresh dates from Woo'}
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (activeTab === 'ORDERS') {
                                    exportToCSV(sortedOrders, {
                                        filename: 'order_history',
                                        columns: [
                                            { key: 'orderNumber', label: 'Order #' },
                                            { key: 'customerName', label: 'Customer' },
                                            { key: 'schoolName', label: 'School' },
                                            { key: 'studentName', label: 'Student' },
                                            { key: 'status', label: 'Status' },
                                            { key: 'deliveryType', label: 'Delivery' },
                                            { key: 'total', label: 'Total', formatter: (v: number) => v?.toFixed(2) || '0.00' },
                                            { key: 'createdAt', label: 'Created' },
                                        ]
                                    });
                                }
                            }}
                            className="flex items-center w-fit gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-white border border-slate-200 rounded-lg text-xs md:text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className="border-b border-slate-200 overflow-x-auto hide-scrollbar">
                <nav className="-mb-px flex gap-4 md:gap-6 min-w-max" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('ORDERS')}
                        className={`pb-3 md:pb-4 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 md:gap-2 ${activeTab === 'ORDERS'
                            ? 'border-slate-900 text-slate-900'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Package className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('BATCHES')}
                        className={`pb-3 md:pb-4 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 md:gap-2 ${activeTab === 'BATCHES'
                            ? 'border-slate-900 text-slate-900'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Layers className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Batches
                    </button>
                    <button
                        onClick={() => setActiveTab('RUNS')}
                        className={`pb-3 md:pb-4 px-1 text-xs md:text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 md:gap-2 ${activeTab === 'RUNS'
                            ? 'border-slate-900 text-slate-900'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        Run Logs
                    </button>
                </nav>
            </div>

            {/* Content Area */}
            {activeTab === 'ORDERS' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <HistoryFilterBar filters={filters} onFilterChange={setFilters} />
                    <HistoryList
                        data={sortedOrders}
                        onOrderClick={setSelectedOrder}
                    />
                </div>
            )}

            {activeTab === 'BATCHES' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <BatchHistoryTable data={batches} />
                </div>
            )}

            {activeTab === 'RUNS' && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <RunHistoryTable data={runs} />
                </div>
            )}

            <HistoryDetailDrawer
                order={selectedOrder}
                onClose={() => setSelectedOrder(null)}
            />
        </div>
    );
}

export default function HistoryPage() {
    return (
        <HistoryProvider>
            <HistoryPageContent />
        </HistoryProvider>
    );
}
