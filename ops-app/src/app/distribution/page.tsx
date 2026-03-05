'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-provider';
import { Order, SchoolRunGroup, OrderStatus, PackOutManifest } from '@/lib/types';
import { PrintLabelModal } from '@/components/PrintLabelModal';
import { ExceptionModal } from '@/components/distribution/ExceptionModal';
import { PackingListView } from '@/components/distribution/PackingListView';
import { PackingSessionView } from '@/components/distribution/PackingSessionView';
import { DispatchManager } from '@/components/distribution/DispatchManager';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WooSyncBadge } from '@/components/ui/WooSyncBadge';

import { useToast } from '@/lib/toast-context';
import { buildManifestFromOrders, downloadPackOutManifestPdf } from '@/lib/generate-pack-out-manifest-pdf';
import { hasNonSeniorItems, hasSeniorItems, orderWithOnlyNonSeniorItems, orderWithOnlySeniorItems } from '@/lib/utils';
import { Search, X, Package, Truck } from 'lucide-react';

type MainTab = 'PACKING' | 'DISPATCH';

export default function DistributionPage() {
    const adapter = useData();

    // View State

    const [activeTab, setActiveTab] = useState<MainTab>('PACKING');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    // Data - Packing
    const [packingSessions, setPackingSessions] = useState<SchoolRunGroup[]>([]);
    const [activeSession, setActiveSession] = useState<SchoolRunGroup | null>(null);

    // Data - Dispatch
    const [dispatchSchoolRuns, setDispatchSchoolRuns] = useState<SchoolRunGroup[]>([]);
    const [dispatchHomeOrders, setDispatchHomeOrders] = useState<Order[]>([]);
    const [dispatchStoreOrders, setDispatchStoreOrders] = useState<Order[]>([]);

    // Toast
    const { toast } = useToast();

    // Modals & one-off states
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [packOrder, setPackOrder] = useState<Order | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
    const [exceptionOrder, setExceptionOrder] = useState<Order | null>(null);
    const [syncedOrderIds, setSyncedOrderIds] = useState<Set<string>>(new Set());
    const [lastManifest, setLastManifest] = useState<PackOutManifest | null>(null);

    const matchesSearch = (session: SchoolRunGroup) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return session.school_name.toLowerCase().includes(q) || session.school_code.toLowerCase().includes(q);
    };

    // Dupe system: orders with BOTH senior and non-senior items appear in BOTH sections (with filtered items per section).
    // Item-level senior: product name contains senior/year 6/yr 6 (see utils isItemSenior).
    const nonSeniorSessions: SchoolRunGroup[] = packingSessions
        .map(session => {
            const ordersWithNonSenior = session.orders
                .filter(o => o.order_status !== 'Partial Order Complete' && hasNonSeniorItems(o))
                .map(o => ({
                    ...orderWithOnlyNonSeniorItems(o),
                    _alsoHasSeniorItems: hasSeniorItems(o)
                }));
            if (ordersWithNonSenior.length === 0 || !matchesSearch(session)) return null;
            return {
                ...session,
                orders: ordersWithNonSenior,
                order_count: ordersWithNonSenior.length,
                item_count: ordersWithNonSenior.reduce((sum, o) => sum + o.items.reduce((acc, i) => acc + i.quantity, 0), 0),
                section: 'NON_SENIOR' as const
            };
        })
        .filter(Boolean) as SchoolRunGroup[];

    const seniorSessions: SchoolRunGroup[] = packingSessions
        .map(session => {
            const ordersWithSenior = session.orders
                .filter(o => hasSeniorItems(o))
                .map(o => orderWithOnlySeniorItems(o));
            if (ordersWithSenior.length === 0 || !matchesSearch(session)) return null;
            return {
                ...session,
                orders: ordersWithSenior,
                order_count: ordersWithSenior.length,
                item_count: ordersWithSenior.reduce((sum, o) => sum + o.items.reduce((acc, i) => acc + i.quantity, 0), 0),
                section: 'SENIOR' as const
            };
        })
        .filter(Boolean) as SchoolRunGroup[];

    const loadData = async () => {
        setLoading(true);
        if (activeTab === 'PACKING') {
            const sessions = await adapter.getPackingSessions();
            setPackingSessions(sessions);

            // Refresh active session if open (re-apply same section filter and item filter)
            if (activeSession) {
                const rawSession = sessions.find(s => s.school_code === activeSession.school_code);
                if (rawSession) {
                    const isSeniorSection = activeSession.section === 'SENIOR';
                    const filtered = isSeniorSection
                        ? rawSession.orders.filter(hasSeniorItems).map(orderWithOnlySeniorItems)
                        : rawSession.orders
                            .filter(o => o.order_status !== 'Partial Order Complete' && hasNonSeniorItems(o))
                            .map(o => ({ ...orderWithOnlyNonSeniorItems(o), _alsoHasSeniorItems: hasSeniorItems(o) }));
                    if (filtered.length > 0) {
                        setActiveSession({
                            ...rawSession,
                            orders: filtered,
                            order_count: filtered.length,
                            item_count: filtered.reduce((sum, o) => sum + o.items.reduce((acc, i) => acc + i.quantity, 0), 0),
                            section: activeSession.section
                        });
                    } else {
                        setActiveSession(null);
                    }
                } else {
                    setActiveSession(null);
                }
            }
        } else {
            // Load Dispatch Data
            // Schools: runs where orders are Packed and ready to leave the warehouse
            const schoolData = await adapter.getSchoolRuns();
            setDispatchSchoolRuns(schoolData);

            // Home / Store: individual orders that are Packed
            const homeData = await adapter.getDistributionQueue('HOME', ['Packed']);
            setDispatchHomeOrders(homeData);

            const storeData = await adapter.getDistributionQueue('STORE', ['Packed']);
            setDispatchStoreOrders(storeData);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const handleOpenSession = (session: SchoolRunGroup) => {
        setActiveSession(session);
    };

    const handleBackToPackingList = async () => {
        setActiveSession(null);
        setLoading(true);
        const sessions = await adapter.getPackingSessions();
        setPackingSessions(sessions);
        setLoading(false);
    };

    const handleDirectPack = async (orderId: string) => {
        await adapter.packOrder(orderId);
        loadData();
    };

    const handleFinishPackOut = async (packedOrders: Order[], schoolCode: string, schoolName: string) => {
        if (packedOrders.length === 0) return;

        const isSeniorSection = activeSession?.section === 'SENIOR';

        // Build manifest for the completed orders
        const manifest = buildManifestFromOrders(schoolCode, schoolName, packedOrders);
        await adapter.savePackOutManifest(manifest);

        for (const order of packedOrders) {
            // Mark sent_quantity for the items we packed (this session shows only senior or only non-senior items)
            for (const item of order.items) {
                await adapter.updateOrderItemSentQuantity(item.id, item.quantity);
            }

            // After pack out, move all orders to Packed so they appear
            // in the Dispatch tab (Schools) ready to ship.
            await adapter.updateOrderStatus(order.id, 'Packed');
        }

        setLastManifest(manifest);
        toast.success(isSeniorSection
            ? 'Senior pack out completed. Orders marked as Packed and moved to Dispatch.'
            : 'Pack out completed. Orders marked as Packed and moved to Dispatch.');
        handleBackToPackingList();
    };

    const handleUpdateOrder = async (orderId: string, items: any[]) => {
        await adapter.editOrderItems(orderId, items);
        loadData();
    };

    // Dispatch Handlers
    const handleDispatchRun = (schoolCode: string) => {
        setConfirmAction({
            title: 'Successfully Shipped',
            message: 'Mark all packed orders in this school run as Shipped?',
            action: async () => {
                await adapter.dispatchSchoolRun(schoolCode);
                toast.success('School run marked as Shipped.');
                loadData();
            }
        });
    };

    const handleDispatchOrder = async (orderId: string) => {
        await adapter.dispatchOrder(orderId);
        await adapter.syncStatusToWoo(orderId, 'completed', 'Dispatched individually');
        setSyncedOrderIds(prev => new Set(prev).add(orderId));
        toast.success('Order dispatched & synced');
        loadData();
    };

    const handleBatchDispatchHome = (carrier: string) => {
        setConfirmAction({
            title: 'Batch Dispatch',
            message: `Dispatch all packed orders for ${carrier}?`,
            action: async () => {
                await adapter.dispatchCarrierBatch(carrier);
                toast.success(`${carrier} batch dispatched!`);
                loadData();
            }
        });
    };

    const handleStageStore = async (orderId: string, location: string) => {
        await adapter.moveToStaged(orderId, location);
        toast.info(`Staged at ${location}`);
        loadData();
    };

    const handleHandoverStore = (orderId: string) => {
        setConfirmAction({
            title: 'Confirm Collection',
            message: 'Confirm the parent has collected this order?',
            action: async () => {
                await adapter.dispatchOrder(orderId);
                toast.success('Collection confirmed!');
                loadData();
            }
        });
    };

    // Exception Handler
    const handleReportException = async (type: string, note: string) => {
        if (exceptionOrder) {
            await adapter.resolveException(exceptionOrder.id, {
                order_status: 'EXCEPTION' as OrderStatus
            } as any);
            setExceptionOrder(null);
            loadData();
        }
    };


    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header — matches Orders / Digital Stock / app style */}
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            <Package className="w-6 h-6 text-slate-500" />
                            Distribution
                        </h1>
                        <p className="text-slate-500 font-medium mt-0.5 text-sm">Pack orders and dispatch school runs</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button
                                onClick={() => { setActiveTab('PACKING'); setActiveSession(null); }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'PACKING'
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Package className="w-4 h-4" />
                                Packing
                            </button>
                            <button
                                onClick={() => setActiveTab('DISPATCH')}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'DISPATCH'
                                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                    }`}
                            >
                                <Truck className="w-4 h-4" />
                                Dispatch
                            </button>
                        </div>
                        {activeTab === 'DISPATCH' && (
                            <WooSyncBadge synced={syncedOrderIds.size > 0} />
                        )}
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {lastManifest && (
                    <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <div className="text-sm font-semibold text-emerald-800">
                                Completed orders have been changed to shipped.
                            </div>
                            <div className="text-xs text-emerald-700 mt-1">
                                You can download this pack-out manifest now or later from Order Tracking.
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => downloadPackOutManifestPdf(lastManifest)}
                                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Download manifest
                            </button>
                            <Link
                                href="/tracking?tab=MANIFESTS"
                                className="text-xs font-semibold px-3 py-1.5 rounded-md border border-emerald-400 text-emerald-800 hover:bg-emerald-100"
                            >
                                Go to Order Tracking
                            </Link>
                            <button
                                type="button"
                                onClick={() => setLastManifest(null)}
                                className="text-xs text-emerald-700 hover:text-emerald-900"
                            >
                                Dismiss
                            </button>
                        </div>
                    </div>
                )}
                {activeTab === 'PACKING' && (
                    <>
                        {/* Search */}
                        <div className="mb-6 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search schools..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {!activeSession ? (
                            <div className="space-y-10">
                                {/* NON-SENIOR section */}
                                <section>
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wide border-b border-slate-200 pb-2">
                                        Non-Senior
                                    </h2>
                                    <PackingListView
                                        sessions={nonSeniorSessions}
                                        onOpenSession={handleOpenSession}
                                    />
                                </section>
                                {/* SENIOR section */}
                                <section>
                                    <h2 className="text-lg font-bold text-slate-800 mb-4 uppercase tracking-wide border-b border-slate-200 pb-2">
                                        Senior
                                    </h2>
                                    <PackingListView
                                        sessions={seniorSessions}
                                        onOpenSession={handleOpenSession}
                                    />
                                </section>
                            </div>
                        ) : (
                            <PackingSessionView
                                schoolName={activeSession.school_name}
                                schoolCode={activeSession.school_code}
                                orders={activeSession.orders}
                                isSeniorSection={activeSession.section === 'SENIOR'}
                                onPack={handleDirectPack}
                                onBack={handleBackToPackingList}
                                onReportIssue={setExceptionOrder}
                                onUpdateOrder={handleUpdateOrder}
                                onFinishPackOut={handleFinishPackOut}
                                onRefresh={loadData}
                            />
                        )}
                    </>
                )}

                {activeTab === 'DISPATCH' && (
                    <DispatchManager
                        schoolRuns={dispatchSchoolRuns}
                        homeOrders={dispatchHomeOrders}
                        storeOrders={dispatchStoreOrders}
                        onDispatchRun={handleDispatchRun}
                        onDispatchOrder={handleDispatchOrder}
                        onBatchDispatchHome={handleBatchDispatchHome}
                        onStageStore={handleStageStore}
                        onHandoverStore={handleHandoverStore}
                        onPrintLabel={setPrintOrder}
                        onReportIssue={setExceptionOrder}
                        onOrderUpdated={loadData}
                    />
                )}
            </div>

            {/* Modals */}
            {/* PackingChecklistModal removed as we use inline verification now */}

            {exceptionOrder && (
                <ExceptionModal
                    order={exceptionOrder}
                    onClose={() => setExceptionOrder(null)}
                    onReport={handleReportException}
                />
            )}

            {printOrder && (
                <PrintLabelModal
                    order={printOrder}
                    onClose={() => setPrintOrder(null)}
                />
            )}

            <ConfirmDialog
                isOpen={!!confirmAction}
                title={confirmAction?.title || ''}
                message={confirmAction?.message || ''}
                onConfirm={() => {
                    confirmAction?.action();
                    setConfirmAction(null);
                }}
                onCancel={() => setConfirmAction(null)}
            />
        </div>
    );
}
