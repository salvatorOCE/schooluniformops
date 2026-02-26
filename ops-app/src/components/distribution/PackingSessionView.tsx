'use client';

import { Order, OrderItem } from '@/lib/types';
import { useState } from 'react';

interface PackingSessionViewProps {
    schoolName: string;
    schoolCode: string;
    orders: Order[];
    /** True when this session is the Senior section (so we don't show "Also in Senior" badge). */
    isSeniorSection?: boolean;
    onPack: (orderId: string) => void;
    onBack: () => void;
    onReportIssue: (order: Order) => void;
    onUpdateOrder?: (orderId: string, items: any[]) => Promise<void>;
    /** When user clicks "Finish pack out": packed orders in this session, for manifest PDF + saving to Order Tracking */
    onFinishPackOut?: (packedOrders: Order[], schoolCode: string, schoolName: string) => void;
}

export function PackingSessionView({ schoolName, schoolCode, orders, isSeniorSection, onPack, onBack, onReportIssue, onUpdateOrder, onFinishPackOut }: PackingSessionViewProps) {
    const [expandedIds, setExpandedIds] = useState<string[]>([]);
    const [checkedState, setCheckedState] = useState<Record<string, Record<string, boolean>>>({});
    const [completedOrders, setCompletedOrders] = useState<Order[]>([]);

    // Editing State
    const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
    const [editItems, setEditItems] = useState<any[]>([]); // Temp state for items being edited

    // Deduplicate orders to prevent key errors
    const uniqueOrders = orders.filter((order, index, self) =>
        index === self.findIndex((o) => o.id === order.id)
    );

    // Sort: Alphabetical by student name
    const toPackOrders = [...uniqueOrders].sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));

    const isCompleted = (orderId: string) => completedOrders.some(o => o.id === orderId);

    const toggleExpand = (orderId: string) => {
        if (editingOrderId === orderId) return; // Don't collapse if editing
        setExpandedIds(prev =>
            prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
        );
        // Initialize checks if new
        if (!checkedState[orderId]) {
            setCheckedState(prev => ({ ...prev, [orderId]: {} }));
        }
    };

    const startEditing = (order: Order) => {
        setEditingOrderId(order.id);
        setEditItems(JSON.parse(JSON.stringify(order.items))); // Deep copy
    };

    const cancelEditing = () => {
        setEditingOrderId(null);
        setEditItems([]);
    };

    const saveEditing = async (orderId: string) => {
        if (onUpdateOrder) {
            await onUpdateOrder(orderId, editItems);
            setEditingOrderId(null);
            // In a real app, we'd reload data or update local state logic here
            // For now assuming parent reloads or we might need to locally update 'orders' prop if not reloaded
        } else {
            console.warn("onUpdateOrder not provided");
            setEditingOrderId(null);
        }
    };

    const handleItemChange = (itemId: string, field: string, value: any) => {
        setEditItems(prev => prev.map(item =>
            item.id === itemId ? { ...item, [field]: value } : item
        ));
    };

    const toggleCheck = (orderId: string, checkId: string) => {
        setCheckedState(prev => ({
            ...prev,
            [orderId]: { ...prev[orderId], [checkId]: !prev[orderId]?.[checkId] }
        }));
    };

    const handleConfirmPack = (order: Order) => {
        // Optimistic update: Add to completed list immediately
        setCompletedOrders(prev => [order, ...prev]);
        // Trigger actual pack
        onPack(order.id);
        // Collapse
        setExpandedIds(prev => prev.filter(id => id !== order.id));
    };

    const isOrderReady = (order: Order) => {
        const checks = checkedState[order.id] || {};
        const allItems = order.items.every(item => checks[item.id]);
        const nameChecked = checks['name_check'];
        const labelChecked = checks['label_check'];
        return allItems && nameChecked && labelChecked;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-[calc(100vh-12rem)] flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 text-slate-500 transition-all font-medium text-sm"
                    >
                        ← Back to List
                    </button>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">{schoolName}</h2>
                        <div className="text-xs text-slate-500 font-medium">
                            Packing Session • {toPackOrders.length} Remaining
                        </div>
                    </div>
                </div>
            </div>

            {/* To Pack List */}
            <div className="flex-1 overflow-y-auto">
                <div className="divide-y divide-slate-100">
                    {toPackOrders.length === 0 && completedOrders.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            No orders to pack.
                        </div>
                    )}

                    {toPackOrders.map((order) => {
                        const isExpanded = expandedIds.includes(order.id);
                        const checks = checkedState[order.id] || {};
                        const completed = isCompleted(order.id);

                        return (
                            <div
                                key={order.id}
                                className={`transition-all ${isExpanded ? 'bg-blue-50/30' : 'hover:bg-slate-50'} ${completed ? 'opacity-60 bg-slate-50' : ''}`}
                            >
                                {/* Main Row */}
                                <div className="flex items-start p-4 gap-4 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                                    <div className="pt-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {order.student_name?.charAt(0)}
                                        </div>
                                    </div>

                                    <div className="flex-1 grid grid-cols-12 gap-4">
                                        <div className="col-span-4">
                                            <div className="font-bold text-slate-800">{order.student_name}</div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs text-slate-500">{order.order_number}</span>
                                                {!isSeniorSection && (order as Order & { _alsoHasSeniorItems?: boolean })._alsoHasSeniorItems && (
                                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 border border-teal-200" title="Senior items will be packed separately → Partial completion">
                                                        Also in Senior
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="col-span-6">
                                            {/* Summary of items if collapsed */}
                                            {!isExpanded && (
                                                <div className="text-sm text-slate-600 truncate">
                                                    {order.items.map(i => `${i.quantity}x ${i.product_name}`).join(', ')}
                                                </div>
                                            )}
                                        </div>

                                        <div className="col-span-2 text-right">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${order.delivery_type === 'HOME' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                                                order.delivery_type === 'SCHOOL' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {order.delivery_type}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-0.5">
                                        <button
                                            className={`btn btn-xs ${completed ? 'btn-ghost text-slate-400' : (isExpanded ? 'btn-ghost text-slate-400' : 'btn-primary')}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(order.id);
                                            }}
                                            disabled={false}
                                        >
                                            {completed ? 'Done' : (isExpanded ? '▼' : 'Pack')}
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Verification Area */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pl-16">
                                        <div className="bg-white border-2 border-slate-200 rounded-lg p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex justify-between items-center mb-2">
                                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verification Checklist</h4>
                                                {editingOrderId !== order.id ? (
                                                    <button onClick={(e) => { e.stopPropagation(); startEditing(order); }} className="text-xs text-blue-600 hover:underline">Edit Items</button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button onClick={cancelEditing} className="text-xs text-slate-500 hover:underline">Cancel</button>
                                                        <button onClick={() => saveEditing(order.id)} className="text-xs text-green-600 font-bold hover:underline">Save Changes</button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Production/Embroidery Notes */}
                                            {order.notes && (
                                                <div className="bg-yellow-50 border border-yellow-100 p-2 rounded text-xs text-yellow-800 mb-2 flex gap-2">
                                                    <span className="font-bold">📝 Note:</span> {order.notes}
                                                </div>
                                            )}

                                            {/* Item Checklist */}
                                            <div className="space-y-2">
                                                {(editingOrderId === order.id ? editItems : order.items).map((item) => {
                                                    const isDisabled = editingOrderId !== order.id && item.requires_embroidery && item.embroidery_status === 'PENDING';

                                                    return (
                                                        <label
                                                            key={item.id}
                                                            className={`flex items-center gap-3 p-3 rounded border transition-all ${editingOrderId === order.id
                                                                    ? 'bg-slate-50 border-slate-200 cursor-default'
                                                                    : isDisabled
                                                                        ? 'bg-slate-50 border-transparent opacity-60 cursor-not-allowed'
                                                                        : 'bg-white border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer shadow-sm active:scale-[0.98]'
                                                                }`}
                                                        >
                                                            {editingOrderId !== order.id && (
                                                                <input
                                                                    type="checkbox"
                                                                    className="checkbox checkbox-sm checkbox-primary rounded-md disabled:opacity-20 disabled:cursor-not-allowed"
                                                                    checked={!!checks[item.id]}
                                                                    disabled={isDisabled}
                                                                    onChange={() => toggleCheck(order.id, item.id)}
                                                                />
                                                            )}

                                                            {editingOrderId === order.id ? (
                                                                <div className="flex-1 grid grid-cols-3 gap-2">
                                                                    <div className="col-span-2">
                                                                        <label className="text-[10px] text-slate-400 font-bold block">Product</label>
                                                                        <input className="input input-xs input-bordered w-full" value={item.product_name} onChange={(e) => handleItemChange(item.id, 'product_name', e.target.value)} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-[10px] text-slate-400 font-bold block">Size</label>
                                                                        <input className="input input-xs input-bordered w-full" value={item.size} onChange={(e) => handleItemChange(item.id, 'size', e.target.value)} />
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <span className="font-mono bg-slate-100 px-1.5 rounded text-xs py-0.5 font-bold">{item.quantity}</span>
                                                                    <div className="flex-1">
                                                                        <div className={`text-sm font-medium ${item.requires_embroidery && item.embroidery_status === 'PENDING' ? 'text-slate-400' : 'text-slate-700'}`}>
                                                                            {item.product_name}
                                                                            {item.nickname && <span className="ml-1.5 text-xs font-medium text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded border border-violet-200">{item.nickname}</span>}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-400">{schoolName} • {item.sku}</div>
                                                                    </div>

                                                                    {item.requires_embroidery && item.embroidery_status === 'PENDING' ? (
                                                                        <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 rounded font-bold border border-slate-200">
                                                                            WAITING STOCK
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-xs bg-slate-100 text-slate-500 px-1.5 rounded font-bold">{item.size}</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </label>
                                                    );
                                                })}
                                            </div>

                                            {!completed && editingOrderId !== order.id && (
                                                <>
                                                    <div className="h-px bg-slate-100 my-2" />

                                                    {/* Final Checks */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <label className="flex items-center gap-3 p-3 rounded border border-slate-100 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all shadow-sm active:scale-[0.98]">
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox checkbox-sm checkbox-primary rounded-md"
                                                                checked={!!checks['name_check']}
                                                                onChange={() => toggleCheck(order.id, 'name_check')}
                                                            />
                                                            <span className="text-sm font-medium text-slate-700">Student Name Matches</span>
                                                        </label>
                                                        <label className="flex items-center gap-3 p-3 rounded border border-slate-100 bg-white hover:border-blue-300 hover:bg-blue-50/50 cursor-pointer transition-all shadow-sm active:scale-[0.98]">
                                                            <input
                                                                type="checkbox"
                                                                className="checkbox checkbox-sm checkbox-primary rounded-md"
                                                                checked={!!checks['label_check']}
                                                                onChange={() => toggleCheck(order.id, 'label_check')}
                                                            />
                                                            <span className="text-sm font-medium text-slate-700">Label Attached</span>
                                                        </label>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center justify-between pt-2">
                                                        <button
                                                            className="text-xs text-red-500 hover:text-red-700 hover:underline flex items-center gap-1"
                                                            onClick={() => onReportIssue(order)}
                                                        >
                                                            <span className="text-lg">⚠️</span> Report Issue
                                                        </button>
                                                        <button
                                                            className={`btn btn-sm px-8 transition-all duration-200 border-none text-white ${isOrderReady(order)
                                                                ? 'bg-green-600 hover:bg-green-700 shadow-md hover:scale-105'
                                                                : 'bg-slate-300 cursor-not-allowed'
                                                                }`}
                                                            disabled={!isOrderReady(order)}
                                                            onClick={() => handleConfirmPack(order)}
                                                        >
                                                            {isOrderReady(order) ? '✅ Complete Pack' : 'Complete Checklist'}
                                                        </button>
                                                    </div>
                                                </>
                                            )}

                                            {completed && (
                                                <div className="pt-2 flex items-center justify-between">
                                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded">
                                                        Packed in this session
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">
                                                        You can still expand to review the items.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Finish pack out: generate manifest PDF and save to Order Tracking */}
            {completedOrders.length > 0 && onFinishPackOut && (
                <div className="sticky bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-6 py-4 flex items-center justify-between rounded-b-xl shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
                    <span className="text-sm font-medium text-slate-600">
                        {completedOrders.length} order{completedOrders.length !== 1 ? 's' : ''} packed this session
                    </span>
                    <button
                        type="button"
                        onClick={() => onFinishPackOut(completedOrders, schoolCode, schoolName)}
                        className="btn btn-primary px-6 py-2.5 font-semibold"
                    >
                        Complete Pack out
                    </button>
                </div>
            )}
        </div>
    );
}
