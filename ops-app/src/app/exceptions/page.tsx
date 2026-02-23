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
        return <div className="animate-pulse p-8">Loading workspace...</div>;
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header Area */}
            <div className="bg-[#1e293b] text-white pt-8 pb-12 px-6 shadow-md">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Order Recovery Center</h1>
                    <p className="text-slate-300 mb-8 max-w-xl">
                        Locate any order instantly to launch a recovery workflow, or manage active exceptions and fix-ups.
                    </p>

                    {/* Global Search */}
                    <GlobalOrderSearch
                        onSelectOrder={(order) => {
                            // Open Fix-Up Wizard
                            // alert(`Selected Order: ${order.order_number}`);
                            setCreateFixUpOrder(order);
                        }}
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-5xl mx-auto -mt-6 px-6">

                {/* Tabs */}
                <div className="flex bg-white rounded-lg shadow-sm p-1 mb-8 inline-flex">
                    <button
                        onClick={() => setActiveTab('EXCEPTIONS')}
                        className={`px-6 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'EXCEPTIONS'
                            ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        <span>Data Exceptions</span>
                        {exceptions.length > 0 && <span className="bg-red-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{exceptions.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('FIX_UPS')}
                        className={`px-6 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'FIX_UPS'
                            ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                    >
                        <span>Active Fix-Ups</span>
                        {fixUps.length > 0 && <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">{fixUps.length}</span>}
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'EXCEPTIONS' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {/* Warning Banner */}
                        {exceptions.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
                                <span className="text-xl">⚠️</span>
                                <div>
                                    <p className="font-bold text-red-800">
                                        {exceptions.length} order{exceptions.length > 1 ? 's' : ''} blocked from production
                                    </p>
                                    <p className="text-sm text-red-700 mt-1">
                                        Missing data prevents these from entering the embroidery queue.
                                    </p>
                                </div>
                            </div>
                        )}

                        {exceptions.map((order) => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:border-red-300 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-bold text-lg text-slate-800">{order.order_number}</span>
                                            <ExceptionBadge type={order.exception_type} />
                                            <AgeBadge timestamp={order.paid_at} />
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm mt-4">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">Parent</p>
                                                <p className="font-medium text-slate-900">{order.parent_name}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">Student</p>
                                                <p className={`font-medium ${!order.student_name ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {order.student_name || '⚠️ Missing'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">School</p>
                                                <p className={`font-medium ${!order.school_code ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {order.school_name || '⚠️ Missing'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-slate-400 uppercase">Load</p>
                                                <p className="font-medium text-slate-700">
                                                    {order.items.reduce((sum, i) => sum + i.quantity, 0)} items
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setResolveOrder(order)}
                                        className="btn btn-sm btn-outline border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 gap-2"
                                    >
                                        Resolve Issue
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'FIX_UPS' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <FixUpList
                            fixUps={fixUps}
                            onSelect={(fix) => {
                                // View details - for now just alert or log
                                console.log("Selected fix up", fix);
                            }}
                            onUpdateStatus={async (id, status) => {
                                await adapter.updateFixUpStatus(id, status);
                                loadData();
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Resolve Modal */}
            {resolveOrder && (
                <ResolveExceptionModal
                    order={resolveOrder}
                    onClose={() => setResolveOrder(null)}
                    onResolve={handleResolve}
                />
            )}

            {/* Fix Up Creation Modal */}
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
        </div>
    );
}
