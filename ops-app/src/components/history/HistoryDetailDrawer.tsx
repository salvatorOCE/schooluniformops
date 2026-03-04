'use client';

import { OrderHistoryRecord } from '@/lib/types';
import { X, User, ShoppingBag, Truck, ImageIcon, Calendar, CreditCard, MapPin, FileText, Mail, Phone, MessageSquare, Send, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { OrderTimeline } from './OrderTimeline';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { useData } from '@/lib/data-provider';
import { useToast } from '@/lib/toast-context';
import { useHistory } from '@/lib/history-context';
import { useSession } from '@/lib/session-context';
import { SystemEvent } from '@/lib/types';
import { useEffect, useState, useRef } from 'react';

interface OrderNote {
  id: string;
  author_role: string;
  author_display: string | null;
  content: string;
  created_at: string;
}

/** WooCommerce order shape (subset we use) */
interface WooOrder {
    id: number;
    number: string;
    status: string;
    date_created?: string;
    date_modified?: string;
    date_paid?: string | null;
    payment_method?: string;
    payment_method_title?: string;
    customer_note?: string;
    billing?: {
        first_name?: string;
        last_name?: string;
        company?: string;
        address_1?: string;
        address_2?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
        email?: string;
        phone?: string;
    };
    shipping?: {
        first_name?: string;
        last_name?: string;
        company?: string;
        address_1?: string;
        address_2?: string;
        city?: string;
        state?: string;
        postcode?: string;
        country?: string;
    };
    line_items?: Array<{
        id: number;
        name: string;
        product_id: number;
        quantity: number;
        subtotal?: string;
        total?: string;
        sku?: string;
        meta_data?: Array<{ key: string; value?: string; display_key?: string; display_value?: string }>;
    }>;
    shipping_lines?: Array<{ method_title?: string; total?: string }>;
    total?: string;
    subtotal?: string;
}

interface HistoryDetailDrawerProps {
    order: OrderHistoryRecord | null;
    onClose: () => void;
    /** Called when a note is added (e.g. to refresh list for badge) */
    onNoteAdded?: () => void;
}

function formatAddress(addr: WooOrder['billing'] | WooOrder['shipping'] | undefined): string {
    if (!addr) return '—';
    const parts = [
        [addr.first_name, addr.last_name].filter(Boolean).join(' '),
        addr.company,
        addr.address_1,
        addr.address_2,
        [addr.city, addr.state, addr.postcode].filter(Boolean).join(' '),
        addr.country
    ].filter(Boolean);
    return parts.join(', ') || '—';
}

export function HistoryDetailDrawer({ order, onClose, onNoteAdded }: HistoryDetailDrawerProps) {
    const adapter = useData();
    const { toast } = useToast();
    const { refresh } = useHistory();
    const { role } = useSession();
    const [events, setEvents] = useState<SystemEvent[]>([]);
    const [isUpdating, setIsUpdating] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(order?.status || '');
    const [itemImages, setItemImages] = useState<Record<string, { front: string | null; back: string | null }>>({});
    const [wooOrder, setWooOrder] = useState<WooOrder | null>(null);
    const [wooLoading, setWooLoading] = useState(false);
    const [notes, setNotes] = useState<OrderNote[]>([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [refreshingItems, setRefreshingItems] = useState(false);
    const autoRefreshedOrderId = useRef<string | null>(null);

    // When opening an order with 0 items, auto backfill from Woo so items and photos appear without clicking the button
    useEffect(() => {
        if (!order?.orderId || order.items.length > 0) return;
        if (autoRefreshedOrderId.current === order.orderId) return;
        autoRefreshedOrderId.current = order.orderId;
        const orderNum = (order.orderId || '').replace(/^SUS[- ]?/i, '').trim();
        if (!orderNum) return;
        setRefreshingItems(true);
        fetch('/api/woo/pull-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderNumber: orderNum }),
        })
            .then((res) => res.json().catch(() => ({})))
            .then((data: any) => {
                if (data?.success) {
                    refresh().then(() => {
                        onNoteAdded?.();
                        const orderKey = order.id || order.orderId;
                        if (orderKey) {
                            Promise.all([
                                fetch(`/api/woo/order-details?orderId=${encodeURIComponent(orderKey)}`).then((r) => (r.ok ? r.json() : null)),
                                fetch(`/api/woo/order-product-images?orderId=${encodeURIComponent(orderKey)}`).then((r) => (r.ok ? r.json() : { items: [] })),
                            ]).then(([wooRes, imgRes]) => {
                                setWooOrder(wooRes || null);
                                const map: Record<string, { front: string | null; back: string | null }> = {};
                                ((imgRes as any)?.items || []).forEach((row: any) => {
                                    map[row.order_item_id] = { front: row.image_front_url ?? null, back: row.image_back_url ?? null };
                                });
                                setItemImages(map);
                            });
                        }
                    });
                }
            })
            .finally(() => setRefreshingItems(false));
    }, [order?.orderId, order?.items?.length, order?.id, refresh, onNoteAdded]);

    useEffect(() => {
        if (order) {
            setCurrentStatus(order.status);
            setWooOrder(null);
            adapter.getSystemEvents(order.orderId).then(setEvents);
            // Use order.id (Supabase UUID) or fallback to orderId (order number e.g. SUS-0183) – APIs resolve both
            const orderKey = order.id || order.orderId;
            if (orderKey) {
                setWooLoading(true);
                fetch(`/api/woo/order-details?orderId=${encodeURIComponent(orderKey)}`)
                    .then((res) => (res.ok ? res.json() : null))
                    .then((data: WooOrder | null) => {
                        setWooOrder(data || null);
                    })
                    .catch(() => setWooOrder(null))
                    .finally(() => setWooLoading(false));

                fetch(`/api/woo/order-product-images?orderId=${encodeURIComponent(orderKey)}`)
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

                setNotesLoading(true);
                fetch(`/api/orders/${encodeURIComponent(orderKey)}/notes`)
                    .then((res) => (res.ok ? res.json() : { notes: [] }))
                    .then((data: { notes?: OrderNote[] }) => setNotes(data.notes || []))
                    .catch(() => setNotes([]))
                    .finally(() => setNotesLoading(false));
            } else {
                setItemImages({});
                setNotes([]);
            }
        } else {
            setNotes([]);
        }
    }, [order, adapter]);

    if (!order) return null;

    const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value;
        if (newStatus === currentStatus) return;

        setIsUpdating(true);
        try {
            await adapter.updateOrderStatus(order.orderId, newStatus);
            setCurrentStatus(newStatus);
            toast.success(`Order changed to ${newStatus}`);

            const updatedEvents = await adapter.getSystemEvents(order.orderId);
            setEvents(updatedEvents);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
            e.target.value = currentStatus;
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRefreshItemsFromWoo = async () => {
        const orderNum = (order?.orderId || '').replace(/^SUS[- ]?/i, '').trim();
        if (!orderNum) return;
        setRefreshingItems(true);
        try {
            const res = await fetch('/api/woo/pull-sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderNumber: orderNum }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                toast.error(data.error || 'Refresh failed');
                return;
            }
            toast.success('Items synced from WooCommerce. Refreshing…');
            await refresh();
            onNoteAdded?.();
            const orderKey = order?.id || order?.orderId;
            if (orderKey) {
                const [wooRes, imgRes] = await Promise.all([
                    fetch(`/api/woo/order-details?orderId=${encodeURIComponent(orderKey)}`).then((r) => (r.ok ? r.json() : null)),
                    fetch(`/api/woo/order-product-images?orderId=${encodeURIComponent(orderKey)}`).then((r) => (r.ok ? r.json() : { items: [] })),
                ]);
                setWooOrder(wooRes || null);
                const map: Record<string, { front: string | null; back: string | null }> = {};
                ((imgRes as any)?.items || []).forEach((row: any) => {
                    map[row.order_item_id] = { front: row.image_front_url ?? null, back: row.image_back_url ?? null };
                });
                setItemImages(map);
            }
        } catch (e: any) {
            toast.error(e.message || 'Refresh failed');
        } finally {
            setRefreshingItems(false);
        }
    };

    const handleAddNote = async () => {
        const content = newNote.trim();
        if (!content || !order) return;
        const orderKey = order.id || order.orderId;
        if (!orderKey) return;
        setSavingNote(true);
        try {
            const res = await fetch(`/api/orders/${encodeURIComponent(orderKey)}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Failed to add note');
            }
            const { note } = await res.json();
            setNotes((prev) => [note, ...prev]);
            setNewNote('');
            toast.success('Note added');
            await refresh();
            onNoteAdded?.();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add note');
        } finally {
            setSavingNote(false);
        }
    };

    const getItemSize = (item: any) => {
        const sizeMeta = item?.meta_data?.find((m: any) => m.key === 'pa_size' || m.key === 'Size' || (m.display_key && m.display_key.toLowerCase().includes('size')));
        return sizeMeta?.value ?? sizeMeta?.display_value ?? '—';
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-xl font-bold text-slate-900">{order.orderId}</h2>
                            <select
                                className={`px-2 py-0.5 text-xs font-bold rounded border cursor-pointer outline-none focus:ring-2 focus:ring-slate-400 ${getStatusColor(currentStatus)}`}
                                value={currentStatus}
                                disabled={isUpdating}
                                onChange={handleStatusChange}
                            >
                                {['Pending payment', 'Processing', 'On hold', 'Completed', 'Cancelled', 'Refunded', 'Failed', 'Trash'].map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            {isUpdating && <span className="text-xs text-slate-400 animate-pulse">Saving...</span>}
                        </div>
                        <div className="text-sm text-slate-500 flex items-center gap-4">
                            <span className="flex items-center gap-1"><User className="w-3 h-3" /> {order.studentName}</span>
                            <span className="flex items-center gap-1 border-l border-slate-200 pl-4"><ShoppingBag className="w-3 h-3" /> {order.schoolName}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Order Items first (with photos) */}
                    <section>
                        <div className="flex items-center justify-between gap-2 mb-3">
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Order items</h3>
                            <button
                                type="button"
                                onClick={handleRefreshItemsFromWoo}
                                disabled={refreshingItems}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${refreshingItems ? 'animate-spin' : ''}`} />
                                {refreshingItems ? 'Syncing…' : 'Refresh items from Woo'}
                            </button>
                        </div>
                        <div className="space-y-4">
                            {(wooOrder?.line_items && wooOrder.line_items.length > 0 ? wooOrder.line_items : order.items.map((item, idx) => ({ id: idx, name: item.productName, sku: item.sku, quantity: item.qty, size: item.size, itemId: item.itemId }))).map((item: any, idx: number) => {
                                const qty = item.quantity ?? item.qty;
                                const name = item.name ?? item.productName;
                                const sku = item.sku;
                                const size = item.size ?? getItemSize(item);
                                const totalDisplay = item.total != null || item.subtotal != null ? `$${item.total ?? item.subtotal}` : '—';
                                const imageKey = order.items[idx]?.itemId ?? (item.itemId || item.id) ?? `idx-${idx}`;
                                const images = itemImages[imageKey] || itemImages[String(imageKey)] || itemImages[`idx-${idx}`] || { front: null, back: null };
                                const hasImages = images.front || images.back;
                                return (
                                    <div key={item.id ?? idx} className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-slate-100">
                                                <tr>
                                                    <td className="px-3 py-2 font-medium text-slate-800">{name}</td>
                                                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{sku || '—'}</td>
                                                    <td className="px-3 py-2 text-center">{size}</td>
                                                    <td className="px-3 py-2 text-center font-bold">×{qty}</td>
                                                    <td className="px-3 py-2 text-right font-medium text-slate-700">{totalDisplay}</td>
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
                                                                <img src={images.front} alt={`${name} front`} className="h-24 w-auto object-contain max-w-[120px]" />
                                                            </a>
                                                        </div>
                                                    )}
                                                    {images.back && (
                                                        <div className="flex flex-col items-center">
                                                            <span className="text-[10px] font-medium text-slate-500 mb-1">Back</span>
                                                            <a href={images.back} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                                                                <img src={images.back} alt={`${name} back`} className="h-24 w-auto object-contain max-w-[120px]" />
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

                    {/* Order dates (from WooCommerce – true purchase/paid dates) */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Order dates
                        </h3>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                            {wooLoading ? (
                                <p className="text-slate-500">Loading dates from WooCommerce…</p>
                            ) : wooOrder ? (
                                <>
                                    {wooOrder.date_created && (
                                        <p><span className="text-slate-500 font-medium">Order placed:</span>{' '}
                                            {format(new Date(wooOrder.date_created), 'EEEE, d MMMM yyyy · HH:mm')}</p>
                                    )}
                                    {wooOrder.date_paid && (
                                        <p><span className="text-slate-500 font-medium">Paid:</span>{' '}
                                            {format(new Date(wooOrder.date_paid), 'EEEE, d MMMM yyyy · HH:mm')}</p>
                                    )}
                                    {wooOrder.date_modified && (
                                        <p><span className="text-slate-500 font-medium">Last updated:</span>{' '}
                                            {format(new Date(wooOrder.date_modified), 'd MMM yyyy HH:mm')}</p>
                                    )}
                                    {!wooOrder.date_created && !wooOrder.date_paid && (
                                        <p className="text-slate-500">No date info in WooCommerce for this order.</p>
                                    )}
                                </>
                            ) : (
                                <p className="text-slate-500">Order dates from WooCommerce could not be loaded. Run “Refresh dates from Woo” on the Orders page to sync.</p>
                            )}
                        </div>
                    </section>

                    {/* Billing address (admin only); school users see only contact (email/phone) below */}
                    {role !== 'school' ? (
                        <section>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Billing address
                            </h3>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-line">
                                {wooOrder?.billing ? (
                                    <>
                                        {formatAddress(wooOrder.billing)}
                                        {(wooOrder.billing.email || wooOrder.billing.phone) && (
                                            <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
                                                {wooOrder.billing.email && (
                                                    <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {wooOrder.billing.email}</p>
                                                )}
                                                {wooOrder.billing.phone && (
                                                    <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {wooOrder.billing.phone}</p>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : wooLoading ? (
                                    <p className="text-slate-500">Loading…</p>
                                ) : (
                                    '—'
                                )}
                            </div>
                        </section>
                    ) : (
                        /* School users: contact only (no billing address) */
                        (wooOrder?.billing?.email || wooOrder?.billing?.phone) && (
                            <section>
                                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Contact
                                </h3>
                                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 space-y-1">
                                    {wooOrder.billing.email && (
                                        <p className="flex items-center gap-1"><Mail className="w-3 h-3" /> {wooOrder.billing.email}</p>
                                    )}
                                    {wooOrder.billing.phone && (
                                        <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {wooOrder.billing.phone}</p>
                                    )}
                                </div>
                            </section>
                        )
                    )}

                    {/* Shipping */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Truck className="w-4 h-4" /> Shipping address
                        </h3>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-700 whitespace-pre-line">
                            {wooOrder?.shipping ? (
                                <>
                                    {formatAddress(wooOrder.shipping)}
                                    {wooOrder.shipping_lines?.length ? (
                                        <p className="mt-2 pt-2 border-t border-slate-200 text-slate-600">
                                            Method: {wooOrder.shipping_lines.map((s: any) => s.method_title).join(', ')}
                                        </p>
                                    ) : null}
                                </>
                            ) : wooLoading ? (
                                <p className="text-slate-500">Loading…</p>
                            ) : (
                                '—'
                            )}
                        </div>
                    </section>

                    {/* Payment */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> Payment
                        </h3>
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm">
                            {wooOrder ? (
                                <p>
                                    {wooOrder.payment_method_title || wooOrder.payment_method || '—'}
                                    {wooOrder.total != null && (
                                        <span className="ml-2 font-semibold text-slate-900">Total: ${wooOrder.total}</span>
                                    )}
                                </p>
                            ) : wooLoading ? (
                                <p className="text-slate-500">Loading…</p>
                            ) : (
                                '—'
                            )}
                        </div>
                    </section>

                    {/* Customer note */}
                    {wooOrder?.customer_note && (
                        <section>
                            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4" /> Customer note
                            </h3>
                            <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 text-sm text-slate-700">
                                {wooOrder.customer_note}
                            </div>
                        </section>
                    )}

                    {/* Order Notes (admin/school) */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" /> Order notes
                        </h3>
                        {notesLoading ? (
                            <p className="text-slate-500 text-sm">Loading notes…</p>
                        ) : (
                            <div className="space-y-3">
                                {notes.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No notes yet. Add one below.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {notes.map((n) => (
                                            <div key={n.id} className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${n.author_role === 'admin' ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}`}>
                                                        {n.author_display || n.author_role}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">{format(new Date(n.created_at), 'd MMM yyyy, HH:mm')}</span>
                                                </div>
                                                <p className="text-slate-700 whitespace-pre-wrap">{n.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {role && (
                                    <div className="border border-slate-200 rounded-lg p-3 bg-white">
                                        <textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Add a note for this order…"
                                            rows={2}
                                            className="w-full text-sm border border-slate-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 resize-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleAddNote}
                                            disabled={!newNote.trim() || savingNote}
                                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {savingNote ? 'Saving…' : <><Send className="w-3.5 h-3.5" /> Add note</>}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Audit Log */}
                    <section>
                        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Audit log</h3>
                        <OrderTimeline events={events} />
                    </section>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
                    <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">Print label</button>
                </div>
            </div>
        </div>
    );
}
