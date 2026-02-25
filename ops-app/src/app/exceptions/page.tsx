'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/lib/data-provider';
import { ExceptionOrder, FixUpRequest, Order } from '@/lib/types';
import { ExceptionBadge } from '@/components/ExceptionBadge';
import { ResolveExceptionModal } from '@/components/ResolveExceptionModal';
import { AgeBadge } from '@/components/AgeBadge';
import { GlobalOrderSearch } from '@/components/exceptions/GlobalOrderSearch';
import { FixUpList } from '@/components/exceptions/FixUpList';
import { FixUpCreationModal } from '@/components/exceptions/FixUpCreationModal';
import { FixUpDetailModal } from '@/components/exceptions/FixUpDetailModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertTriangle, Wrench, CheckCircle } from 'lucide-react';

type Tab = 'EXCEPTIONS' | 'FIX_UPS';

export default function ExceptionsPage() {
    const adapter = useData();
    const [activeTab, setActiveTab] = useState<Tab>('EXCEPTIONS');
    const [exceptions, setExceptions] = useState<ExceptionOrder[]>([]);
    const [fixUps, setFixUps] = useState<FixUpRequest[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [resolveOrder, setResolveOrder] = useState<ExceptionOrder | null>(null);
    const [createFixUpOrder, setCreateFixUpOrder] = useState<Order | null>(null);
    const [selectedFixUp, setSelectedFixUp] = useState<FixUpRequest | null>(null);

    const loadData = async () => {
        setLoading(true);
        const [excData, fixData] = await Promise.all([
            adapter.getExceptions(),
            adapter.getFixUps()
        ]);
        setExceptions(excData);
        setFixUps(fixData);
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleResolve = async (orderId: string, updates: { student_name?: string; school_code?: string; school_name?: string }) => {
        await adapter.resolveException(orderId, updates);
        loadData();
    };

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto px-4 md:px-6 -mt-8 pt-8 space-y-6">
                <div className="border-b border-slate-200 pb-6">
                    <Skeleton className="h-8 w-64 mb-2" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Skeleton className="h-14 w-full max-w-2xl rounded-xl" />
                <div className="flex gap-2 pt-2">
                    <Skeleton className="h-10 w-40 rounded-lg" />
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
                <div className="space-y-4 pt-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header — full-bleed at top of main, no grey strip */}
            <div className="border-b border-slate-200 bg-white shadow-sm -mt-8 pt-8">
                <div className="max-w-4xl mx-auto px-4 md:px-6 pb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-100 text-amber-600 shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </span>
                        Order Recovery Center
                    </h1>
                    <p className="mt-2 text-slate-500 text-sm max-w-xl">
                        Locate any order to start a recovery workflow, or fix orders blocked by missing data.
                    </p>

                    <div className="mt-5">
                        <GlobalOrderSearch
                            onSelectOrder={(order) => setCreateFixUpOrder(order)}
                        />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 md:px-6 pt-0">

                {/* Tabs — underline style */}
                <div className="border-b border-slate-200 overflow-x-auto hide-scrollbar pt-2">
                    <nav className="-mb-px flex gap-8 min-w-max" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('EXCEPTIONS')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'EXCEPTIONS'
                                ? 'border-amber-600 text-amber-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            Data Exceptions
                            {exceptions.length > 0 && (
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {exceptions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('FIX_UPS')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'FIX_UPS'
                                ? 'border-emerald-600 text-emerald-700'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <Wrench className="w-4 h-4" />
                            Active Fix-Ups
                            {fixUps.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {fixUps.length}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'EXCEPTIONS' && (
                    <div className="py-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {exceptions.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-amber-900">
                                        {exceptions.length} order{exceptions.length > 1 ? 's' : ''} blocked from production
                                    </p>
                                    <p className="text-sm text-amber-800/90 mt-0.5">
                                        Missing data prevents these from entering the embroidery queue. Resolve below.
                                    </p>
                                </div>
                            </div>
                        )}

                        {exceptions.length === 0 ? (
                            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle className="w-6 h-6 text-emerald-600" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">No data exceptions</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                                    All orders have the required student and school data. Use the search above to start a fix-up for any order.
                                </p>
                            </div>
                        ) : (
                            exceptions.map((order) => (
                                <div
                                    key={order.id}
                                    className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-slate-300 hover:shadow transition-colors"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                <span className="font-bold text-lg text-slate-900">{order.order_number}</span>
                                                <ExceptionBadge type={order.exception_type} />
                                                <AgeBadge timestamp={order.paid_at} />
                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parent</p>
                                                    <p className="font-medium text-slate-900 mt-0.5">{order.parent_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student</p>
                                                    <p className={`font-medium mt-0.5 ${!order.student_name ? 'text-amber-600' : 'text-slate-900'}`}>
                                                        {order.student_name || 'Missing'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">School</p>
                                                    <p className={`font-medium mt-0.5 ${!order.school_code ? 'text-amber-600' : 'text-slate-900'}`}>
                                                        {order.school_name || 'Missing'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Items</p>
                                                    <p className="font-medium text-slate-700 mt-0.5">
                                                        {order.items.reduce((sum, i) => sum + i.quantity, 0)} units
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setResolveOrder(order)}
                                            className="btn btn-sm bg-[#19966D] hover:bg-[#15805C] text-white border-0 shadow-sm self-start shrink-0"
                                        >
                                            Resolve issue
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'FIX_UPS' && (
                    <div className="py-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <FixUpList
                            fixUps={fixUps}
                            onSelect={setSelectedFixUp}
                            onUpdateStatus={async (id, status) => {
                                await adapter.updateFixUpStatus(id, status);
                                loadData();
                            }}
                        />
                    </div>
                )}
            </div>

            {resolveOrder && (
                <ResolveExceptionModal
                    order={resolveOrder}
                    onClose={() => setResolveOrder(null)}
                    onResolve={handleResolve}
                />
            )}

            {createFixUpOrder && (
                <FixUpCreationModal
                    order={createFixUpOrder}
                    onClose={() => setCreateFixUpOrder(null)}
                    onSuccess={() => {
                        setActiveTab('FIX_UPS');
                        loadData();
                    }}
                />
            )}

            {selectedFixUp && (
                <FixUpDetailModal
                    fixUp={selectedFixUp}
                    onClose={() => setSelectedFixUp(null)}
                    onSave={loadData}
                />
            )}
        </div>
    );
}
