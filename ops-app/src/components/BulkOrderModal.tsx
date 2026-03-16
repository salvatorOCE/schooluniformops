'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Mail, Sparkles, FileDown, School, Receipt, ExternalLink, Clock } from 'lucide-react';
import { useData } from '@/lib/data-provider';
import { format } from 'date-fns';
import { downloadBulkOrderInvoice } from '@/lib/generate-bulk-invoice-pdf';

interface BulkOrderModalProps {
    onClose: () => void;
    onSave: () => void;
    /** When set, modal opens in edit mode: load this order and save updates instead of creating. */
    orderId?: string | null;
    /** When set (school mode), school is locked and create uses API. New orders default to "Needs Ordering". */
    lockedSchoolId?: string;
    /** When true, school user: locked school, API create, status options for bulk flow. */
    schoolMode?: boolean;
}

interface SelectedItem {
    id: string; // unique row id
    productId: string;
    productName: string;
    sku: string;
    size: string;
    quantity: number;
    price: number;
}

export function BulkOrderModal({ onClose, onSave, orderId, lockedSchoolId, schoolMode }: BulkOrderModalProps) {
    const adapter = useData();
    const [saving, setSaving] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(!!orderId);

    const [schoolId, setSchoolId] = useState(lockedSchoolId || '');
    const [showCreateSchoolModal, setShowCreateSchoolModal] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolCode, setNewSchoolCode] = useState('');
    const [addingSchool, setAddingSchool] = useState(false);

    const [orderNumber, setOrderNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [studentName, setStudentName] = useState('');
    const [orderStatus, setOrderStatus] = useState('Needs Ordering');
    const [requestedDate, setRequestedDate] = useState(''); // Date order was asked for (YYYY-MM-DD)

    const [items, setItems] = useState<SelectedItem[]>([]);
    /** Delivered quantity per line (same index as items). Only used when status is Partial Completion. */
    const [partialDelivery, setPartialDelivery] = useState<number[]>([]);
    const [pastedEmail, setPastedEmail] = useState('');
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);

    const [schools, setSchools] = useState<{ id: string, name: string, code: string }[]>([]);
    const [products, setProducts] = useState<{ id: string, name: string, sku: string, price: number, sizes: string[] }[]>([]);
    const [xeroMeta, setXeroMeta] = useState<{ xero_invoice_id?: string; xero_invoice_number?: string } | null>(null);
    const [creatingXero, setCreatingXero] = useState(false);
    const [xeroError, setXeroError] = useState<string | null>(null);
    /** Status change log (when status was set to what). Loaded with order; updated after save. */
    const [statusChanges, setStatusChanges] = useState<{ status: string; at: string }[]>([]);

    useEffect(() => {
        if (lockedSchoolId) {
            setSchoolId(lockedSchoolId);
        }
    }, [lockedSchoolId]);

    // Fetch schools on mount (admin only)
    useEffect(() => {
        if (schoolMode) return;
        const loadSchools = async () => {
            try {
                const data = await adapter.getSchools();
                setSchools(data);
            } catch (error) {
                console.error('Failed to load schools', error);
            }
        };
        loadSchools();
    }, [adapter, schoolMode]);

    // Fetch products when school changes
    useEffect(() => {
        const loadProducts = async () => {
            if (!schoolId) {
                setProducts([]);
                return;
            }
            try {
                const data = await adapter.getProductsBySchool(schoolId);
                setProducts(data);
            } catch (error) {
                console.error('Failed to load products', error);
            }
        };
        loadProducts();
    }, [schoolId, adapter]);

    // Load order when editing
    useEffect(() => {
        if (!orderId) {
            setLoadingOrder(false);
            setXeroMeta(null);
            setXeroError(null);
            setStatusChanges([]);
            return;
        }
        let cancelled = false;
        setLoadingOrder(true);
        adapter.getOrderById(orderId).then((order) => {
            if (cancelled || !order) {
                setLoadingOrder(false);
                return;
            }
            setSchoolId(order.school_id || '');
            setOrderNumber(order.order_number || '');
            setCustomerName(order.parent_name || '');
            setStudentName(order.student_name || '');
            setOrderStatus(order.order_status || 'Processing');
            setRequestedDate(order.meta?.order_requested_at || '');
            const loadedItems = order.items.map((i) => ({
                id: i.id,
                productId: i.product_id ?? '',
                productName: i.product_name || '',
                sku: i.sku || '',
                size: i.size || '',
                quantity: Number.isFinite(i.quantity) ? i.quantity : 1,
                price: Number.isFinite(i.unit_price) ? i.unit_price! : 0
            }));
            setItems(loadedItems);
            setXeroMeta(order.meta && typeof order.meta === 'object' ? { xero_invoice_id: (order.meta as any).xero_invoice_id, xero_invoice_number: (order.meta as any).xero_invoice_number } : null);
            setStatusChanges(Array.isArray((order.meta as any)?.status_changes) ? (order.meta as any).status_changes : []);
            const pd = order.meta?.partial_delivery;
            setPartialDelivery(
                Array.from({ length: loadedItems.length }, (_, i) =>
                    Number.isFinite(pd?.[i]) ? Math.min(Math.max(0, pd![i]), loadedItems[i]?.quantity ?? 0) : 0
                )
            );
            setLoadingOrder(false);
        }).catch(() => setLoadingOrder(false));
        return () => { cancelled = true; };
    }, [orderId, adapter]);

    const addItem = () => {
        setItems([...items, {
            id: Date.now().toString(),
            productId: '',
            productName: '',
            sku: '',
            size: '',
            quantity: 1,
            price: 0
        }]);
        setPartialDelivery([...partialDelivery, 0]);
    };

    const updateItem = (id: string, updates: Partial<SelectedItem>) => {
        setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const removeItem = (id: string) => {
        const index = items.findIndex(item => item.id === id);
        setItems(items.filter(item => item.id !== id));
        if (index >= 0) setPartialDelivery(prev => prev.filter((_, i) => i !== index));
    };

    /** Match a parsed product name/sku to a school product; returns price, sku, productId when found. */
    const matchProduct = (productName: string, sku?: string): { id: string; name: string; sku: string; price: number } | null => {
        const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');
        const nameNorm = norm(productName);
        if (!nameNorm && !sku) return null;
        // Prefer exact SKU match (item code = what we charge / order from manufacturer)
        if (sku && products.length) {
            const bySku = products.find(p => norm(p.sku) === norm(sku));
            if (bySku) return { id: bySku.id, name: bySku.name, sku: bySku.sku, price: bySku.price };
        }
        // Else match by product name (flexible: contains or equals)
        for (const p of products) {
            const pNorm = norm(p.name);
            if (pNorm && (pNorm === nameNorm || pNorm.includes(nameNorm) || nameNorm.includes(pNorm)))
                return { id: p.id, name: p.name, sku: p.sku, price: p.price };
        }
        return null;
    };

    const handleParseEmail = async () => {
        const text = pastedEmail.trim();
        if (!text) return;
        // Require school so we can fill charge prices from that school's products (EDPS, FLAX, etc.)
        if (!schoolId) {
            setParseError('Please select a school first so we can fill in prices and item codes.');
            return;
        }
        setParsing(true);
        setParseError(null);
        try {
            const url = '/api/bulk-order/parse-email';
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });
            let data: { items?: unknown[]; error?: string; customerName?: string; departmentOrAttention?: string };
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            } else {
                const raw = await res.text();
                console.error('[Parse] Non-JSON response:', res.status, raw.slice(0, 200));
                setParseError(res.ok ? 'Invalid response from server' : `Server error (${res.status}). Check terminal where "npm run dev" is running.`);
                return;
            }
            if (!res.ok) {
                const errMsg = data.error || `Request failed (${res.status})`;
                console.error('[Parse] API error:', res.status, errMsg);
                setParseError(errMsg);
                return;
            }
            type ParsedItem = { productName?: string; size?: string; quantity?: number; sku?: string; price?: number };
            const rawItems = (data.items || []) as ParsedItem[];
            const parsed = rawItems.map((item, i) => {
                const productName = String(item.productName ?? '');
                const parsedSku = item.sku ? String(item.sku) : '';
                const matched = matchProduct(productName, parsedSku || undefined);
                return {
                    id: `parsed-${Date.now()}-${i}`,
                    productId: matched?.id ?? '',
                    productName: matched?.name ?? productName,
                    sku: matched?.sku ?? parsedSku,
                    size: String(item.size ?? ''),
                    quantity: Number(item.quantity) || 1,
                    price: matched?.price ?? (Number(item.price) || 0),
                };
            });
            setItems(parsed);
            setPartialDelivery(parsed.map(() => 0));
            if (data.customerName != null && String(data.customerName).trim()) setCustomerName(String(data.customerName).trim());
            if (data.departmentOrAttention != null && String(data.departmentOrAttention).trim()) setStudentName(String(data.departmentOrAttention).trim());
            setPastedEmail('');
        } catch (e) {
            const err = e instanceof Error ? e.message : 'Parse failed';
            console.error('[Parse] Exception:', e);
            setParseError(err);
        } finally {
            setParsing(false);
        }
    };

    const handleSave = async () => {
        if (!schoolId || items.length === 0) return;

        setSaving(true);
        try {
            const finalSchoolId = schoolId;
            const delivered = items.map((item, i) =>
                Math.min(Math.max(0, partialDelivery[i] ?? 0), Number.isFinite(item.quantity) ? item.quantity : 0)
            );
            const isPartialStatus = orderStatus === 'Partial Completion' || orderStatus === 'Partial Order Complete';
            const orderDetails = {
                orderNumber,
                customerName,
                studentName,
                status: orderStatus,
                requestedAt: requestedDate || undefined,
                partialDelivery: isPartialStatus ? delivered : []
            };

            if (orderId) {
                const updated = await adapter.updateBulkOrder(orderId, finalSchoolId, orderDetails, items);
                if (Array.isArray((updated.meta as any)?.status_changes)) setStatusChanges((updated.meta as any).status_changes);
            } else if (schoolMode) {
                const res = await fetch('/api/bulk-orders/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        orderNumber,
                        customerName,
                        studentName,
                        status: orderStatus,
                        requestedAt: requestedDate || undefined,
                        partialDelivery: isPartialStatus ? delivered : [],
                        items: items.map(i => ({
                            productId: i.productId,
                            productName: i.productName,
                            sku: i.sku,
                            size: i.size,
                            quantity: i.quantity,
                            price: i.price
                        }))
                    })
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || 'Failed to create order');
                }
            } else {
                await adapter.createBulkOrder(finalSchoolId, orderDetails, items);
            }
            onSave();
        } catch (error) {
            console.error('Failed to save bulk order:', error);
            alert('Failed to save bulk order. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const calculateTotal = () =>
        items.reduce(
            (sum, item) =>
                sum +
                (Number.isFinite(item.quantity) && Number.isFinite(item.price)
                    ? item.quantity * item.price
                    : 0),
            0
        );

    return (
        <div className="fixed inset-0 bg-slate-900/50 flex flex-col items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{orderId ? 'Edit Bulk Order' : 'Create Bulk Order'}</h2>
                        <p className="text-slate-500 text-sm mt-1">{orderId ? 'Change order details, items, or prices' : 'Record a manual offline order for a school'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto flex-1">
                    {loadingOrder ? (
                        <div className="flex items-center justify-center py-12 text-slate-500">Loading order...</div>
                    ) : (
                    <div className="space-y-6">
                        {/* Status — prominent at top so it's always visible */}
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-700 shrink-0">Status</label>
                            <select
                                className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium bg-white text-slate-900 min-w-[180px] disabled:bg-slate-50 disabled:cursor-not-allowed"
                                value={orderStatus}
                                onChange={(e) => setOrderStatus(e.target.value)}
                                disabled={schoolMode}
                                title={schoolMode ? 'Status is updated by admin' : undefined}
                            >
                                <option value="Needs Ordering">Needs Ordering</option>
                                <option value="Garments Ordered">Garments Ordered</option>
                                <option value="Processing">Processing</option>
                                <option value="In Production">In Production</option>
                                <option value="Partial Completion">Partial Completion</option>
                                <option value="Partial Order Complete">Partial Order Complete</option>
                                <option value="Completed">Completed</option>
                            </select>
                            {schoolMode && <span className="text-xs text-slate-500">(updated by admin)</span>}
                        </div>

                        {/* Status change history (when editing and we have log entries) */}
                        {orderId && statusChanges.length > 0 && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-white/80">
                                    <Clock className="w-4 h-4 text-slate-500" />
                                    <span className="text-sm font-medium text-slate-700">Status history</span>
                                </div>
                                <ul className="divide-y divide-slate-100 max-h-32 overflow-y-auto">
                                    {statusChanges.map((entry, i) => (
                                        <li key={i} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                                            <span className="font-medium text-slate-800">{entry.status}</span>
                                            <span className="text-slate-500 tabular-nums">
                                                {format(new Date(entry.at), 'd MMM yyyy, HH:mm')}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* School Selection — hidden when school mode */}
                        {!schoolMode && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-slate-700">School Details</label>
                                <button
                                    type="button"
                                    onClick={() => { setNewSchoolName(''); setNewSchoolCode(''); setShowCreateSchoolModal(true); }}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                    + Create New School
                                </button>
                            </div>
                            <select
                                className="w-full border border-slate-200 rounded-lg p-2.5 text-slate-700 bg-white"
                                value={schoolId}
                                onChange={(e) => setSchoolId(e.target.value)}
                            >
                                <option value="">-- Choose a school --</option>
                                {schools.map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                ))}
                            </select>
                        </div>
                        )}

                        {/* Order Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Order / PO Number (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Auto-generated if blank"
                                    className="w-full border-slate-200 rounded-lg p-2 text-sm"
                                    value={orderNumber}
                                    onChange={(e) => setOrderNumber(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Customer / Contact Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., School Admin"
                                    className="w-full border-slate-200 rounded-lg p-2 text-sm"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Department / Attention</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Uniform Shop"
                                    className="w-full border-slate-200 rounded-lg p-2 text-sm"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Date order was requested</label>
                                <input
                                    type="date"
                                    className="w-full border border-slate-200 rounded-lg p-2 text-sm"
                                    value={requestedDate}
                                    onChange={(e) => setRequestedDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Paste email / AI parse */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 mb-2">
                                <Mail className="w-4 h-4 text-slate-500" />
                                <label className="block text-sm font-medium text-slate-700">Paste email order</label>
                            </div>
                            <p className="text-xs text-slate-500 mb-2">Select the school above first so prices and item codes (e.g. EDPS, FLAX) are filled from that school&apos;s catalogue. Paste the order email and AI will fill line items and charge prices.</p>
                            <textarea
                                placeholder="Paste email or order text here..."
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm min-h-[100px] resize-y"
                                value={pastedEmail}
                                onChange={(e) => { setPastedEmail(e.target.value); setParseError(null); }}
                                disabled={parsing}
                            />
                            <div className="flex items-center gap-2 mt-2">
                                <button
                                    type="button"
                                    onClick={handleParseEmail}
                                    disabled={parsing || !pastedEmail.trim()}
                                    className="btn bg-slate-800 hover:bg-slate-900 text-white text-sm flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {parsing ? 'Parsing...' : 'Parse with AI'}
                                </button>
                                {parseError && <span className="text-sm text-red-600">{parseError}</span>}
                            </div>
                        </div>

                        {/* Order Items / Invoice list */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-5 h-5 text-emerald-600" />
                                    <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Order Items / Invoice List</h3>
                                </div>
                                <button
                                    onClick={addItem}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add line
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <div className="p-12 text-center">
                                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 text-slate-400 mb-4">
                                        <Receipt className="w-7 h-7" />
                                    </div>
                                    <p className="text-slate-600 font-medium mb-1">No items yet</p>
                                    <p className="text-slate-500 text-sm mb-4">Add garments to build your invoice list.</p>
                                    <button onClick={addItem} className="btn bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                                        <Plus className="w-4 h-4 inline mr-1.5" /> Add first item
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="text-left py-3 px-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Product</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">Item name</th>
                                                <th className="text-left py-3 px-4 font-semibold text-slate-600 uppercase tracking-wider text-xs">SKU</th>
                                                <th className="text-center py-3 px-3 font-semibold text-slate-600 uppercase tracking-wider text-xs w-20">Size</th>
                                                <th className="text-center py-3 px-3 font-semibold text-slate-600 uppercase tracking-wider text-xs w-20">Qty</th>
                                                <th className="text-right py-3 px-4 font-semibold text-slate-600 uppercase tracking-wider text-xs w-24">Unit price</th>
                                                {(orderStatus === 'Partial Completion' || orderStatus === 'Partial Order Complete') && (
                                                    <th className="text-center py-3 px-3 font-semibold text-slate-600 uppercase tracking-wider text-xs w-20">Sent</th>
                                                )}
                                                <th className="w-12 py-3 px-2" aria-label="Remove" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {items.map((item, index) => (
                                                <tr
                                                    key={item.id}
                                                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors even:bg-slate-50/30"
                                                >
                                                    <td className="py-2.5 px-4">
                                                        <select
                                                            className="w-full min-w-[120px] border border-slate-200 rounded-md text-sm py-1.5 px-2 bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                            value={item.productId}
                                                            onChange={(e) => {
                                                                const p = products.find(p => p.id === e.target.value);
                                                                updateItem(item.id, {
                                                                    productId: e.target.value,
                                                                    productName: p?.name || '',
                                                                    sku: p?.sku || '',
                                                                    price: p?.price || 0
                                                                });
                                                            }}
                                                        >
                                                            <option value="">Custom</option>
                                                            {products.map(p => (
                                                                <option key={p.id} value={p.id}>{p.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <input
                                                            type="text"
                                                            placeholder="Name"
                                                            className="w-full min-w-[140px] border border-slate-200 rounded-md text-sm py-1.5 px-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                            value={item.productName}
                                                            onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-4">
                                                        <input
                                                            type="text"
                                                            placeholder="SKU"
                                                            className="w-full min-w-[80px] border border-slate-200 rounded-md text-sm py-1.5 px-2 font-mono focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                            value={item.sku}
                                                            onChange={(e) => updateItem(item.id, { sku: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <input
                                                            type="text"
                                                            placeholder="—"
                                                            className="w-full max-w-[4rem] mx-auto border border-slate-200 rounded-md text-sm py-1.5 px-2 text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                            value={item.size}
                                                            onChange={(e) => updateItem(item.id, { size: e.target.value })}
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-3 text-center">
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            className="w-full max-w-[4rem] mx-auto border border-slate-200 rounded-md text-sm py-1.5 px-2 text-center focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                            value={Number.isFinite(item.quantity) ? item.quantity : 1}
                                                            onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                                                        />
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={0.01}
                                                            className="w-full max-w-[5rem] ml-auto border border-slate-200 rounded-md text-sm py-1.5 px-2 text-right tabular-nums focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                                            value={Number.isFinite(item.price) ? item.price : 0}
                                                            onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                                        />
                                                    </td>
                                                    {(orderStatus === 'Partial Completion' || orderStatus === 'Partial Order Complete') && (
                                                        <td className="py-2.5 px-3 text-center">
                                                            <input
                                                                type="number"
                                                                min={0}
                                                                max={Number.isFinite(item.quantity) ? item.quantity : 0}
                                                                className="w-full max-w-[4rem] mx-auto border border-amber-200 rounded-md text-sm py-1.5 px-2 text-center bg-amber-50/80 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                                                                value={Math.min(partialDelivery[index] ?? 0, item.quantity)}
                                                                onChange={(e) => {
                                                                    const v = parseInt(e.target.value, 10);
                                                                    if (!Number.isFinite(v)) return;
                                                                    const next = [...partialDelivery];
                                                                    while (next.length <= index) next.push(0);
                                                                    next[index] = Math.max(0, Math.min(v, item.quantity));
                                                                    setPartialDelivery(next);
                                                                }}
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="py-2.5 px-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(item.id)}
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                            aria-label="Remove line"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-100 border-t-2 border-slate-200">
                                                <td colSpan={5} className="py-3 px-4 text-right font-semibold text-slate-700">
                                                    Total
                                                </td>
                                                <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums">
                                                    ${calculateTotal().toFixed(2)}
                                                </td>
                                                {(orderStatus === 'Partial Completion' || orderStatus === 'Partial Order Complete') && <td />}
                                                <td className="py-3 px-2" />
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-slate-900">
                            Total: ${calculateTotal().toFixed(2)}
                        </span>
                        {items.length > 0 && !loadingOrder && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const schoolName = schools.find(s => s.id === schoolId)?.name ?? '—';
                                        const dateOrdered = requestedDate
                                            ? format(new Date(requestedDate), 'dd MMM yyyy')
                                            : format(new Date(), 'dd MMM yyyy');
                                        downloadBulkOrderInvoice(
                                            {
                                                orderNumber: orderNumber || 'Draft',
                                                dateOrdered,
                                                schoolName,
                                                customerName: customerName || '—',
                                                department: studentName || undefined,
                                                items: items.map(i => ({
                                                    productName: i.productName,
                                                    sku: i.sku,
                                                    size: i.size,
                                                    quantity: Number.isFinite(i.quantity) ? i.quantity : 0,
                                                    price: Number.isFinite(i.price) ? i.price : 0
                                                }))
                                            },
                                            orderNumber ? `Invoice-${orderNumber}` : undefined
                                        );
                                    }}
                                    className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-sm"
                                >
                                    <FileDown className="w-4 h-4" />
                                    Download invoice
                                </button>
                                {orderId && (
                                    xeroMeta?.xero_invoice_id ? (
                                        <a
                                            href={`https://go.xero.com/AccountsReceivable/View.aspx?InvoiceID=${xeroMeta.xero_invoice_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 text-sm"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            View in Xero {xeroMeta.xero_invoice_number && `(#${xeroMeta.xero_invoice_number})`}
                                        </a>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={creatingXero}
                                            onClick={async () => {
                                                if (!orderId) return;
                                                setXeroError(null);
                                                setCreatingXero(true);
                                                try {
                                                    const res = await fetch('/api/xero/create-invoice', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        credentials: 'same-origin',
                                                        body: JSON.stringify({ orderId }),
                                                    });
                                                    const data = await res.json().catch(() => ({}));
                                                    if (!res.ok) {
                                                        setXeroError(data.error || data.detail || `Request failed (${res.status})`);
                                                        return;
                                                    }
                                                    setXeroMeta({ xero_invoice_id: data.xeroInvoiceId, xero_invoice_number: data.xeroInvoiceNumber });
                                                    onSave();
                                                    if (data.url) window.open(data.url, '_blank');
                                                } catch (e) {
                                                    setXeroError(e instanceof Error ? e.message : 'Failed to create Xero invoice');
                                                } finally {
                                                    setCreatingXero(false);
                                                }
                                            }}
                                            className="btn bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 text-sm"
                                        >
                                            <Receipt className="w-4 h-4" />
                                            {creatingXero ? 'Creating…' : 'Create Xero Invoice'}
                                        </button>
                                    )
                                )}
                            </>
                        )}
                    </div>
                    {xeroError && (
                        <p className="text-sm text-red-600 mt-1 w-full">{xeroError}</p>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="btn bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="btn bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                            disabled={saving || loadingOrder || !schoolId || items.length === 0 || (schoolMode && !!orderId)}
                        >
                            {schoolMode && orderId ? 'View only' : saving ? (orderId ? 'Saving...' : 'Creating...') : (orderId ? 'Save changes' : 'Create Bulk Order')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Create New School modal (same pattern as digital stock) */}
            {showCreateSchoolModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                <School className="w-5 h-5 text-slate-500" />
                                Add School
                            </h3>
                            <button type="button" onClick={() => setShowCreateSchoolModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-md">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School Name</label>
                                <input
                                    type="text"
                                    value={newSchoolName}
                                    onChange={(e) => setNewSchoolName(e.target.value)}
                                    placeholder="e.g. Flaxmill Primary School"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">School Code</label>
                                <input
                                    type="text"
                                    value={newSchoolCode}
                                    onChange={(e) => setNewSchoolCode(e.target.value.toUpperCase())}
                                    placeholder="e.g. FLAXMILL"
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                                />
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                            <button type="button" onClick={() => setShowCreateSchoolModal(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">Cancel</button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (!newSchoolName.trim() || !newSchoolCode.trim()) return;
                                    setAddingSchool(true);
                                    try {
                                        const created = await adapter.createSchool(newSchoolName.trim(), newSchoolCode.trim().toUpperCase());
                                        const list = await adapter.getSchools();
                                        setSchools(list);
                                        setSchoolId(created.id);
                                        setShowCreateSchoolModal(false);
                                        setNewSchoolName('');
                                        setNewSchoolCode('');
                                    } catch (err) {
                                        console.error('Failed to add school', err);
                                    } finally {
                                        setAddingSchool(false);
                                    }
                                }}
                                disabled={addingSchool || !newSchoolName.trim() || !newSchoolCode.trim()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-[#002D2B] rounded-lg hover:bg-[#004440] disabled:opacity-50"
                            >
                                {addingSchool ? 'Adding...' : 'Add School'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
