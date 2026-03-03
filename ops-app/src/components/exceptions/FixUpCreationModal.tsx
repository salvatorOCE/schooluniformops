'use client';

import { useState } from 'react';
import { Order, FixUpType, FixUpRequest } from '@/lib/types';
import { useData } from '@/lib/data-provider';
import { EventLogger } from '@/lib/event-logger';
import { RefreshCw, Scissors, AlertTriangle, User, PackageX, CheckCircle, AlertCircle } from 'lucide-react';

interface FixUpCreationModalProps {
    order: Order;
    onClose: () => void;
    onSuccess: () => void;
}

const ISSUE_TYPES: { id: FixUpType; label: string; icon: any; color: string; bg: string }[] = [
    { id: 'SIZE_EXCHANGE', label: 'Size Exchange', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'PRINT_ERROR', label: 'Print Error', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'EMBROIDERY_ERROR', label: 'Embroidery Error', icon: Scissors, color: 'text-purple-600', bg: 'bg-purple-50' },
    { id: 'WRONG_PERSONALISATION', label: 'Wrong Name', icon: User, color: 'text-orange-600', bg: 'bg-orange-50' },
    { id: 'DAMAGED_ITEM', label: 'Damaged Item', icon: AlertCircle, color: 'text-red-700', bg: 'bg-red-100' },
    { id: 'MISSING_ITEM', label: 'Missing Item', icon: PackageX, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'OTHER', label: 'Other Issue', icon: AlertCircle, color: 'text-slate-600', bg: 'bg-slate-50' }
];

export function FixUpCreationModal({ order, onClose, onSuccess }: FixUpCreationModalProps) {
    const adapter = useData();
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
    const [issueType, setIssueType] = useState<FixUpType | null>(null);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Step 1: Select Items
    const toggleItem = (id: string) => {
        setSelectedItemIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Submit
    const handleSubmit = async () => {
        if (!issueType || selectedItemIds.length === 0) return;

        setIsSubmitting(true);
        const selectedItems = order.items.filter(i => selectedItemIds.includes(i.id));

        // Clone items for the fix-up (new IDs would be assigned in backend, here we mock)
        const fixUpItems = selectedItems.map(i => ({
            ...i,
            id: `fix-item-${Date.now()}-${Math.random()}`,
            // If it's a re-make, it needs embroidery again
            embroidery_status: i.requires_embroidery ? 'PENDING' : undefined
        }));

        try {
            await adapter.createFixUp({
                original_order_id: order.id,
                original_order_number: order.order_number,
                student_name: order.student_name || 'Unknown',
                parent_name: order.parent_name,
                school_name: order.school_name,
                type: issueType,
                status: 'OPEN',
                priority: 'HIGH', // Default to High for all fix-ups
                items: fixUpItems as any,
                notes: notes
            });
            await EventLogger.log(order.id, 'FIX_UP', 'CREATED', 'USER', {
                newState: {
                    status: 'OPEN',
                    type: issueType,
                    notes,
                },
                metadata: {
                    originalOrder: order.order_number,
                    schoolName: order.school_name,
                    schoolCode: order.school_code,
                    parentName: order.parent_name,
                    studentName: order.student_name,
                    source: 'RecoveryCenterCreate'
                }
            });
            onSuccess();
            onClose();
        } catch (e) {
            console.error(e);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create Fix-Up Request</h2>
                        <p className="text-sm text-slate-500">Order #{order.order_number} • {order.student_name}</p>
                    </div>
                    <div className="flex gap-2">
                        {[1, 2, 3].map(s => (
                            <div key={s} className={`w-2 h-2 rounded-full ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">

                    {/* STEP 1: SELECT ITEMS */}
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800">1. Select items requiring attention</h3>
                            <div className="grid gap-3">
                                {order.items.map(item => (
                                    <div
                                        key={item.id}
                                        onClick={() => toggleItem(item.id)}
                                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all
                                            ${selectedItemIds.includes(item.id)
                                                ? 'bg-indigo-50 border-indigo-200 shadow-sm ring-1 ring-indigo-200'
                                                : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <div className={`w-6 h-6 rounded border flex items-center justify-center transition-colors
                                            ${selectedItemIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                            {selectedItemIds.includes(item.id) && <CheckCircle className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-bold text-slate-900">{item.product_name}</div>
                                            <div className="text-sm text-slate-500">Size: <span className="font-mono text-slate-700">{item.size}</span> • SKU: {item.sku}</div>
                                        </div>
                                        <div className="font-mono text-sm font-bold bg-slate-100 px-2 py-1 rounded">
                                            Qty: {item.quantity}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: SELECT ISSUE */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h3 className="text-lg font-bold text-slate-800">2. What is the issue?</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {ISSUE_TYPES.map(type => {
                                    const Icon = type.icon;
                                    const isSelected = issueType === type.id;
                                    return (
                                        <button
                                            key={type.id}
                                            onClick={() => setIssueType(type.id)}
                                            className={`flex items-center gap-3 p-4 rounded-lg border text-left transition-all
                                                ${isSelected
                                                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg'
                                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                        >
                                            <div className={`p-2 rounded-full ${isSelected ? 'bg-white/20 text-white' : `${type.bg} ${type.color}`}`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-700'}`}>{type.label}</span>
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <label className="block text-sm font-bold text-slate-700 mb-2">Additional Notes / Instructions</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                    rows={3}
                                    placeholder="E.g. Parent returned size 10, needs size 12. Urgent."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CONFIRM */}
                    {step === 3 && (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 text-center py-4">
                            <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-10 h-10 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Confirm Priority Job</h3>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    This will create a <strong>High Priority</strong> fix-up request and inject it into the production queue immediately.
                                </p>
                            </div>

                            <div className="bg-slate-50 rounded-lg p-4 max-w-sm mx-auto text-left border border-slate-200">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Summary</div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Type:</span>
                                    <span className="font-bold text-slate-900">{ISSUE_TYPES.find(t => t.id === issueType)?.label}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-600">Items:</span>
                                    <span className="font-bold text-slate-900">{selectedItemIds.length} items selected</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Student:</span>
                                    <span className="font-bold text-slate-900">{order.student_name}</span>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                    <button
                        onClick={() => step === 1 ? onClose() : setStep(prev => (prev - 1) as any)}
                        className="text-slate-500 font-medium hover:text-slate-800"
                    >
                        {step === 1 ? 'Cancel' : 'Back'}
                    </button>

                    <button
                        disabled={step === 1 && selectedItemIds.length === 0 || step === 2 && !issueType || isSubmitting}
                        onClick={() => step === 3 ? handleSubmit() : setStep(prev => (prev + 1) as any)}
                        className={`px-6 py-2 rounded-lg font-bold text-white transition-all shadow-md active:scale-95 flex items-center gap-2
                            ${isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-indigo-600'}`}
                    >
                        {isSubmitting ? 'Processing...' : step === 3 ? 'Launch Recovery Plan 🚀' : 'Continue'}
                    </button>
                </div>
            </div>
        </div>
    );
}
