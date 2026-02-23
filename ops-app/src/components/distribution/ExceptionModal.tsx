'use client';

import { useState } from 'react';
import { Order } from '@/lib/types';

interface ExceptionModalProps {
    order: Order;
    onClose: () => void;
    onReport: (type: string, note: string) => void;
}

export function ExceptionModal({ order, onClose, onReport }: ExceptionModalProps) {
    const [note, setNote] = useState('');
    const [type, setType] = useState<'MISSING_ITEM' | 'DAMAGE' | 'HOLD'>('MISSING_ITEM');

    const handleReport = () => {
        onReport(type, note);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b flex items-center justify-between bg-red-50">
                    <h2 className="font-bold text-lg text-red-700">Report Issue</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Issue Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                onClick={() => setType('MISSING_ITEM')}
                                className={`p-2 rounded border text-sm font-medium ${type === 'MISSING_ITEM' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                                Missing Item
                            </button>
                            <button
                                onClick={() => setType('DAMAGE')}
                                className={`p-2 rounded border text-sm font-medium ${type === 'DAMAGE' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                                Damage / Rework
                            </button>
                            <button
                                onClick={() => setType('HOLD')}
                                className={`p-2 rounded border text-sm font-medium ${type === 'HOLD' ? 'bg-amber-100 border-amber-500 text-amber-900' : 'bg-white border-slate-200 text-slate-600'}`}
                            >
                                Place on Hold
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                        <textarea
                            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500 outline-none"
                            rows={3}
                            placeholder="Describe the issue..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-outline">Cancel</button>
                    <button onClick={handleReport} className="btn bg-red-600 hover:bg-red-700 text-white border-none">
                        Report Exception
                    </button>
                </div>
            </div>
        </div>
    );
}
