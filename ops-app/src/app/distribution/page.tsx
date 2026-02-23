'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-provider';
import { Order, SchoolRunGroup, OrderStatus } from '@/lib/types';
import { PrintLabelModal } from '@/components/PrintLabelModal';
import { ExceptionModal } from '@/components/distribution/ExceptionModal';
import { PackingListView } from '@/components/distribution/PackingListView';
import { PackingSessionView } from '@/components/distribution/PackingSessionView';
import { DispatchManager } from '@/components/distribution/DispatchManager';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { WooSyncBadge } from '@/components/ui/WooSyncBadge';

import { useToast } from '@/lib/toast-context';
import { Search, X } from 'lucide-react';

type MainTab = 'PACKING' | 'DISPATCH';

export default function DistributionPage() {
    const adapter = useData();

    // View State

    const [activeTab, setActiveTab] = useState<MainTab>('PACKING');
    const [packViewMode, setPackViewMode] = useState<'STANDARD' | 'SENIOR'>('STANDARD');
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

    // Modals
    const [printOrder, setPrintOrder] = useState<Order | null>(null);
    const [packOrder, setPackOrder] = useState<Order | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; action: () => void } | null>(null);
    const [exceptionOrder, setExceptionOrder] = useState<Order | null>(null);
    const [syncedOrderIds, setSyncedOrderIds] = useState<Set<string>>(new Set());

    // Derived Sessions based on View Mode
    const displayedSessions = packingSessions.map(session => {
        // Filter orders based on mode
        const filteredOrders = session.orders.filter(o =>
            packViewMode === 'SENIOR' ? o.is_senior_order : !o.is_senior_order
        );



        // Filter by Search Query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesSchool = session.school_name.toLowerCase().includes(query) ||
                session.school_code.toLowerCase().includes(query);

            if (!matchesSchool) return null;
        }

        if (filteredOrders.length === 0) return null;

        return {
            ...session,
            orders: filteredOrders,
            order_count: filteredOrders.length,
            // Recalculate item count implies mapping items, but let's just use order length for list view for now to save perf
            // or we can sum it up if needed for the badge
            item_count: filteredOrders.reduce((sum, o) => sum + o.items.reduce((acc, i) => acc + i.quantity, 0), 0)
        };
    }).filter(Boolean) as SchoolRunGroup[];

    const loadData = async () => {
        setLoading(true);
        if (activeTab === 'PACKING') {
            const sessions = await adapter.getPackingSessions();
            setPackingSessions(sessions);

            // Refresh active session if open
            if (activeSession) {
                // We need to re-find the session AND re-filter it based on current mode
                const rawSession = sessions.find(s => s.school_code === activeSession.school_code);
                if (rawSession) {
                    const filteredOrders = rawSession.orders.filter(o =>
                        packViewMode === 'SENIOR' ? o.is_senior_order : !o.is_senior_order
                    );

                    if (filteredOrders.length > 0) {
                        setActiveSession({
                            ...rawSession,
                            orders: filteredOrders,
                            order_count: filteredOrders.length,
                            item_count: filteredOrders.reduce((sum, o) => sum + o.items.reduce((acc, i) => acc + i.quantity, 0), 0)
                        });
                    } else {
                        setActiveSession(null); // Closed if no orders left in this view
                    }
                } else {
                    setActiveSession(null);
                }
            }
        } else {
            // Load Dispatch Data
            const schoolData = await adapter.getSchoolRuns(); // Includes PACKED
            setDispatchSchoolRuns(schoolData.filter(g => g.orders.some(o => o.order_status === 'PACKED')));

            const homeData = await adapter.getDistributionQueue('HOME', ['PACKED']);
            setDispatchHomeOrders(homeData);

            const storeData = await adapter.getDistributionQueue('STORE', ['PACKED']);
            setDispatchStoreOrders(storeData);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [activeTab, packViewMode]); // Reload/Re-filter when mode changes

    // Handlers
    const handleOpenSession = (schoolCode: string) => {
        const session = displayedSessions.find(s => s.school_code === schoolCode);
        if (session) setActiveSession(session);
    };

    const handleBackToPackingList = async () => {
        setActiveSession(null);
        setLoading(true);
        // Manually fetch to avoid closure issue with loadData() capturing activeSession
        const sessions = await adapter.getPackingSessions();
        setPackingSessions(sessions);
        setLoading(false);
    };

    const handleDirectPack = async (orderId: string) => {
        await adapter.packOrder(orderId);
        // No need to setPackOrder(null) as we aren't using the modal
        loadData();
    };

    const handleUpdateOrder = async (orderId: string, items: any[]) => {
        await adapter.editOrderItems(orderId, items);
        loadData();
    };

    // Dispatch Handlers
    const handleDispatchRun = (schoolCode: string) => {
        setConfirmAction({
            title: 'Dispatch School Run',
            message: 'Dispatch all packed orders in this school run?',
            action: async () => {
                await adapter.dispatchSchoolRun(schoolCode);
                // Sync each order to WooCommerce
                const run = dispatchSchoolRuns.find(r => r.school_code === schoolCode);
                if (run) {
                    for (const order of run.orders) {
                        await adapter.syncStatusToWoo(order.id, 'completed', 'Dispatched via school run');
                        setSyncedOrderIds(prev => new Set(prev).add(order.id));
                    }
                }
                toast.success('School run dispatched & synced to WooCommerce!');
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
            {/* Header */}
            <div className="bg-[#1e293b] text-white px-8 py-4 shadow-md sticky top-0 z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white/90">Distribution Workspace</h1>
                        <div className="text-xs text-blue-200 mt-0.5 font-medium uppercase tracking-wider">High Volume Mode</div>
                    </div>

                    <div className="flex bg-slate-800/50 p-1 rounded-lg">
                        <button
                            onClick={() => { setActiveTab('PACKING'); setActiveSession(null); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'PACKING'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            📦 Packing
                        </button>
                        <button
                            onClick={() => setActiveTab('DISPATCH')}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'DISPATCH'
                                ? 'bg-green-600 text-white shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                }`}
                        >
                            🚀 Dispatch
                        </button>
                    </div>
                    {activeTab === 'DISPATCH' && (
                        <WooSyncBadge synced={syncedOrderIds.size > 0} className="ml-3" />
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {activeTab === 'PACKING' && (
                    <>
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex bg-slate-200 p-1 rounded-lg">
                                <button
                                    onClick={() => setPackViewMode('STANDARD')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${packViewMode === 'STANDARD' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                        }`}
                                >
                                    Standard Pack-Out
                                </button>
                                <button
                                    onClick={() => setPackViewMode('SENIOR')}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${packViewMode === 'SENIOR' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-purple-700'
                                        }`}
                                >
                                    Senior Pack-Out
                                </button>
                            </div>

                            {packViewMode === 'SENIOR' && (
                                <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1 rounded-full animate-pulse">
                                    MASTER SENIOR BATCH MODE
                                </span>
                            )}
                        </div>

                        {/* Search Bar */}
                        <div className="mb-6 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search schools..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            <PackingListView
                                sessions={displayedSessions}
                                onOpenSession={handleOpenSession}
                            />
                        ) : (
                            <PackingSessionView
                                schoolName={activeSession.school_name}
                                orders={activeSession.orders}
                                onPack={handleDirectPack}
                                onBack={handleBackToPackingList}
                                onReportIssue={setExceptionOrder}
                                onUpdateOrder={handleUpdateOrder}
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
