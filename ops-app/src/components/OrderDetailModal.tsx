'use client';

import { Order, OrderStatus, SystemEvent } from '@/lib/types';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { X, User, ShoppingBag, Truck, ImageIcon, RefreshCw } from 'lucide-react';
import { OrderTimeline } from '@/components/history/OrderTimeline';
import { useData } from '@/lib/data-provider';
import { useEffect, useState } from 'react';

interface OrderDetailModalProps {
    order: Order | null;
    onClose: () => void;
    isOpen: boolean;
    /** Called after sent quantities are updated so parent can refetch the order. */
    onOrderUpdated?: () => void;
}

export function OrderDetailModal({ order, onClose, isOpen, onOrderUpdated }: OrderDetailModalProps) {
    const adapter = useData();
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [itemImages, setItemImages] = useState<Record<string, { front: string | null; back: string | null }>>({});
    /** Per-item sent quantity (for Partial Order Complete). Key = item.id. */
    const [sentQuantities, setSentQuantities] = useState<Record<string, number>>({});
    const [savingSent, setSavingSent] = useState<string | null>(null);
    const [savingStatus, setSavingStatus] = useState(false);
    const [resyncing, setResyncing] = useState(false);

    const isPartialOrderComplete = order?.order_status === 'Partial Order Complete';

    const ORDER_STATUS_OPTIONS = [
        'Pending Payment',
        'Processing',
        'On-Hold',
        'Embroidery',
        'Distribution',
        'Packed',
        'Shipped',
        'Partial Order Complete',
        'Completed',
        'Cancelled',
        'Refunded',
        'Failed',
    ];

    useEffect(() => {
        if (order?.items) {
            const next: Record<string, number> = {};
            order.items.forEach(i => {
                next[i.id] = i.sent_quantity ?? 0;
            });
            setSentQuantities(next);
        }
    }, [order?.id, order?.items?.map(i => `${i.id}:${i.sent_quantity ?? 0}`).join(',')]);

    useEffect(() => {
        if (isOpen && order) {
            adapter.getSystemEvents(order.id).then(setEvents);
            fetch(`/api/woo/order-product-images?orderId=${encodeURIComponent(order.id)}`)
                .then((res) => res.ok ? res.json() : { items: [] })
                .then((data: { items?: { order_item_id: string; image_front_url: string | null; image_back_url: string | null }[] }) => {
                    const map: Record<string, { front: string | null; back: string | null }> = {};
                    (data.items || []).forEach((row) => {
                        map[row.order_item_id] = {
                            front: row.image_front_url ?? null,
                            back: row.image_back_url ?? null
                        };
                    });
                    setItemImages(map);
                })
                .catch(() => setItemImages({}));
        } else {
            setEvents([]);
            setItemImages({});
        }
    }, [isOpen, order]);

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h2 className="text-xl font-bold text-slate-900">{order.order_number}</h2>
                            <select
                                value={order.order_status || ''}
                                disabled={savingStatus}
                                onChange={async (e) => {
                                    const newStatus = e.target.value;
                                    if (newStatus === (order.order_status || '')) return;
                                    setSavingStatus(true);
                                    try {
                                        await adapter.updateOrderStatus(order.id, newStatus);
                                        onOrderUpdated?.();
                                    } finally {
                                        setSavingStatus(false);
                                    }
                                }}
                                className={`text-xs font-bold rounded border px-2.5 py-0.5 min-w-[140px] bg-white cursor-pointer disabled:opacity-60 ${getStatusColor(order.order_status)}`}
                            >
                                {ORDER_STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>{getStatusLabel(s)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-4">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.student_name}</span>
                            <span className="flex items-center gap-1 border-l border-slate-200 pl-4"><ShoppingBag className="w-3 h-3" /> {order.school_name}</span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Delivery Info */}
                    <section className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded border border-slate-200">
                            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Delivery Method</div>
                            <div className="font-medium text-slate-900 flex items-center gap-2">
                                <Truck className="w-4 h-4 text-slate-400" />
                                {order.delivery_type}
                            </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded border border-slate-200">
                            <div className="text-xs text-slate-500 uppercase font-semibold mb-1">Parent</div>
                            <div className="font-medium text-slate-900">{order.parent_name}</div>
                        </div>
                    </section>

                    {/* Items Section */}
                    <section>
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Order Items</h3>
                            {order.items.length === 0 && (
                                <button
                                    type="button"
                                    onClick={async () => {
                                        setResyncing(true);
                                        try {
                                            const res = await fetch('/api/woo/pull-sync', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ orderNumber: order.order_number })
                                            });
                                            const data = await res.json().catch(() => ({}));
                                            if (data.success) {
                                                onOrderUpdated?.();
                                            } else {
                                                console.warn('Re-sync failed:', data.error);
                                            }
                                        } finally {
                                            setResyncing(false);
                                        }
                                    }}
                                    disabled={resyncing}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 disabled:opacity-60"
                                >
                                    <RefreshCw className={`w-3 h-3 ${resyncing ? 'animate-spin' : ''}`} />
                                    {resyncing ? 'Syncing…' : 'Re-sync from WooCommerce'}
                                </button>
                            )}
                        </div>
                        {order.items.length === 0 && (
                            <p className="text-sm text-slate-500 mb-3">No line items in the app. Re-sync from WooCommerce to load this order&apos;s items.</p>
                        )}
                        <div className="space-y-4">
                            {order.items.map((item, idx) => {
                                const images = itemImages[item.id] || { front: null, back: null };
                                const hasImages = images.front || images.back;
                                const sentQty = sentQuantities[item.id] ?? item.sent_quantity ?? 0;
                                const maxSent = item.quantity ?? 0;
                                const isSaving = savingSent === item.id;
                                return (
                                    <div key={item.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="px-3 py-2 font-medium text-slate-800">
                                                        <div>
                                                            {item.product_name}
                                                            {item.nickname && (
                                                                <span className="ml-2 inline-flex items-center rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800 border border-violet-200" title="Nickname for print/embroidery">
                                                                    {item.nickname}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.sku}</td>
                                                    <td className="px-3 py-2 text-center">{item.size}</td>
                                                    <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
                                                    {isPartialOrderComplete && (
                                                        <td className="px-3 py-2">
                                                            <div className="flex items-center gap-1">
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={maxSent}
                                                                    className="w-14 border border-slate-200 rounded px-1.5 py-1 text-xs bg-teal-50/80"
                                                                    value={sentQty}
                                                                    disabled={isSaving}
                                                                    onChange={(e) => {
                                                                        const v = Math.max(0, Math.min(maxSent, parseInt(e.target.value, 10) || 0));
                                                                        setSentQuantities(prev => ({ ...prev, [item.id]: v }));
                                                                    }}
                                                                    onBlur={async (e) => {
                                                                        const raw = parseInt((e.target as HTMLInputElement).value, 10);
                                                                        const v = Math.max(0, Math.min(maxSent, Number.isFinite(raw) ? raw : 0));
                                                                        if (v === (item.sent_quantity ?? 0)) return;
                                                                        setSavingSent(item.id);
                                                                        try {
                                                                            await adapter.updateOrderItemSentQuantity(item.id, v);
                                                                            onOrderUpdated?.();
                                                                        } finally {
                                                                            setSavingSent(null);
                                                                        }
                                                                    }}
                                                                />
                                                                <span className="text-slate-500 text-xs">/ {maxSent} sent</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    <td className="px-3 py-2">
                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${item.requires_embroidery ? (item.embroidery_status === 'DONE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700') : 'bg-slate-100 text-slate-500'}`}>
                                                            {item.requires_embroidery ? (item.embroidery_status || 'PENDING') : 'NO EMB'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        {hasImages && (
                                            <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/50">
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                    <ImageIcon className="w-3 h-3" /> Garment reference
                                                </p>
                                                <div className="flex gap-3 flex-wrap">
                                                    {images.front && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-medium text-slate-500 mb-1">Front</span>
                                                            <a href={images.front} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                                                                <img src={images.front} alt={`${item.product_name} front`} className="h-24 w-auto object-contain max-w-[120px]" />
                                                            </a>
                                                        </div>
                                                    )}
                                                    {images.back && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-medium text-slate-500 mb-1">Back</span>
                                                            <a href={images.back} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                                                                <img src={images.back} alt={`${item.product_name} back`} className="h-24 w-auto object-contain max-w-[120px]" />
                                                            </a>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Timeline Section */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Audit Log</h3>
                        <OrderTimeline events={events} />
                    </section>
                </div>

                {/* Footer Actions */}
                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900" onClick={onClose}>
                        Close
                    </button>
                    <button className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800 shadow-sm">
                        Add Note
                    </button>
                </div>
            </div>
        </div>
    );
}

