'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { HistoryProvider, useHistory } from '@/lib/history-context';
import { HistoryFilterBar, HistoryFilters } from '@/components/history/HistoryFilterBar';
import { HistoryList } from '@/components/history/HistoryList';
import { HistoryDetailDrawer } from '@/components/history/HistoryDetailDrawer';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { Package, Layers, Activity, RefreshCw } from 'lucide-react';
import { OrderHistoryRecord } from '@/lib/types';
import { BatchHistoryTable } from '@/components/history/BatchHistoryTable';
import { RunHistoryTable } from '@/components/history/RunHistoryTable';
import { useToast } from '@/lib/toast-context';
import { useSession } from '@/lib/session-context';
import { useData } from '@/lib/data-provider';
import { FileDown, Loader2 } from 'lucide-react';
import { downloadOrderDocketPdf, OrderDocketRow } from '@/lib/generate-order-docket-pdf';

const WOO_SYNC_POLL_MS = 2 * 60 * 1000; // 2 minutes

const ORDER_STATUS_OPTIONS = [
    'Pending Payment', 'Processing', 'On-Hold', 'Embroidery', 'Distribution', 'Packed',
    'Shipped', 'Partial Order Complete', 'Completed', 'Cancelled', 'Refunded', 'Failed',
];

function HistoryPageContent() {
    const { orders, batches, runs, refresh } = useHistory();
    const adapter = useData();
    const { toast } = useToast();
    const [syncingDates, setSyncingDates] = useState(false);
    const [activeTab, setActiveTab] = useState<'ORDERS' | 'BATCHES' | 'RUNS'>('ORDERS');
    const [selectedOrder, setSelectedOrder] = useState<OrderHistoryRecord | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
    const [bulkStatus, setBulkStatus] = useState('');
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [docketLoading, setDocketLoading] = useState(false);
    const syncInProgress = useRef(false);

    function formatWooAddress(addr: { first_name?: string; last_name?: string; company?: string; address_1?: string; address_2?: string; city?: string; state?: string; postcode?: string; country?: string } | undefined): string {
        if (!addr) return '';
        const parts = [
            [addr.first_name, addr.last_name].filter(Boolean).join(' '),
            addr.company,
            addr.address_1,
            addr.address_2,
            [addr.city, addr.state, addr.postcode].filter(Boolean).join(' '),
            addr.country
        ].filter(Boolean);
        return parts.join(', ');
    }

    // Quick sync from WooCommerce (pull new/updated orders), then refresh list
    const runWooSync = useCallback(async () => {
        if (syncInProgress.current) return;
        syncInProgress.current = true;
        try {
            const res = await fetch('/api/woo/pull-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullSync: false })
            });
            const data = await res.json().catch(() => ({}));
            if (data.success) {
                setLastSyncedAt(new Date());
                await refresh();
                if (data.count > 0) {
                    toast.success(`${data.count} order${data.count !== 1 ? 's' : ''} synced from WooCommerce`);
                }
            }
        } catch {
            // Silent in background; user can use manual sync
        } finally {
            syncInProgress.current = false;
        }
    }, [refresh, toast]);

    // On mount: sync once so new orders appear without clicking Sync
    useEffect(() => {
        runWooSync();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- run once on mount

    // While Orders tab is visible: poll every 2 min so new orders show up automatically
    useEffect(() => {
        if (activeTab !== 'ORDERS') return;
        const interval = setInterval(runWooSync, WOO_SYNC_POLL_MS);
        return () => clearInterval(interval);
    }, [activeTab, runWooSync]);

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
                    <div className="flex items-center gap-2 flex-wrap">
                        {activeTab === 'ORDERS' && (
                            <>
                                {lastSyncedAt && (
                                    <span className="text-xs text-slate-400 hidden sm:inline">
                                        Synced {lastSyncedAt.toLocaleTimeString()}
                                    </span>
                                )}
                                <button
                                onClick={async () => {
                                    setSyncingDates(true);
                                    try {
                                        // 1. Full sync from Woo so we never miss an order (e.g. 191) — fetches ALL orders, then upserts
                                        const syncRes = await fetch('/api/woo/pull-sync', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ fullSync: true })
                                        });
                                        const syncData = await syncRes.json().catch(() => ({}));
                                        if (!syncRes.ok) throw new Error(syncData.error || 'Sync failed');

                                        // 2. Backfill created_at/paid_at for all orders we have
                                        const datesRes = await fetch('/api/woo/backfill-order-dates', { method: 'POST' });
                                        const datesData = await datesRes.json().catch(() => ({}));
                                        if (!datesRes.ok) throw new Error(datesData.error || 'Backfill failed');

                                            await refresh();
                                            setLastSyncedAt(new Date());

                                        const newCount = syncData.count ?? 0;
                                        const datesCount = datesData.updated ?? 0;
                                        const errs = syncData.errors as { order_number?: string; error: string }[] | undefined;
                                        if (errs?.length) {
                                            toast.error(`${errs.length} order(s) failed: ${errs.map(e => `${e.order_number || '?'}: ${e.error}`).join('; ')}`);
                                        }
                                        if (newCount > 0 && datesCount > 0) {
                                            toast.success(`${newCount} new order(s) synced, ${datesCount} order dates updated.`);
                                        } else if (newCount > 0) {
                                            toast.success(`${newCount} new order(s) synced from WooCommerce.`);
                                        } else if (datesCount > 0) {
                                            toast.success(`${datesCount} order dates updated.`);
                                        } else if (!errs?.length) {
                                            toast.success('Already up to date with WooCommerce.');
                                        }
                                    } catch (e: any) {
                                        toast.error(e.message || 'Failed to sync from WooCommerce');
                                    } finally {
                                        setSyncingDates(false);
                                    }
                                }}
                                disabled={syncingDates}
                                className="flex items-center w-fit gap-1.5 px-3 py-1.5 md:px-4 md:py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs md:text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-60"
                            >
                                <RefreshCw className={`w-4 h-4 ${syncingDates ? 'animate-spin' : ''}`} />
                                {syncingDates ? 'Syncing…' : 'Sync from Woo'}
                            </button>
                                </>
                        )}
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
                    {selectedIds.size > 0 && (
                        <div className="flex flex-wrap items-center gap-3 py-3 px-4 bg-slate-50 border border-slate-200 rounded-lg mb-3">
                            <span className="text-sm font-medium text-slate-700">
                                {selectedIds.size} order{selectedIds.size !== 1 ? 's' : ''} selected
                            </span>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-slate-500">Status:</label>
                                <select
                                    value={bulkStatus}
                                    onChange={(e) => setBulkStatus(e.target.value)}
                                    className="text-sm border border-slate-300 rounded-lg px-2 py-1.5 bg-white"
                                >
                                    <option value="">Change status…</option>
                                    {ORDER_STATUS_OPTIONS.map((s) => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={!bulkStatus || bulkUpdating}
                                    onClick={async () => {
                                        if (!bulkStatus) return;
                                        setBulkUpdating(true);
                                        try {
                                            const orderIds = Array.from(selectedIds);
                                            const orderMap = new Map(sortedOrders.map(o => [o.orderId, o]));
                                            const idToUse = (oid: string) => orderMap.get(oid)?.id ?? oid;
                                            for (const oid of orderIds) {
                                                await adapter.updateOrderStatus(idToUse(oid), bulkStatus);
                                            }
                                            await refresh();
                                            setSelectedIds(new Set());
                                            setBulkStatus('');
                                            toast.success(`${orderIds.length} order(s) updated to ${bulkStatus}`);
                                        } catch (e: any) {
                                            toast.error(e.message || 'Failed to update orders');
                                        } finally {
                                            setBulkUpdating(false);
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
                                >
                                    {bulkUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                    Apply
                                </button>
                            </div>
                            <button
                                type="button"
                                disabled={docketLoading}
                                onClick={async () => {
                                    const selected = sortedOrders.filter(o => selectedIds.has(o.orderId));
                                    setDocketLoading(true);
                                    try {
                                        const rows: OrderDocketRow[] = await Promise.all(
                                            selected.map(async (order) => {
                                                const orderKey = order.id || order.orderId;
                                                if (!orderKey) return { ...order } as OrderDocketRow;
                                                try {
                                                    const res = await fetch(`/api/woo/order-details?orderId=${encodeURIComponent(orderKey)}`);
                                                    if (!res.ok) return { ...order } as OrderDocketRow;
                                                    const woo = await res.json();
                                                    const billing = woo.billing;
                                                    const shipping = woo.shipping;
                                                    return {
                                                        ...order,
                                                        phone: billing?.phone ?? billing?.email ?? null,
                                                        billingAddress: formatWooAddress(billing) || undefined,
                                                        shippingAddress: formatWooAddress(shipping) || undefined,
                                                        additionalInfo: woo.customer_note?.trim() || undefined,
                                                    } as OrderDocketRow;
                                                } catch {
                                                    return { ...order } as OrderDocketRow;
                                                }
                                            })
                                        );
                                        downloadOrderDocketPdf(rows);
                                        toast.success(`Docket PDF (${rows.length} order(s)) downloaded`);
                                    } catch (e: any) {
                                        toast.error(e.message || 'Failed to prepare docket');
                                    } finally {
                                        setDocketLoading(false);
                                    }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            >
                                {docketLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                                {docketLoading ? 'Preparing…' : 'Print docket PDF'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setSelectedIds(new Set()); setBulkStatus(''); }}
                                className="text-sm text-slate-500 hover:text-slate-700"
                            >
                                Clear selection
                            </button>
                        </div>
                    )}
                    <HistoryList
                        data={sortedOrders}
                        onOrderClick={setSelectedOrder}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
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
                onNoteAdded={refresh}
            />
        </div>
    );
}

export default function HistoryPage() {
    const { role, schoolCode, loading: sessionLoading } = useSession();
    // Wait for session so school users never see all orders before filter is applied
    if (sessionLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <p className="text-slate-500">Loading…</p>
            </div>
        );
    }
    return (
        <HistoryProvider schoolCode={role === 'school' ? schoolCode ?? undefined : undefined}>
            <HistoryPageContent />
        </HistoryProvider>
    );
}
