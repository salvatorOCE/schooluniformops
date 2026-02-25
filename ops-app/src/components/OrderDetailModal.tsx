'use client';

import { Order, OrderStatus, SystemEvent } from '@/lib/types';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { X, User, ShoppingBag, Truck, ImageIcon } from 'lucide-react';
import { OrderTimeline } from '@/components/history/OrderTimeline';
import { MockAdapter } from '@/lib/mock-adapter';
import { useEffect, useState } from 'react';

const adapter = new MockAdapter();

interface OrderDetailModalProps {
    order: Order | null;
    onClose: () => void;
    isOpen: boolean;
}

export function OrderDetailModal({ order, onClose, isOpen }: OrderDetailModalProps) {
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [itemImages, setItemImages] = useState<Record<string, { front: string | null; back: string | null }>>({});

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
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-900">{order.order_number}</h2>
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded border ${getStatusColor(order.order_status)}`}>
                                {getStatusLabel(order.order_status)}
                            </span>
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
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">Order Items</h3>
                        <div className="space-y-4">
                            {order.items.map((item, idx) => {
                                const images = itemImages[item.id] || { front: null, back: null };
                                const hasImages = images.front || images.back;
                                return (
                                    <div key={item.id} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="px-3 py-2 font-medium text-slate-800">{item.product_name}</td>
                                                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.sku}</td>
                                                    <td className="px-3 py-2 text-center">{item.size}</td>
                                                    <td className="px-3 py-2 text-center font-bold">{item.quantity}</td>
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

