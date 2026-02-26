'use client';

import { useState } from 'react';
import { Order } from '@/lib/types';

interface PackingChecklistModalProps {
    order: Order;
    onClose: () => void;
    onConfirmPack: () => void;
}

export function PackingChecklistModal({ order, onClose, onConfirmPack }: PackingChecklistModalProps) {
    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
    const [nameVerified, setNameVerified] = useState(false);
    const [labelAttached, setLabelAttached] = useState(false);

    const allItemsChecked = order.items.every(item => checkedItems[item.id]);
    const canPack = allItemsChecked && nameVerified && labelAttached;

    const toggleItem = (itemId: string) => {
        setCheckedItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-lg" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b">
                    <h2 className="font-bold text-lg">Packing Checklist</h2>
                    <p className="text-sm text-gray-500">{order.order_number} • {order.student_name}</p>
                </div>

                <div className="p-6 space-y-6">
                    {/* Items Section */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">1. Verify Items</h3>
                        <div className="space-y-2">
                            {order.items.map(item => (
                                <label key={item.id} className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
                                    <input
                                        type="checkbox"
                                        className="checkbox checkbox-primary mr-3"
                                        checked={!!checkedItems[item.id]}
                                        onChange={() => toggleItem(item.id)}
                                    />
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800">
                                            {item.product_name}
                                            {item.nickname && <span className="ml-2 text-xs font-medium text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded border border-violet-200">{item.nickname}</span>}
                                        </div>
                                        <div className="text-sm text-slate-500">Size: {item.size} • Qty: {item.quantity}</div>
                                    </div>
                                    {item.requires_embroidery && <span className="badge badge-blue ml-2">Embroidery</span>}
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Final Checks */}
                    <div>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">2. Final Verification</h3>
                        <div className="space-y-2">
                            <label className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-secondary mr-3"
                                    checked={nameVerified}
                                    onChange={(e) => setNameVerified(e.target.checked)}
                                />
                                <span className="font-medium text-slate-700">Student Name Matches Label</span>
                            </label>
                            <label className="flex items-center p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-secondary mr-3"
                                    checked={labelAttached}
                                    onChange={(e) => setLabelAttached(e.target.checked)}
                                />
                                <span className="font-medium text-slate-700">Shipping / School Label Attached</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="btn btn-outline">Cancel</button>
                    <button
                        onClick={() => { if (canPack) { onConfirmPack(); onClose(); } }}
                        disabled={!canPack}
                        className="btn btn-primary w-32"
                    >
                        {canPack ? 'Mark Packed' : 'Verify All'}
                    </button>
                </div>
            </div>
        </div>
    );
}
