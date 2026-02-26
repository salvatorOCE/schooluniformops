'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Mail, Sparkles, FileDown } from 'lucide-react';
import { useData } from '@/lib/data-provider';
import { format } from 'date-fns';
import { downloadBulkOrderInvoice } from '@/lib/generate-bulk-invoice-pdf';

interface BulkOrderModalProps {
    onClose: () => void;
    onSave: () => void;
    /** When set, modal opens in edit mode: load this order and save updates instead of creating. */
    orderId?: string | null;
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

export function BulkOrderModal({ onClose, onSave, orderId }: BulkOrderModalProps) {
    const adapter = useData();
    const [saving, setSaving] = useState(false);
    const [loadingOrder, setLoadingOrder] = useState(!!orderId);

    const [schoolId, setSchoolId] = useState('');
    const [isAddingSchool, setIsAddingSchool] = useState(false);
    const [newSchoolName, setNewSchoolName] = useState('');
    const [newSchoolCode, setNewSchoolCode] = useState('');

    const [orderNumber, setOrderNumber] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [studentName, setStudentName] = useState('');
    const [orderStatus, setOrderStatus] = useState('Processing');
    const [requestedDate, setRequestedDate] = useState(''); // Date order was asked for (YYYY-MM-DD)

    const [items, setItems] = useState<SelectedItem[]>([]);
    /** Delivered quantity per line (same index as items). Only used when status is Partial Completion. */
    const [partialDelivery, setPartialDelivery] = useState<number[]>([]);
    const [pastedEmail, setPastedEmail] = useState('');
    const [parsing, setParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);

    const [schools, setSchools] = useState<{ id: string, name: string, code: string }[]>([]);
    const [products, setProducts] = useState<{ id: string, name: string, sku: string, price: number, sizes: string[] }[]>([]);

    // Fetch schools on mount
    useEffect(() => {
        const loadSchools = async () => {
            try {
                const data = await adapter.getSchools();
                setSchools(data);
            } catch (error) {
                console.error('Failed to load schools', error);
            }
        };
        loadSchools();
    }, [adapter]);

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
                productId: '',
                productName: i.product_name || '',
                sku: i.sku || '',
                size: i.size || '',
                quantity: Number.isFinite(i.quantity) ? i.quantity : 1,
                price: Number.isFinite(i.unit_price) ? i.unit_price! : 0
            }));
            setItems(loadedItems);
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
        if (!schoolId && !isAddingSchool) {
            setParseError('Please select a school first so we can fill in prices and item codes.');
            return;
        }
        if (isAddingSchool) {
            setParseError('Save the new school first, then paste the email and parse. Or select an existing school to auto-fill prices.');
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
        if ((!schoolId && !isAddingSchool) || items.length === 0) return;
        if (isAddingSchool && (!newSchoolName || !newSchoolCode)) return;

        setSaving(true);
        try {
            let finalSchoolId = schoolId;
            if (isAddingSchool) {
                const newSchool = await adapter.createSchool(newSchoolName, newSchoolCode);
                finalSchoolId = newSchool.id;
            }

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
                await adapter.updateBulkOrder(orderId, finalSchoolId, orderDetails, items);
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">

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
                                className="border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-medium bg-white text-slate-900 min-w-[180px]"
                                value={orderStatus}
                                onChange={(e) => setOrderStatus(e.target.value)}
                            >
                                <option value="Processing">Processing</option>
                                <option value="In Production">In Production</option>
                                <option value="Partial Completion">Partial Completion</option>
                                <option value="Partial Order Complete">Partial Order Complete</option>
                                <option value="Completed">Completed</option>
                            </select>
                        </div>

                        {/* School Selection */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-slate-700">School Details</label>
                                <button
                                    type="button"
                                    onClick={() => setIsAddingSchool(!isAddingSchool)}
                                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                >
                                    {isAddingSchool ? 'Select Existing School' : '+ Create New School'}
                                </button>
                            </div>

                            {isAddingSchool ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="School Name (e.g., St John's Grammar)"
                                            className="w-full border-slate-200 rounded-lg p-2.5 text-sm"
                                            value={newSchoolName}
                                            onChange={(e) => setNewSchoolName(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <input
                                            type="text"
                                            placeholder="School Code (e.g., SJGS)"
                                            className="w-full border-slate-200 rounded-lg p-2.5 text-sm uppercase"
                                            value={newSchoolCode}
                                            onChange={(e) => setNewSchoolCode(e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <select
                                    className="w-full border-slate-200 rounded-lg p-2.5 text-slate-700 bg-white"
                                    value={schoolId}
                                    onChange={(e) => setSchoolId(e.target.value)}
                                >
                                    <option value="">-- Choose a school --</option>
                                    {schools.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                                    ))}
                                </select>
                            )}
                        </div>

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

                        {/* Order Items */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-slate-700">Order Items</label>
                                <button onClick={addItem} className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                                    <Plus className="w-4 h-4" /> Add Line Item
                                </button>
                            </div>

                            <div className="space-y-3">
                                {items.length === 0 ? (
                                    <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
                                        <p className="text-slate-500 mb-2">No items added yet</p>
                                        <button onClick={addItem} className="btn bg-white border shadow-sm">
                                            Add First Item
                                        </button>
                                    </div>
                                ) : (
                                    items.map((item, index) => (
                                        <div key={item.id} className="flex gap-2 items-end bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">Template</label>
                                                <select
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
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
                                            </div>
                                            <div className="flex-[1.5]">
                                                <label className="block text-xs text-slate-500 mb-1">Item Name</label>
                                                <input
                                                    type="text"
                                                    placeholder="Name"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
                                                    value={item.productName}
                                                    onChange={(e) => updateItem(item.id, { productName: e.target.value })}
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs text-slate-500 mb-1">SKU</label>
                                                <input
                                                    type="text"
                                                    placeholder="SKU"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
                                                    value={item.sku}
                                                    onChange={(e) => updateItem(item.id, { sku: e.target.value })}
                                                />
                                            </div>
                                            <div className="w-16">
                                                <label className="block text-xs text-slate-500 mb-1">Size</label>
                                                <input
                                                    type="text"
                                                    placeholder="Size"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5"
                                                    value={item.size}
                                                    onChange={(e) => updateItem(item.id, { size: e.target.value })}
                                                />
                                            </div>
                                            <div className="w-16">
                                                <label className="block text-xs text-slate-500 mb-1">Qty</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5 px-2"
                                                    value={Number.isFinite(item.quantity) ? item.quantity : 1}
                                                    onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value, 10) || 1 })}
                                                />
                                            </div>
                                            <div className="w-20">
                                                <label className="block text-xs text-slate-500 mb-1">Price</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    className="w-full border-slate-200 rounded text-sm py-1.5 px-2"
                                                    value={Number.isFinite(item.price) ? item.price : 0}
                                                    onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                                />
                                            </div>
                                            {(orderStatus === 'Partial Completion' || orderStatus === 'Partial Order Complete') && (
                                                <div className="w-20">
                                                    <label className="block text-xs text-slate-500 mb-1">Sent</label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={Number.isFinite(item.quantity) ? item.quantity : 0}
                                                        className="w-full border-slate-200 rounded text-sm py-1.5 px-2 bg-amber-50/80"
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
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeItem(item.id)}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
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
                        )}
                    </div>
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
                            disabled={saving || loadingOrder || (!schoolId && !isAddingSchool) || items.length === 0}
                        >
                            {saving ? (orderId ? 'Saving...' : 'Creating...') : (orderId ? 'Save changes' : 'Create Bulk Order')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
