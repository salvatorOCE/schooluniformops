'use client';

import { useState, useCallback, useEffect } from 'react';
import { useData } from '@/lib/data-provider';
import { Order, PackOutManifest } from '@/lib/types';
import { getStatusLabel, getStatusColor as getBaseStatusColor } from '@/lib/utils';
import { downloadPackOutManifestPdf } from '@/lib/generate-pack-out-manifest-pdf';
import { Search, Package, Scissors, Truck, CheckCircle, CreditCard, ChevronRight, X, FileText, ClipboardList } from 'lucide-react';

interface TimelineStage {
    label: string;
    icon: React.ElementType;
    timestamp?: string;
    status: 'completed' | 'current' | 'pending';
    durationLabel?: string;
}

function OrderTimeline({ order }: { order: Order }) {
    const stages: TimelineStage[] = [];

    // 1. Order Created
    stages.push({
        label: 'Order Placed',
        icon: Package,
        timestamp: order.created_at,
        status: 'completed',
    });

    // 2. Payment
    const paidTime = order.paid_at ? new Date(order.paid_at) : null;
    const createdTime = new Date(order.created_at);
    stages.push({
        label: 'Payment Confirmed',
        icon: CreditCard,
        timestamp: order.paid_at,
        status: order.paid_at ? 'completed' : 'pending',
        durationLabel: paidTime ? formatDuration(createdTime, paidTime) : undefined,
    });

    // 3. Embroidery
    const embTime = order.embroidery_done_at ? new Date(order.embroidery_done_at) : null;
    const needsEmbroidery = order.items.some(i => i.requires_embroidery);
    if (needsEmbroidery) {
        stages.push({
            label: 'Embroidery Complete',
            icon: Scissors,
            timestamp: order.embroidery_done_at,
            status: order.embroidery_done_at ? 'completed' :
                order.embroidery_status === 'PENDING' ? (order.paid_at ? 'current' : 'pending') : 'current',
            durationLabel: embTime && paidTime ? formatDuration(paidTime, embTime) : undefined,
        });
    }

    // 4. Packed
    const packedTime = order.packed_at ? new Date(order.packed_at) : null;
    const prevTime = embTime || paidTime;
    stages.push({
        label: 'Packed & Ready',
        icon: CheckCircle,
        timestamp: order.packed_at,
        status: order.packed_at ? 'completed' :
            (order.embroidery_done_at || !needsEmbroidery) ? 'current' : 'pending',
        durationLabel: packedTime && prevTime ? formatDuration(prevTime, packedTime) : undefined,
    });

    // 5. Dispatched
    const dispatchedTime = order.dispatched_at ? new Date(order.dispatched_at) : null;
    stages.push({
        label: order.delivery_type === 'SCHOOL' ? 'Delivered to School' :
            order.delivery_type === 'STORE' ? 'Ready for Pickup' : 'Shipped',
        icon: Truck,
        timestamp: order.dispatched_at,
        status: order.dispatched_at ? 'completed' : (order.packed_at ? 'current' : 'pending'),
        durationLabel: dispatchedTime && packedTime ? formatDuration(packedTime, dispatchedTime) : undefined,
    });

    return (
        <div className="relative pl-8 space-y-0">
            {stages.map((stage, idx) => {
                const Icon = stage.icon;
                const isLast = idx === stages.length - 1;

                return (
                    <div key={stage.label} className="relative pb-8 last:pb-0">
                        {/* Connector line */}
                        {!isLast && (
                            <div className={`absolute left-[-20px] top-8 w-0.5 h-full ${stage.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'
                                }`} />
                        )}

                        {/* Node */}
                        <div className="flex items-start gap-4">
                            <div className={`absolute left-[-28px] w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${stage.status === 'completed' ? 'bg-emerald-500' :
                                stage.status === 'current' ? 'bg-blue-500 animate-pulse' :
                                    'bg-slate-200'
                                }`}>
                                <Icon className={`w-3 h-3 ${stage.status === 'pending' ? 'text-slate-400' : 'text-white'
                                    }`} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-semibold ${stage.status === 'completed' ? 'text-slate-900' :
                                        stage.status === 'current' ? 'text-blue-700' :
                                            'text-slate-400'
                                        }`}>
                                        {stage.label}
                                    </span>
                                    {stage.durationLabel && (
                                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                            {stage.durationLabel}
                                        </span>
                                    )}
                                </div>
                                {stage.timestamp && (
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {new Date(stage.timestamp).toLocaleString('en-AU', {
                                            weekday: 'short',
                                            day: 'numeric',
                                            month: 'short',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
                                    </div>
                                )}
                                {stage.status === 'current' && !stage.timestamp && (
                                    <div className="text-xs text-blue-500 mt-0.5 font-medium">In progress...</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function formatDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${hours}h`;
    const days = Math.round(hours / 24);
    return `${days}d ${hours % 24}h`;
}

type TrackingTab = 'SEARCH' | 'MANIFESTS' | 'DELIVERED';

export default function TrackingPage() {
    const adapter = useData();
    const [activeTab, setActiveTab] = useState<TrackingTab>('SEARCH');

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [searching, setSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const [manifests, setManifests] = useState<PackOutManifest[]>([]);
    const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
    const [manifestsLoading, setManifestsLoading] = useState(false);
    const [deliveredLoading, setDeliveredLoading] = useState(false);
    const [expandedManifestId, setExpandedManifestId] = useState<string | null>(null);

    useEffect(() => {
        if (activeTab === 'MANIFESTS') {
            setManifestsLoading(true);
            adapter.getPackOutManifests().then(m => { setManifests(m); setManifestsLoading(false); });
        }
    }, [activeTab, adapter]);

    useEffect(() => {
        if (activeTab === 'DELIVERED') {
            setDeliveredLoading(true);
            adapter.getDeliveredOrders().then(o => { setDeliveredOrders(o); setDeliveredLoading(false); });
        }
    }, [activeTab, adapter]);

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;
        setSearching(true);
        setHasSearched(true);
        setSelectedOrder(null);
        const orders = await adapter.searchOrders(query.trim());
        setResults(orders);
        setSearching(false);
    }, [query, adapter]);

    const statusColor = (status: string) => getBaseStatusColor(status);

    const deliveryLabel = (type: string) => {
        switch (type) {
            case 'HOME': return '🏠 Home';
            case 'SCHOOL': return '🏫 School';
            case 'STORE': return '🏪 Store';
            default: return type;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Order Tracking</h1>
                <p className="text-sm text-slate-500 mt-1">Search orders, view pack-out manifests, and delivered orders</p>
            </div>

            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 w-fit">
                <button
                    onClick={() => setActiveTab('SEARCH')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'SEARCH' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <Search className="w-4 h-4" /> Search
                </button>
                <button
                    onClick={() => setActiveTab('MANIFESTS')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'MANIFESTS' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <FileText className="w-4 h-4" /> Pack-out manifests
                </button>
                <button
                    onClick={() => setActiveTab('DELIVERED')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === 'DELIVERED' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                >
                    <ClipboardList className="w-4 h-4" /> Delivered
                </button>
            </div>

            {/* Search tab */}
            {activeTab === 'SEARCH' && (
                <>
            <div className="flex gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="Search by order number, parent name, student name, school..."
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); setResults([]); setHasSearched(false); setSelectedOrder(null); }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <button
                    onClick={handleSearch}
                    disabled={!query.trim() || searching}
                    className="px-6 py-3 bg-slate-900 text-white rounded-lg font-medium text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {searching ? 'Searching...' : 'Search'}
                </button>
            </div>

            {/* Results List + Timeline */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Results List */}
                <div className={`${selectedOrder ? 'lg:col-span-2' : 'lg:col-span-5'} space-y-2`}>
                    {hasSearched && results.length === 0 && !searching && (
                        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                            <p className="font-medium">No orders found</p>
                            <p className="text-xs mt-1">Try a different search term</p>
                        </div>
                    )}

                    {results.map((order) => (
                        <button
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className={`w-full text-left p-4 rounded-lg border transition-all ${selectedOrder?.id === order.id
                                ? 'border-indigo-300 bg-indigo-50/50 shadow-sm'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div>
                                        <div className="font-mono font-bold text-sm text-slate-900">{order.order_number}</div>
                                        <div className="text-xs text-slate-500">{order.parent_name}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor(order.order_status)}`}>
                                        {getStatusLabel(order.order_status)}
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-slate-300" />
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                <span>{deliveryLabel(order.delivery_type)}</span>
                                <span>•</span>
                                <span>{order.school_name || 'No school'}</span>
                                <span>•</span>
                                <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Timeline Panel */}
                {selectedOrder && (
                    <div className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-6 shadow-sm h-fit sticky top-4">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="font-bold text-lg text-slate-900">{selectedOrder.order_number}</h2>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-sm text-slate-500">{selectedOrder.parent_name}</span>
                                    {selectedOrder.student_name && (
                                        <>
                                            <span className="text-slate-300">→</span>
                                            <span className="text-sm font-medium text-slate-700">{selectedOrder.student_name}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Order Info */}
                        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-slate-50 rounded-lg">
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Delivery</div>
                                <div className="text-sm font-medium text-slate-900 mt-0.5">{deliveryLabel(selectedOrder.delivery_type)}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">School</div>
                                <div className="text-sm font-medium text-slate-900 mt-0.5">{selectedOrder.school_name || '—'}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Items</div>
                                <div className="text-sm font-medium text-slate-900 mt-0.5">{selectedOrder.items.reduce((sum, i) => sum + i.quantity, 0)} units</div>
                            </div>
                        </div>

                        {/* Items List */}
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Items</h3>
                            <div className="space-y-1.5">
                                {selectedOrder.items.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between text-sm py-1.5 px-3 bg-slate-50/50 rounded">
                                        <div className="flex items-center gap-2">
                                            <span className="text-slate-700 font-medium">{item.product_name}</span>
                                            {item.nickname && <span className="text-[10px] font-medium text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded border border-violet-200">{item.nickname}</span>}
                                            {item.size && <span className="text-[10px] font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100">Size {item.size}</span>}
                                        </div>
                                        <span className="text-xs text-slate-500">×{item.quantity}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Timeline */}
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Order Journey</h3>
                        <OrderTimeline order={selectedOrder} />

                        {/* Notes */}
                        {selectedOrder.notes && (
                            <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                <div className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Notes</div>
                                <p className="text-sm text-amber-800">{selectedOrder.notes}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
                </>
            )}

            {/* Pack-out manifests tab */}
            {activeTab === 'MANIFESTS' && (
                <div className="space-y-4">
                    {manifestsLoading ? (
                        <div className="text-center py-12 text-slate-500">Loading manifests…</div>
                    ) : manifests.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="font-medium">No pack-out manifests yet</p>
                            <p className="text-xs mt-1">Finish a pack-out in Distribution to create a manifest</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {manifests.map((m) => (
                                <div key={m.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedManifestId(expandedManifestId === m.id ? null : m.id)}
                                        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                                {m.school_name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">{m.school_name}</div>
                                                <div className="text-xs text-slate-500">
                                                    {new Date(m.packed_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} · {m.orders.length} order{m.orders.length !== 1 ? 's' : ''}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                                                onClick={(e) => { e.stopPropagation(); downloadPackOutManifestPdf(m); }}
                                            >
                                                Download PDF
                                            </span>
                                            <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${expandedManifestId === m.id ? 'rotate-90' : ''}`} />
                                        </div>
                                    </button>
                                    {expandedManifestId === m.id && (
                                        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Orders on this manifest</div>
                                            <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                                {m.orders.map((o) => (
                                                    <div key={o.order_id} className="text-sm py-2 px-3 bg-white rounded border border-slate-100 space-y-1">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="font-mono font-medium text-slate-800">{o.order_number}</span>
                                                            <span className="text-slate-600">{o.student_name || '—'}</span>
                                                            <span className="text-slate-500 text-xs">{o.item_count} items</span>
                                                            <span className="text-slate-400 text-xs truncate max-w-[180px]">{o.items_summary}</span>
                                                        </div>
                                                        {o.senior_part_not_complete && (
                                                            <div className="text-xs text-teal-700 bg-teal-50 border border-teal-100 rounded px-2 py-1">
                                                                Senior part not complete — senior garments are done bulk on deadline (printing).
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Delivered orders tab */}
            {activeTab === 'DELIVERED' && (
                <div className="space-y-4">
                    {deliveredLoading ? (
                        <div className="text-center py-12 text-slate-500">Loading delivered orders…</div>
                    ) : deliveredOrders.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <Truck className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                            <p className="font-medium">No delivered orders yet</p>
                            <p className="text-xs mt-1">Dispatched and collected orders appear here</p>
                        </div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                                <h2 className="font-bold text-slate-900">Delivered orders</h2>
                                <p className="text-xs text-slate-500 mt-0.5">Orders completed and sent to school or collected</p>
                            </div>
                            <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
                                {deliveredOrders.map((order) => (
                                    <div key={order.id} className="p-4 hover:bg-slate-50/50">
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <div className="font-mono font-bold text-slate-900">{order.order_number}</div>
                                                <div className="text-sm text-slate-600 mt-0.5">
                                                    {order.student_name || order.parent_name} · {order.school_name}
                                                </div>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {order.items.map((i) => (
                                                        <span key={i.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                                            {i.quantity}× {i.product_name}{i.size ? ` (${i.size})` : ''}{i.nickname ? ` — ${i.nickname}` : ''}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor(order.order_status)}`}>
                                                    {getStatusLabel(order.order_status)}
                                                </span>
                                                <div className="text-xs text-slate-500 mt-1">
                                                    {order.dispatched_at
                                                        ? new Date(order.dispatched_at).toLocaleDateString('en-AU', { dateStyle: 'medium' })
                                                        : '—'}
                                                </div>
                                                <span className="text-xs text-slate-400">{deliveryLabel(order.delivery_type)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
