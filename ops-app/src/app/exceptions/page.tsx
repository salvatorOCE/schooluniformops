'use client';

import { useEffect, useState, useMemo } from 'react';
import { useData } from '@/lib/data-provider';
import { useSession } from '@/lib/session-context';
import { useToast } from '@/lib/toast-context';
import { ExceptionOrder, FixUpRequest, Order, SystemEvent } from '@/lib/types';
import { EventLogger } from '@/lib/event-logger';
import { ExceptionBadge } from '@/components/ExceptionBadge';
import { ResolveExceptionModal } from '@/components/ResolveExceptionModal';
import { AgeBadge } from '@/components/AgeBadge';
import { GlobalOrderSearch } from '@/components/exceptions/GlobalOrderSearch';
import { FixUpList } from '@/components/exceptions/FixUpList';
import { FixUpCreationModal } from '@/components/exceptions/FixUpCreationModal';
import { FixUpDetailModal } from '@/components/exceptions/FixUpDetailModal';
import { Skeleton } from '@/components/ui/Skeleton';
import { AlertTriangle, Wrench, CheckCircle, Clock } from 'lucide-react';

type Tab = 'EXCEPTIONS' | 'FIX_UPS' | 'HISTORY';

export default function ExceptionsPage() {
    const adapter = useData();
    const { role, schoolCode, loading: sessionLoading } = useSession();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState<Tab>('EXCEPTIONS');
    const [exceptions, setExceptions] = useState<ExceptionOrder[]>([]);
    const [fixUps, setFixUps] = useState<FixUpRequest[]>([]);
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [resolveOrder, setResolveOrder] = useState<ExceptionOrder | null>(null);
    const [createFixUpOrder, setCreateFixUpOrder] = useState<Order | null>(null);
    const [selectedFixUp, setSelectedFixUp] = useState<FixUpRequest | null>(null);

    const loadData = async () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (role === 'school' && schoolCode?.trim()) params.set('schoolCode', schoolCode.trim());
        const query = params.toString();
        const suffix = query ? `?${query}` : '';
        try {
            const [excRes, fixRes] = await Promise.all([
                fetch(`/api/exceptions${suffix}`, { credentials: 'include' }),
                fetch(`/api/fix-ups${suffix}`, { credentials: 'include' })
            ]);
            if (excRes.ok && fixRes.ok) {
                const [excData, fixData] = await Promise.all([excRes.json(), fixRes.json()]);
                setExceptions(Array.isArray(excData) ? excData : []);
                setFixUps(Array.isArray(fixData) ? fixData : []);
                setLoading(false);
                return;
            }
        } catch {
            // Fall through to adapter
        }
        const [excData, fixData] = await Promise.all([
            adapter.getExceptions(),
            adapter.getFixUps()
        ]);
        setExceptions(excData);
        setFixUps(fixData);
        setLoading(false);
    };

    const loadEvents = async () => {
        const recent = await EventLogger.getRecentEvents(100);
        setEvents(recent.filter(e => e.entity_type === 'FIX_UP'));
    };

    useEffect(() => {
        if (sessionLoading) return;
        loadData();
        loadEvents();
    }, [role, schoolCode, sessionLoading]);

    const isSchool = role === 'school' && schoolCode;

    const filteredExceptions = useMemo(() => {
        if (!isSchool) return exceptions;
        const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();
        const target = norm(schoolCode);
        if (!target) return exceptions;
        return exceptions.filter((e) => {
            const code = norm(e.school_code);
            const name = norm(e.school_name);
            if (code && (code === target || code.startsWith(target) || target.startsWith(code))) {
                return true;
            }
            if (name && (name.includes(target) || target.includes(name))) {
                return true;
            }
            return false;
        });
    }, [exceptions, isSchool, schoolCode]);

    const filteredFixUps = useMemo(() => {
        if (!isSchool) return fixUps;
        const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();
        const target = norm(schoolCode);
        if (!target) return fixUps;
        return fixUps.filter((f) => {
            const code = norm(f.school_code);
            const name = norm(f.school_name);
            if (code && (code === target || code.startsWith(target) || target.startsWith(code))) {
                return true;
            }
            if (name && (name.includes(target) || target.includes(name))) {
                return true;
            }
            return false;
        });
    }, [fixUps, isSchool, schoolCode]);

    const filteredEvents = useMemo(() => {
        if (!isSchool) return events;
        const norm = (v: string | null | undefined) => (v || '').trim().toUpperCase();
        const target = norm(schoolCode);
        if (!target) return events;
        return events.filter((e) => {
            const meta = e.metadata || {};
            const name = norm(meta.schoolName as string | undefined);
            const code = norm(meta.schoolCode as string | undefined);
            if (code && (code === target || code.startsWith(target) || target.startsWith(code))) {
                return true;
            }
            if (name && (name.includes(target) || target.includes(name))) {
                return true;
            }
            return false;
        });
    }, [events, isSchool, schoolCode]);

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
                            {filteredExceptions.length > 0 && (
                                <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {filteredExceptions.length}
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
                            {filteredFixUps.length > 0 && (
                                <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {filteredFixUps.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('HISTORY')}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'HISTORY'
                                ? 'border-slate-900 text-slate-900'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <Clock className="w-4 h-4" />
                            History
                            {filteredEvents.length > 0 && (
                                <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                    {filteredEvents.length}
                                </span>
                            )}
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                {activeTab === 'EXCEPTIONS' && (
                    <div className="py-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {filteredExceptions.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-semibold text-amber-900">
                                        {filteredExceptions.length} order{filteredExceptions.length > 1 ? 's' : ''} blocked from production
                                    </p>
                                    <p className="text-sm text-amber-800/90 mt-0.5">
                                        Missing data prevents these from entering the embroidery queue. Resolve below.
                                    </p>
                                </div>
                            </div>
                        )}

                        {filteredExceptions.length === 0 ? (
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
                            filteredExceptions.map((order) => (
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
                            fixUps={filteredFixUps}
                            onSelect={setSelectedFixUp}
                            onUpdateStatus={async (id, status) => {
                                try {
                                    const prev = fixUps.find(f => f.id === id);
                                    await adapter.updateFixUpStatus(id, status);
                                    await EventLogger.log(id, 'FIX_UP', 'STATUS_CHANGE', 'USER', {
                                        prevState: { status: prev?.status },
                                        newState: { status },
                                        metadata: {
                                            originalOrder: prev?.original_order_number,
                                            parentName: prev?.parent_name ?? prev?.student_name,
                                            schoolName: prev?.school_name,
                                            schoolCode: (prev as any)?.school_code,
                                            source: 'RecoveryCenterList'
                                        }
                                    });
                                    toast.success('Fix-up status updated');
                                    await loadData();
                                    await loadEvents();
                                } catch (e) {
                                    console.error(e);
                                    toast.error('Failed to update fix-up status');
                                }
                            }}
                        />
                    </div>
                )}

                {activeTab === 'HISTORY' && (
                    <div className="py-5 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {filteredEvents.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                                    <Clock className="w-5 h-5 text-slate-500" />
                                </div>
                                <h3 className="text-base font-semibold text-slate-900">No recent recovery activity</h3>
                                <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                                    Status changes for fix-ups will appear here as a timeline.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Order-level summary list */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold text-slate-900">Fix-up order history</h3>
                                        <span className="text-xs text-slate-500">
                                            {filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}
                                        </span>
                                    </div>
                                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                                        {Object.values(filteredEvents.reduce((acc: Record<string, any>, e) => {
                                            const key = e.entity_id;
                                            if (!acc[key]) {
                                                acc[key] = {
                                                    entityId: key,
                                                    orderNumber: e.metadata?.originalOrder,
                                                    schoolName: e.metadata?.schoolName,
                                                    parentName: e.metadata?.parentName,
                                                    events: [] as typeof filteredEvents,
                                                };
                                            }
                                            acc[key].events.push(e);
                                            return acc;
                                        }, {})).map((group: any) => {
                                            const latest = group.events[0];
                                            const lastStatus = latest.new_state?.status || latest.prev_state?.status;
                                            const fixUp = fixUps.find(f => f.id === group.entityId);
                                            const orderNumber = group.orderNumber || fixUp?.original_order_number;
                                            const parentName = group.parentName ?? fixUp?.parent_name ?? fixUp?.student_name;
                                            const schoolName = group.schoolName || fixUp?.school_name || 'Unknown school';
                                            return (
                                                <div key={group.entityId} className="px-4 py-3 text-sm flex items-start gap-3">
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-slate-900">
                                                            {orderNumber || group.entityId}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            {parentName && <span className="font-medium text-slate-700">{parentName}</span>}
                                                            {parentName && ' • '}
                                                            {schoolName}
                                                        </p>
                                                        <p className="text-xs text-slate-500 mt-0.5">
                                                            Last status: {lastStatus || '—'} • {group.events.length} change{group.events.length === 1 ? '' : 's'}
                                                        </p>
                                                    </div>
                                                    <div className="text-xs text-slate-400 font-mono pt-1">
                                                        {new Date(latest.timestamp).toLocaleString()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Raw event timeline */}
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
                                    {filteredEvents.map((e) => {
                                        const fixUp = fixUps.find(f => f.id === e.entity_id);
                                        const orderNumber = e.metadata?.originalOrder || fixUp?.original_order_number;
                                        const parentName = e.metadata?.parentName ?? fixUp?.parent_name ?? fixUp?.student_name;
                                        const schoolName = e.metadata?.schoolName || fixUp?.school_name || 'Unknown school';
                                        return (
                                        <div key={e.id} className="px-4 py-3 flex items-start gap-3 text-sm">
                                            <div className="w-24 text-xs text-slate-400 font-mono pt-1">
                                                {new Date(e.timestamp).toLocaleString()}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-900">
                                                    {orderNumber || e.entity_id}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {parentName && <span className="font-medium text-slate-700">{parentName}</span>}
                                                    {parentName && ' • '}
                                                    {schoolName}
                                                </p>
                                                <p className="text-xs text-slate-500 mt-0.5">
                                                    {e.prev_state?.status && e.new_state?.status
                                                        ? `Status: ${e.prev_state.status} → ${e.new_state.status}`
                                                        : 'Details updated'}
                                                </p>
                                            </div>
                                            <div className="text-xs text-slate-400 uppercase tracking-wider">
                                                {e.actor_id}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
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
                        loadEvents();
                    }}
                />
            )}

            {selectedFixUp && (
                <FixUpDetailModal
                    fixUp={selectedFixUp}
                    onClose={() => setSelectedFixUp(null)}
                    onSave={async () => {
                        await loadData();
                        await loadEvents();
                    }}
                />
            )}
        </div>
    );
}
